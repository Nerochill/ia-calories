import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// Enum values mirror the types in src/lib/nutrition/targets.ts and src/lib/units.ts.
export const sexEnum = pgEnum('sex', ['male', 'female']);
export const activityLevelEnum = pgEnum('activity_level', [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
]);
export const goalEnum = pgEnum('goal', ['lose', 'maintain', 'gain']);
export const dietPreferenceEnum = pgEnum('diet_preference', [
  'none',
  'vegetarian',
  'vegan',
  'keto',
  'high_protein',
]);
export const unitSystemEnum = pgEnum('unit_system', ['metric', 'imperial']);
export const localeEnum = pgEnum('locale', ['en', 'es']);
export const mealStatusEnum = pgEnum('meal_status', ['analyzing', 'completed', 'failed']);
export const mealItemSourceEnum = pgEnum('meal_item_source', ['ai', 'user']);

const createdAt = timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp('updated_at', { withTimezone: true })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  email: text('email'),
  createdAt,
  updatedAt,
});

export const profiles = pgTable('profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  sex: sexEnum('sex').notNull(),
  birthDate: date('birth_date').notNull(),
  heightCm: real('height_cm').notNull(),
  weightKg: real('weight_kg').notNull(),
  activityLevel: activityLevelEnum('activity_level').notNull(),
  goal: goalEnum('goal').notNull(),
  dietPreference: dietPreferenceEnum('diet_preference').notNull().default('none'),
  unitSystem: unitSystemEnum('unit_system').notNull().default('metric'),
  locale: localeEnum('locale').notNull().default('en'),
  timezone: text('timezone').notNull(),
  calorieTarget: integer('calorie_target').notNull(),
  proteinG: integer('protein_g').notNull(),
  carbsG: integer('carbs_g').notNull(),
  fatG: integer('fat_g').notNull(),
  targetsOverridden: boolean('targets_overridden').notNull().default(false),
  updatedAt,
});

export const meals = pgTable(
  'meals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: mealStatusEnum('status').notNull().default('analyzing'),
    // NOT_FOOD, AI_ERROR, …
    errorCode: text('error_code'),
    name: text('name'),
    imagekitFileId: text('imagekit_file_id'),
    imagePath: text('image_path'),
    // Date in the user's timezone; drives the dashboard and the daily scan cap.
    localDate: date('local_date').notNull(),
    loggedAt: timestamp('logged_at', { withTimezone: true }).notNull().defaultNow(),
    triggerRunId: text('trigger_run_id'),
    // Cached totals, recalculated on the server from meal_items.
    calories: real('calories').notNull().default(0),
    proteinG: real('protein_g').notNull().default(0),
    carbsG: real('carbs_g').notNull().default(0),
    fatG: real('fat_g').notNull().default(0),
    aiModel: text('ai_model'),
    aiRaw: jsonb('ai_raw'),
    createdAt,
    updatedAt,
  },
  (t) => [index('meals_user_id_local_date_idx').on(t.userId, t.localDate)]
);

export const mealItems = pgTable(
  'meal_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mealId: uuid('meal_id')
      .notNull()
      .references(() => meals.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    name: text('name').notNull(),
    quantity: real('quantity'),
    unit: text('unit'),
    grams: real('grams'),
    calories: real('calories').notNull().default(0),
    proteinG: real('protein_g').notNull().default(0),
    carbsG: real('carbs_g').notNull().default(0),
    fatG: real('fat_g').notNull().default(0),
    confidence: real('confidence'),
    source: mealItemSourceEnum('source').notNull().default('ai'),
  },
  (t) => [
    index('meal_items_meal_id_idx').on(t.mealId),
    check('meal_items_confidence_range', sql`${t.confidence} between 0 and 1`),
  ]
);

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles),
  meals: many(meals),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));

export const mealsRelations = relations(meals, ({ one, many }) => ({
  user: one(users, { fields: [meals.userId], references: [users.id] }),
  items: many(mealItems),
}));

export const mealItemsRelations = relations(mealItems, ({ one }) => ({
  meal: one(meals, { fields: [mealItems.mealId], references: [meals.id] }),
}));

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Meal = typeof meals.$inferSelect;
export type MealItem = typeof mealItems.$inferSelect;
