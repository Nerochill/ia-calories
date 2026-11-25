export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';
export type DietPreference = 'none' | 'vegetarian' | 'vegan' | 'keto' | 'high_protein';

export type TargetsInput = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  diet: DietPreference;
};

export type Targets = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_ADJUSTMENT: Record<Goal, number> = { lose: -500, maintain: 0, gain: 300 };

const CALORIE_FLOOR: Record<Sex, number> = { female: 1200, male: 1500 };

// Share of calories from [protein, carbs, fat].
const MACRO_SPLIT: Record<DietPreference, [number, number, number]> = {
  none: [0.3, 0.4, 0.3],
  high_protein: [0.4, 0.3, 0.3],
  keto: [0.25, 0.05, 0.7],
  vegetarian: [0.25, 0.5, 0.25],
  vegan: [0.25, 0.5, 0.25],
};

/** Daily targets: Mifflin-St Jeor BMR × activity factor, adjusted for the goal. */
export function calculateTargets(input: TargetsInput): Targets {
  const { sex, age, heightCm, weightKg, activityLevel, goal, diet } = input;

  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
  const tdee = bmr * ACTIVITY_FACTOR[activityLevel];
  const calories = Math.round(Math.max(tdee + GOAL_ADJUSTMENT[goal], CALORIE_FLOOR[sex]));

  const [protein, carbs, fat] = MACRO_SPLIT[diet];
  return {
    calories,
    proteinG: Math.round((calories * protein) / 4),
    carbsG: Math.round((calories * carbs) / 4),
    fatG: Math.round((calories * fat) / 9),
  };
}
