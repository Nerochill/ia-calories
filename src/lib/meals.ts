import { z } from 'zod';

/** Body of POST /api/meals: the photo the app just uploaded to ImageKit. */
export const createMealInputSchema = z.object({
  fileId: z.string().min(1).max(100),
});

export type CreateMealInput = z.infer<typeof createMealInputSchema>;

export type MealStatus = 'analyzing' | 'completed' | 'failed';

/** Why a meal failed. NOT_FOOD has its own message in the app. */
export type MealErrorCode = 'NOT_FOOD' | 'AI_ERROR';

/** Totals in kcal and grams. */
export type MealTotals = { calories: number; proteinG: number; carbsG: number; fatG: number };

export type MealItem = MealTotals & {
  name: string;
  quantity: number | null;
  unit: string | null;
  grams: number | null;
};

/** The meal as the API returns it to the app. */
export type Meal = MealTotals & {
  id: string;
  status: MealStatus;
  errorCode: MealErrorCode | null;
  name: string | null;
  /** ~800px wide, for large views. */
  imageUrl: string | null;
  /** 200×200 crop, for list cards. */
  thumbnailUrl: string | null;
  localDate: string;
  loggedAt: string;
};

/** Query of GET /api/meals: the local day to list. */
export const mealsQuerySchema = z.object({
  date: z.iso.date(),
});

/** Response of GET /api/meals. */
export type MealsResponse = { meals: Meal[] };

/** Response of POST /api/meals. Subscribe to the run with the token to follow the analysis. */
export type CreateMealResponse = { meal: Meal; runId: string; publicAccessToken: string };

/** Response of GET /api/uploads/imagekit-auth: signed params for one direct upload. */
export type ImageKitUploadAuth = {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  folder: string;
};

/** What the analyze-meal task reports through run metadata while it works. */
export type AnalyzeStep = 'analyzing' | 'saving';
