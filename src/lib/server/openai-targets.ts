import { z } from 'zod';

import type { Sex, Targets } from '@/lib/nutrition/targets';
import type { OnboardingInput } from '@/lib/profile';

const DEFAULT_MODEL = 'gpt-5.4-mini';

const CALORIE_FLOOR: Record<Sex, number> = { female: 1200, male: 1500 };
const CALORIE_CEILING = 6000;
/** How far the macros' calories may drift from the calorie target before they're rescaled. */
const MACRO_TOLERANCE = 0.05;

const SYSTEM_PROMPT = `You are a registered dietitian. Given a person's profile, calculate their daily calorie and macronutrient targets.
- Estimate BMR with Mifflin-St Jeor, then TDEE from the activity level.
- Goal "lose": a moderate deficit of about 500 kcal. "maintain": TDEE. "gain": a moderate surplus of about 300 kcal.
- Never go below 1200 kcal for women or 1500 kcal for men.
- Split the macros to suit the diet preference: "keto" is very low carb and high fat, "high_protein" has extra protein, "vegetarian" and "vegan" are plant-based with more carbs, "none" is a balanced split.
- Protein and carbs have 4 kcal per gram and fat has 9 kcal per gram; the macros' calories must add up to the calorie target within 5%.
Return whole numbers only.`;

const RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'daily_targets',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['calories', 'protein_g', 'carbs_g', 'fat_g'],
      properties: {
        calories: { type: 'integer', description: 'Daily calorie target in kcal' },
        protein_g: { type: 'integer', description: 'Daily protein in grams' },
        carbs_g: { type: 'integer', description: 'Daily carbohydrates in grams' },
        fat_g: { type: 'integer', description: 'Daily fat in grams' },
      },
    },
  },
} as const;

const aiTargetsSchema = z.object({
  calories: z.number().positive(),
  protein_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
});

type AiTargets = z.infer<typeof aiTargetsSchema>;

/** Asks OpenAI for the user's daily targets. Server-only; throws on any failure. */
export async function generateTargets(input: OnboardingInput): Promise<Targets> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const person = {
    sex: input.sex,
    age: input.age,
    height_cm: Math.round(input.heightCm),
    weight_kg: Math.round(input.weightKg * 10) / 10,
    activity_level: input.activityLevel,
    goal: input.goal,
    diet_preference: input.diet,
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(person) },
      ],
      response_format: RESPONSE_FORMAT,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`OpenAI request failed (${res.status}): ${await res.text()}`);

  const body = await res.json();
  const message = body.choices?.[0]?.message;
  if (message?.refusal) throw new Error(`OpenAI refused: ${message.refusal}`);
  if (typeof message?.content !== 'string') throw new Error('OpenAI returned no content');

  return sanitizeTargets(aiTargetsSchema.parse(JSON.parse(message.content)), input.sex);
}

/**
 * Guards against an unsafe or inconsistent answer: clamps calories to a safe range and,
 * if the macros don't add up to the calorie target, rescales them proportionally.
 */
export function sanitizeTargets(ai: AiTargets, sex: Sex): Targets {
  const calories = Math.round(Math.min(Math.max(ai.calories, CALORIE_FLOOR[sex]), CALORIE_CEILING));

  const macroCalories = ai.protein_g * 4 + ai.carbs_g * 4 + ai.fat_g * 9;
  if (macroCalories <= 0) throw new Error('OpenAI returned empty macros');

  const scale = Math.abs(macroCalories - calories) / calories > MACRO_TOLERANCE ? calories / macroCalories : 1;
  return {
    calories,
    proteinG: Math.round(ai.protein_g * scale),
    carbsG: Math.round(ai.carbs_g * scale),
    fatG: Math.round(ai.fat_g * scale),
  };
}
