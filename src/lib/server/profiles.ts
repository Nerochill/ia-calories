import { eq } from 'drizzle-orm';

import { profiles, users, type Db, type Profile as ProfileRow } from '@/db';
import type { Targets } from '@/lib/nutrition/targets';
import type { OnboardingInput, Profile, ProfilePatch } from '@/lib/profile';

/** We ask for an age, but store a birth date so the age stays right over time. */
function birthDateFromAge(age: number, today = new Date()) {
  const date = new Date(Date.UTC(today.getUTCFullYear() - age, today.getUTCMonth(), today.getUTCDate()));
  return date.toISOString().slice(0, 10);
}

function ageFromBirthDate(birthDate: string, today = new Date()) {
  const [year, month, day] = birthDate.split('-').map(Number);
  const hadBirthday =
    today.getUTCMonth() + 1 > month || (today.getUTCMonth() + 1 === month && today.getUTCDate() >= day);
  return today.getUTCFullYear() - year - (hadBirthday ? 0 : 1);
}

export function toProfile(row: ProfileRow): Profile {
  return {
    sex: row.sex,
    age: ageFromBirthDate(row.birthDate),
    heightCm: row.heightCm,
    weightKg: row.weightKg,
    activityLevel: row.activityLevel,
    goal: row.goal,
    diet: row.dietPreference,
    unitSystem: row.unitSystem,
    language: row.locale,
    timezone: row.timezone,
    targets: { calories: row.calorieTarget, proteinG: row.proteinG, carbsG: row.carbsG, fatG: row.fatG },
  };
}

export async function findProfile(db: Db, clerkUserId: string): Promise<Profile | null> {
  const [row] = await db
    .select({ profile: profiles })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(eq(users.clerkUserId, clerkUserId));
  return row ? toProfile(row.profile) : null;
}

/**
 * Upserts the user (the Clerk webhook may not have created it yet) and their profile.
 * Re-running onboarding replaces the previous answers and targets.
 */
export async function saveOnboarding(
  db: Db,
  clerkUserId: string,
  input: OnboardingInput,
  targets: Targets
): Promise<Profile> {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ clerkUserId })
      .onConflictDoUpdate({ target: users.clerkUserId, set: { updatedAt: new Date() } })
      .returning({ id: users.id });

    const values = {
      sex: input.sex,
      birthDate: birthDateFromAge(input.age),
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      activityLevel: input.activityLevel,
      goal: input.goal,
      dietPreference: input.diet,
      unitSystem: input.unitSystem,
      locale: input.language,
      timezone: input.timezone,
      calorieTarget: targets.calories,
      proteinG: targets.proteinG,
      carbsG: targets.carbsG,
      fatG: targets.fatG,
      targetsOverridden: false,
    };

    const [row] = await tx
      .insert(profiles)
      .values({ userId: user.id, ...values })
      .onConflictDoUpdate({ target: profiles.userId, set: values })
      .returning();
    return toProfile(row);
  });
}

export async function updatePreferences(
  db: Db,
  clerkUserId: string,
  patch: ProfilePatch
): Promise<Profile | null> {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.clerkUserId, clerkUserId));
  if (!user) return null;

  const [row] = await db
    .update(profiles)
    .set({ unitSystem: patch.unitSystem, locale: patch.language })
    .where(eq(profiles.userId, user.id))
    .returning();
  return row ? toProfile(row) : null;
}
