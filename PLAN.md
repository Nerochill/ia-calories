AI Calorie Tracker (Cal AI–style): Spec & v1 Plan
Context
This is a new mobile app built from an empty folder, with no project initialized yet. Users photograph a meal, AI estimates calories and macros, and the app tracks the result against personalized daily targets set during onboarding. This document records every decision from the alignment interview. Once approved, it is written to PLAN.md in the project root, and the Expo project is not scaffolded yet.

1. Spec summary
Product & users
Problem: manual calorie logging is tedious. A photo should be enough.
User: individuals who want to lose, maintain or gain weight on iOS and Android, in English and Spanish.
Must do well: turn a photo into an editable, reasonably accurate list of food items and macros in a few seconds, with targets that feel personal.
v1 scope
In:

Onboarding, then auth (Clerk with Google and Apple).
Personalized targets.
Scanning from the camera or photo library.
AI analysis.
A daily dashboard and history.
Meal and item editing.
A profile screen to edit info, units, language and targets.
Account deletion.
English and Spanish.
A free tier with a cap of 15 successful scans per day.
Out (v2+):

Paywall and billing.
Weight logging and charts.
Push reminders.
Streaks.
Text or manual meal logging.
Barcode scanning.
Water tracking.
Target weight and pace.
A web app.
Product analytics beyond Sentry.
Core flows
First launch: a welcome screen with Get started and I already have an account.
Onboarding (answers kept in a persisted local store):
sex
birth date / age
height
weight
activity level
goal (lose, maintain or gain)
diet preference (none, vegetarian, vegan, keto, high-protein)
unit system (defaults from the device locale)
language
Plan reveal (the "aha" moment): daily calories, protein, carbs and fat, calculated on the device with the shared formula.
Auth: Clerk with Apple (iOS) or Google (both platforms). The app then calls POST /api/onboarding, which upserts the user and profile, and the local store is cleared.
Returning user: sign in. If a profile exists the user goes to the dashboard, otherwise into onboarding.
Dashboard:
a week strip date selector
a calories-remaining ring and protein, carbs and fat bars
the selected day's meals
a floating camera button
Scan:
The user takes a photo or picks one from the library.
The image is compressed on the device to about 1024px JPEG.
The app gets signed upload params from GET /api/uploads/imagekit-auth and uploads directly to ImageKit.
POST /api/meals checks the cap, inserts the meal with status analyzing, triggers the task, and returns {meal, runId, publicAccessToken}.
The meal card appears immediately as "Analyzing…" and fills in live through useRealtimeRun.
Meal detail: the photo, a name, and items (name, quantity, grams, kcal, P/C/F). The user can edit, add or delete items and delete the meal. Totals are recalculated on the server.
Failed meal: a card with Retry and Delete. "No food detected" gets its own message.
Profile:
edit body stats, goal, diet, units and language, which recalculates targets unless they were overridden
override targets manually
sign out
delete account
Targets formula (deterministic, shared by client and server)
BMR: Mifflin-St Jeor, using sex, age, height in cm and weight in kg.
TDEE: BMR × activity factor:
sedentary 1.2
light 1.375
moderate 1.55
active 1.725
very active 1.9
Goal adjustment: lose −500 kcal, maintain 0, gain +300 kcal. Calories never go below 1200 (female) or 1500 (male).
Macro split by diet preference:
default: 30/40/30 (protein/carbs/fat)
high-protein: 40/30/30
keto: 25/5/70
vegetarian and vegan: 25/50/25
Grams are calculated at 4 kcal per gram for protein and carbs and 9 kcal per gram for fat.
The code lives in src/lib/nutrition/targets.ts as a pure function with unit tests.
Data model (Neon Postgres via Drizzle; metric storage)
users
id (uuid, primary key)
clerk_user_id (unique, not null)
email
created_at, updated_at
profiles (1:1 with users, cascade delete)
user_id (primary key and foreign key)
sex (enum)
birth_date
height_cm, weight_kg
activity_level (enum)
goal (enum)
diet_preference (enum)
unit_system (enum: metric/imperial)
locale (enum: en/es)
timezone
calorie_target, protein_g, carbs_g, fat_g
targets_overridden (bool)
updated_at
meals
id (uuid)
user_id (foreign key, cascade)
status (enum: analyzing/completed/failed)
error_code (nullable: NOT_FOOD, AI_ERROR, …)
name
imagekit_file_id, image_path
local_date (date in the user's timezone; drives the dashboard and the cap)
logged_at (timestamptz)
trigger_run_id
cached totals: calories, protein_g, carbs_g, fat_g
ai_model
ai_raw (jsonb)
created_at, updated_at
index on (user_id, local_date)
meal_items
id
meal_id (foreign key, cascade)
position
name
quantity, unit
grams
calories, protein_g, carbs_g, fat_g
confidence (0–1)
source (enum: ai/user)
Cap: count a user's meals for the current local_date where status != 'failed', checked inside a transaction with a per-user advisory lock to prevent races. No separate usage table.
Architecture
App: Expo (latest SDK) with Expo Router, TypeScript, NativeWind, TanStack Query, Zustand for the onboarding store, @clerk/clerk-expo, expo-camera / expo-image-picker / expo-image-manipulator, and i18next / expo-localization (en/es).
API: Expo Router API routes (app/api/**/+api.ts) deployed to EAS Hosting. Every route verifies the Clerk session token, and all business logic and DB writes happen here. The DB uses Drizzle with @neondatabase/serverless.
Background: the Trigger.dev task analyze-meal (in trigger/). Payload is { mealId }, with idempotency key analyze-meal:{mealId}:{attempt} and retry.maxAttempts = 3 for transient errors. It works like this:
Builds an ImageKit transformation URL (resized and compressed).
Calls Claude vision: claude-sonnet-5-5 by default, overridable with the ANTHROPIC_MODEL env var. The call uses a forced tool / JSON schema and asks for food names in the user's locale.
Validates the result with Zod.
Writes the items and totals and sets status to completed.
When is_food=false, it throws AbortTaskRunError, so there are no retries, and sets failed/NOT_FOOD.
onFailure sets failed/AI_ERROR.
Live updates: Trigger.dev Realtime. The API returns a scoped public access token for the run, and the app subscribes with @trigger.dev/react-hooks. When the run completes, the app invalidates its TanStack Query cache.
Images: ImageKit handles storage and transformations: thumbnails for the list, a larger version for detail, and a resized version for the AI. Uploads go directly from the client using signed params from the API, into the folder /users/{userId}/meals/.
Auth:
Clerk with Google and Apple (Apple shown on iOS only).
A Clerk webhook (/api/webhooks/clerk, verified with svix) handles user.deleted.
In-app delete account (DELETE /api/account) removes the user from Clerk, the DB and the ImageKit folder.
Errors: Sentry runs in the app (@sentry/react-native), the API routes and the Trigger.dev tasks, with releases tied to EAS builds and updates.
API surface
Route	Purpose
POST /api/onboarding	upsert user and profile, compute targets
GET / PATCH /api/profile	read/update profile, recalculate targets
GET /api/uploads/imagekit-auth	signed upload token, signature and expiry
POST /api/meals	cap check, create meal, trigger analysis, return run token
GET /api/meals?date=YYYY-MM-DD	meals and items for a day, plus the day's totals and remaining scans
GET / PATCH / DELETE /api/meals/[id]	detail, rename, delete (also deletes the ImageKit file)
PUT /api/meals/[id]/items	replace the item list and recalculate totals
POST /api/meals/[id]/retry	re-trigger a failed meal (cap rules apply)
DELETE /api/account	full account deletion
POST /api/webhooks/clerk	Clerk user.deleted
Environments & delivery
Two environments:
dev: a Neon dev branch, the Clerk dev instance, trigger.dev dev, and an Expo dev client
prod: a separate stack for each service
GitHub Actions: typecheck, lint and tests on every PR.
Releases:
EAS Build and Submit for the stores
EAS Update for over-the-air JS fixes
eas deploy for the API
trigger.dev deploy for tasks
Drizzle migrations run with drizzle-kit before the API deploy
Testing / definition of done
Jest unit tests:
the targets formula, including edge cases and unit conversions
recalculating meal totals
the Zod schema for AI output
API route tests:
auth required
users can only access their own data
cap enforcement, including that failed meals don't count
input validation
A Trigger.dev task test with a mocked Claude client covering success, non-food and transient error then retry.
A manual QA checklist on a real iPhone and Android device:
the full flow in English and Spanish
both unit systems
airplane mode
account deletion
Done means: the core flows work on both platforms in production builds and Sentry is receiving events.
2. Assumptions (not firmly stated by you)
"Kelly" means Cal AI, and "XBAW" means Expo.
The goal adjustment is fixed (−500 / 0 / +300 kcal) because target weight and pace are out of scope. The calorie floors and macro splits are the values listed above.
The Claude model is claude-sonnet-5-5, with Haiku as a cheaper option to evaluate later. It's switchable by env var.
The day boundary is the user's local timezone. local_date is sent by the client and the timezone is stored on the profile.
The cap counts non-failed scans per local day, and retries count only if they succeed.
Photos are kept until the user deletes the meal or the account. They are private to the user and served through ImageKit URLs.
On Android, Google is the only sign-in option. Apple Sign In is iOS-only.
Onboarding answers are held in a persisted Zustand store until sign-in. If the app is killed mid-flow, it resumes there.
Exact versions are confirmed against current docs when the project is scaffolded. That covers the Expo SDK, Clerk Expo, Trigger.dev SDK (v4), Drizzle, NativeWind and Sentry RN. Nothing is pinned from memory.
No product analytics in v1. Sentry covers errors and performance only.
Spanish UI strings and AI-returned food names follow the profile's locale.
3. Open risks / unknowns
AI accuracy: portion estimates from photos are inherently rough. Mitigations: item-level editing, confidence values in the data, and prompt and eval iteration. Some users will still distrust the numbers.
EAS Hosting maturity: API routes on EAS Hosting are newer than Vercel or Cloudflare. Check the runtime limits (Node APIs, body size, cold starts) and confirm the Neon serverless driver and svix work there. Fallback: move the same route handlers to a Hono server.
Trigger.dev Realtime in React Native: confirm that @trigger.dev/react-hooks works in RN/Hermes, since it was built for React web. Fallback: poll GET /api/meals/[id].
Apple review: Apple will check that Sign in with Apple is present, that account deletion works, and that health-related disclaimers are in place ("estimates, not medical advice").
Privacy: meal photos plus body stats are sensitive personal data. A privacy policy is needed for the stores and for data sent to Anthropic. GDPR applies if you have EU users.
Cost: about 15 scans per user per day on Claude Sonnet, plus ImageKit bandwidth. Watch the per-user cost early and switch to Haiku if needed.
Spanish AI output quality: food names and units must be consistent. This needs prompt testing.
Clerk + Expo Router + EAS Hosting auth: server-side token verification in API routes needs to be confirmed against the current Clerk docs.
4. Implementation phases (after approval)
Write this spec to PLAN.md in the project root. Check current docs and versions for each library.
Scaffold: Expo app, NativeWind, i18n, Sentry, Clerk, Drizzle schema and first migration on a Neon dev branch, Trigger.dev init.
Shared domain: src/lib/nutrition/targets.ts, unit conversion, Zod schemas, with tests.
Onboarding: screens, local store, plan reveal, auth, POST /api/onboarding.
Scan pipeline: ImageKit auth route, client compression and upload, POST /api/meals with the cap, the analyze-meal task, Realtime subscription.
Dashboard: week strip, rings, meal list, failed and analyzing states.
Meal detail and editing: items CRUD, totals recalculation, retry, delete.
Profile: edits and recalculation, target override, units and language, sign out, account deletion, Clerk webhook.
Hardening: error and empty states, offline handling, tests, CI, EAS profiles, production environments, store metadata.
Verification
npm test passes (targets, totals, schemas, API routes, task with mocked Claude).
In local dev (npx expo start plus npx trigger.dev dev), a scanned photo creates an "Analyzing…" card that fills in live, and the item edits change the totals.
The 16th scan in a day is rejected, and a failed scan doesn't use up the cap.
Deleting the account removes the Clerk user, the DB rows and the ImageKit files.
Production builds on a physical iPhone and Android device pass the QA checklist, and Sentry shows a test error from the app, the API and the task.