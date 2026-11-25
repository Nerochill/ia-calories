import { and, desc, eq, ne, sql } from 'drizzle-orm';

import { mealItems, meals, profiles, users, type Db, type Meal as MealRow } from '@/db';
import type { Meal, MealErrorCode } from '@/lib/meals';
import { DAILY_SCAN_LIMIT } from '@/lib/scans';
import type { MealAnalysis } from '@/lib/server/openai-meal';

import { imageUrl } from './imagekit';

/** Width of the photo the app shows large (meal result, detail). */
const DISPLAY_WIDTH = 800;
/** Square thumbnail for meal cards: ~3x the 64pt card image, for sharp high-density screens. */
const THUMBNAIL_SIZE = 200;

const round1 = (n: number) => Math.round(n * 10) / 10;

export function toMeal(row: MealRow): Meal {
  return {
    id: row.id,
    status: row.status,
    errorCode: (row.errorCode as MealErrorCode | null) ?? null,
    name: row.name,
    imageUrl: row.imagePath ? imageUrl(row.imagePath, { width: DISPLAY_WIDTH }) : null,
    thumbnailUrl: row.imagePath
      ? imageUrl(row.imagePath, { width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE })
      : null,
    localDate: row.localDate,
    loggedAt: row.loggedAt.toISOString(),
    calories: row.calories,
    proteinG: row.proteinG,
    carbsG: row.carbsG,
    fatG: row.fatG,
  };
}

/** YYYY-MM-DD for `date` in an IANA timezone, falling back to UTC for an unknown zone. */
function localDateIn(timezone: string, date = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** The user's id and timezone, or null if they haven't finished onboarding. */
export async function findMealOwner(db: Db, clerkUserId: string) {
  const [row] = await db
    .select({ id: users.id, timezone: profiles.timezone })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.clerkUserId, clerkUserId));
  return row ?? null;
}

/**
 * Inserts a meal in the `analyzing` state for today (in the user's timezone), unless they've
 * hit the daily scan cap. A per-user advisory lock keeps two scans at once from both slipping
 * under the cap.
 */
export async function createMeal(
  db: Db,
  owner: { id: string; timezone: string },
  photo: { fileId: string; filePath: string }
): Promise<{ meal: MealRow } | { error: 'DAILY_LIMIT' }> {
  const localDate = localDateIn(owner.timezone);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${owner.id}))`);

    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(meals)
      .where(and(eq(meals.userId, owner.id), eq(meals.localDate, localDate), ne(meals.status, 'failed')));
    if (count >= DAILY_SCAN_LIMIT) return { error: 'DAILY_LIMIT' as const };

    const [meal] = await tx
      .insert(meals)
      .values({ userId: owner.id, localDate, imagekitFileId: photo.fileId, imagePath: photo.filePath })
      .returning();
    return { meal };
  });
}

/** The user's meals logged on `localDate` (YYYY-MM-DD in their timezone), newest first. */
export async function listMeals(db: Db, clerkUserId: string, localDate: string): Promise<Meal[]> {
  const rows = await db
    .select({ meal: meals })
    .from(meals)
    .innerJoin(users, eq(users.id, meals.userId))
    .where(and(eq(users.clerkUserId, clerkUserId), eq(meals.localDate, localDate)))
    .orderBy(desc(meals.loggedAt));
  return rows.map((row) => toMeal(row.meal));
}

export async function setMealRunId(db: Db, mealId: string, runId: string) {
  await db.update(meals).set({ triggerRunId: runId }).where(eq(meals.id, mealId));
}

/** What the analyze-meal task needs: the photo and the language to name the food in. */
export async function findMealForAnalysis(db: Db, mealId: string) {
  const [row] = await db
    .select({ status: meals.status, imagePath: meals.imagePath, locale: profiles.locale })
    .from(meals)
    .innerJoin(profiles, eq(profiles.userId, meals.userId))
    .where(eq(meals.id, mealId));
  return row ?? null;
}

/**
 * Replaces the meal's items with the AI's, caches the totals and marks it completed.
 * Safe to run again on a retry.
 */
export async function saveAnalysis(db: Db, mealId: string, analysis: MealAnalysis): Promise<Meal> {
  const totals = {
    calories: round1(analysis.items.reduce((sum, item) => sum + item.calories, 0)),
    proteinG: round1(analysis.items.reduce((sum, item) => sum + item.protein_g, 0)),
    carbsG: round1(analysis.items.reduce((sum, item) => sum + item.carbs_g, 0)),
    fatG: round1(analysis.items.reduce((sum, item) => sum + item.fat_g, 0)),
  };

  return db.transaction(async (tx) => {
    await tx.delete(mealItems).where(eq(mealItems.mealId, mealId));
    if (analysis.items.length > 0) {
      await tx.insert(mealItems).values(
        analysis.items.map((item, position) => ({
          mealId,
          position,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          grams: item.grams,
          calories: round1(item.calories),
          proteinG: round1(item.protein_g),
          carbsG: round1(item.carbs_g),
          fatG: round1(item.fat_g),
          confidence: item.confidence,
          source: 'ai' as const,
        }))
      );
    }

    const { model, ...raw } = analysis;
    const [row] = await tx
      .update(meals)
      .set({ status: 'completed', errorCode: null, name: analysis.name, aiModel: model, aiRaw: raw, ...totals })
      .where(eq(meals.id, mealId))
      .returning();
    return toMeal(row);
  });
}

/** Marks a meal failed, unless it already finished (so a late failure can't undo a result). */
export async function failMeal(db: Db, mealId: string, errorCode: MealErrorCode) {
  await db
    .update(meals)
    .set({ status: 'failed', errorCode })
    .where(and(eq(meals.id, mealId), eq(meals.status, 'analyzing')));
}
