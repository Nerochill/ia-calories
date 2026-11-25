import { AbortTaskRunError, logger, metadata, schemaTask } from '@trigger.dev/sdk';
import { z } from 'zod';

import { withDb } from '@/db';
import type { AnalyzeStep, MealItem } from '@/lib/meals';
import { fittedImageUrl } from '@/lib/server/imagekit';
import { failMeal, findMealForAnalysis, saveAnalysis } from '@/lib/server/meals';
import { analyzeMealPhoto } from '@/lib/server/openai-meal';

/** Longest side of the photo sent to the model: enough detail to recognize food, small enough to be quick. */
const AI_IMAGE_MAX_SIDE = 1024;

const setStep = (step: AnalyzeStep) => metadata.set('step', step);

/**
 * Identifies the food in a meal photo with OpenAI and saves the items and totals.
 * The app follows progress live through the run's `step` metadata, then reads the output.
 * A photo with no food fails right away (NOT_FOOD, no retries); anything else retries and,
 * once retries run out, marks the meal AI_ERROR.
 */
export const analyzeMeal = schemaTask({
  id: 'analyze-meal',
  schema: z.object({ mealId: z.uuid() }),
  retry: { maxAttempts: 3 },
  run: async ({ mealId }) => {
    const meal = await withDb((db) => findMealForAnalysis(db, mealId));
    if (!meal) throw new AbortTaskRunError(`Meal ${mealId} not found`);
    if (!meal.imagePath) throw new AbortTaskRunError(`Meal ${mealId} has no photo`);

    setStep('analyzing');
    const analysis = await analyzeMealPhoto(fittedImageUrl(meal.imagePath, AI_IMAGE_MAX_SIDE), meal.locale);
    logger.info('Meal analyzed', { mealId, isFood: analysis.is_food, items: analysis.items.length });

    if (!analysis.is_food || analysis.items.length === 0) {
      await withDb((db) => failMeal(db, mealId, 'NOT_FOOD'));
      metadata.set('errorCode', 'NOT_FOOD');
      throw new AbortTaskRunError('No food detected in the photo');
    }

    setStep('saving');
    const saved = await withDb((db) => saveAnalysis(db, mealId, analysis));
    const items: MealItem[] = analysis.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      grams: item.grams,
      calories: item.calories,
      proteinG: item.protein_g,
      carbsG: item.carbs_g,
      fatG: item.fat_g,
    }));
    return { meal: saved, items };
  },
  onFailure: async ({ payload }) => {
    // NOT_FOOD is already recorded; failMeal only touches meals still analyzing.
    await withDb((db) => failMeal(db, payload.mealId, 'AI_ERROR'));
  },
});
