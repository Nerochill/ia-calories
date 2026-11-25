import { z } from 'zod';

import type { ActivityLevel, DietPreference, Goal, Sex, Targets } from '@/lib/nutrition/targets';
import type { UnitSystem } from '@/lib/units';

/** The profile as the API returns it to the app (metric values; age derived from birth date). */
export type Profile = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  diet: DietPreference;
  unitSystem: UnitSystem;
  language: 'en' | 'es';
  timezone: string;
  targets: Targets;
};

const unitSystem = z.enum(['metric', 'imperial']);
const language = z.enum(['en', 'es']);

/** Body of POST /api/onboarding. Ranges match the onboarding pickers (imperial included). */
export const onboardingInputSchema = z.object({
  sex: z.enum(['male', 'female']),
  age: z.number().int().min(13).max(100),
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(29).max(250),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  goal: z.enum(['lose', 'maintain', 'gain']),
  diet: z.enum(['none', 'vegetarian', 'vegan', 'keto', 'high_protein']),
  unitSystem,
  language,
  timezone: z.string().min(1).max(64),
});

export type OnboardingInput = z.infer<typeof onboardingInputSchema>;

/** Body of PATCH /api/profile: display preferences only, which don't affect the targets. */
export const profilePatchSchema = z
  .object({ unitSystem: unitSystem.optional(), language: language.optional() })
  .refine((patch) => patch.unitSystem || patch.language, 'Nothing to update');

export type ProfilePatch = z.infer<typeof profilePatchSchema>;
