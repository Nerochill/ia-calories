import type { Href } from 'expo-router';

/** Questions in the order they are asked; drives the progress indicator. */
export const QUESTION_STEPS = [
  'language',
  'sex',
  'age',
  'units',
  'height',
  'weight',
  'activity',
  'goal',
  'diet',
] as const;

export type OnboardingStep = (typeof QUESTION_STEPS)[number] | 'plan' | 'preview';

/**
 * Signed out: the questions, then the plan preview and sign-in. The plan reveal (`plan`)
 * comes after sign-in, because its targets are generated and saved by the API.
 * Signed in without a profile: the questions go straight to `plan`.
 */
const FLOW: OnboardingStep[] = [...QUESTION_STEPS, 'preview'];

export const nextStep = (step: OnboardingStep): OnboardingStep | undefined =>
  FLOW[FLOW.indexOf(step) + 1];

export const prevStep = (step: OnboardingStep): OnboardingStep | undefined =>
  FLOW[FLOW.indexOf(step) - 1];

export const stepHref = (step: OnboardingStep) => `/onboarding/${step}` as Href;
