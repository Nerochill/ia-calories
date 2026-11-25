# IA Calories App

An AI calorie tracker for iOS, Android and web. Take a photo of a meal, and the app identifies each food, estimates portions, calories and macros (protein, carbs, fat), and tracks the result against personalized daily targets generated during onboarding. Available in English and Spanish.

## Features

- **Photo meal logging**: camera or gallery, analyzed by AI in the background
- **Personalized targets**: onboarding (sex, age, height, weight, activity, goal, diet) produces daily calorie and macro targets, clamped to safe ranges
- **Daily dashboard**: progress rings, week strip, logged meals and streaks
- **Accounts**: Apple and Google sign-in, full account deletion (photos, auth user and data)
- **Guardrails**: per-day scan limit, non-food photo detection, retries on AI failures

## Tech stack

| Area | Tools |
| --- | --- |
| App | Expo (SDK + Expo Router), React Native, TypeScript, NativeWind |
| Auth | Clerk |
| API | Expo Router API routes (`src/app/api`) |
| Database | Postgres (Neon) with Drizzle ORM |
| Background jobs | Trigger.dev (`src/trigger/analyze-meal.ts`) |
| AI | OpenAI vision models |
| Image storage | ImageKit |
| Monitoring | Sentry |

## How a scan works

1. The app resizes the photo and uploads it to ImageKit with a short-lived token from `/api/uploads/imagekit-auth`.
2. `POST /api/meals` checks the daily limit and creates a pending meal.
3. A Trigger.dev task sends the image to OpenAI, validates the structured result and saves the foods and macros to Postgres.
4. The app shows the finished meal and updates the day's totals.

## Getting started

```bash
npm install
cp .env.example .env      # then fill in your own keys
npm run db:migrate        # create the database tables
npx trigger.dev@latest dev  # run background tasks locally (separate terminal)
npx expo start
```

You need your own accounts for Clerk, a Postgres database, OpenAI, ImageKit and Trigger.dev. Sentry is optional. Every variable is listed in [.env.example](.env.example).

To make EAS builds, run `eas init` to link the project to your own Expo account.

## Project structure

```
src/
  app/          screens (Expo Router) and API routes (app/api)
  components/   UI components
  db/           Drizzle schema and client
  lib/          shared logic, i18n, server helpers
  trigger/      Trigger.dev background tasks
drizzle/        SQL migrations
legal/          privacy policy and terms pages
```

## License

See [LICENSE](LICENSE).
