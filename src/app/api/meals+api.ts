import { tasks } from '@trigger.dev/sdk';

import { withDb } from '@/db';
import { createMealInputSchema, mealsQuerySchema, type CreateMealResponse, type MealsResponse } from '@/lib/meals';
import { withAuth } from '@/lib/server/auth';
import { getFilePath, mealFolder } from '@/lib/server/imagekit';
import { createMeal, failMeal, findMealOwner, listMeals, setMealRunId, toMeal } from '@/lib/server/meals';
import type { analyzeMeal } from '@/trigger/analyze-meal';

/** The signed-in user's meals for one local day: `GET /api/meals?date=YYYY-MM-DD`. */
export const GET = withAuth(async (request, clerkUserId) => {
  const parsed = mealsQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) {
    return Response.json({ error: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });
  }

  const meals = await withDb((db) => listMeals(db, clerkUserId, parsed.data.date));
  const body: MealsResponse = { meals };
  return Response.json(body);
});

/**
 * Logs a meal from a photo the app uploaded to ImageKit: saves it as `analyzing` and starts
 * the analyze-meal task. The response carries a token that can only read this run, so the app
 * can follow the analysis live.
 */
export const POST = withAuth(async (request, clerkUserId) => {
  const parsed = createMealInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });
  }
  const { fileId } = parsed.data;

  const owner = await withDb((db) => findMealOwner(db, clerkUserId));
  if (!owner) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });

  // The upload signature doesn't pin the folder, so check the photo really is this user's.
  const filePath = await getFilePath(fileId);
  if (!filePath?.startsWith(`${mealFolder(owner.id)}/`)) {
    return Response.json({ error: 'INVALID_PHOTO' }, { status: 400 });
  }

  const created = await withDb((db) => createMeal(db, owner, { fileId, filePath }));
  if ('error' in created) return Response.json({ error: created.error }, { status: 429 });
  const { meal } = created;

  let handle;
  try {
    handle = await tasks.trigger<typeof analyzeMeal>(
      'analyze-meal',
      { mealId: meal.id },
      { idempotencyKey: `analyze-meal:${meal.id}`, tags: [`meal:${meal.id}`] }
    );
  } catch (err) {
    console.error('[api] POST /api/meals triggering analyze-meal failed:', err);
    await withDb((db) => failMeal(db, meal.id, 'AI_ERROR'));
    return Response.json({ error: 'AI_ERROR' }, { status: 502 });
  }

  await withDb((db) => setMealRunId(db, meal.id, handle.id));
  const body: CreateMealResponse = {
    meal: toMeal(meal),
    runId: handle.id,
    publicAccessToken: handle.publicAccessToken,
  };
  return Response.json(body, { status: 201 });
});
