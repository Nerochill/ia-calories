import { Redirect } from 'expo-router';

import { stepHref } from '@/lib/onboarding/steps';
import { useOnboardingHydrated } from '@/stores/onboarding';

/**
 * Entry point from the welcome screen. Always starts at the first step so every
 * step is on the back stack; saved answers are pre-filled from the store.
 */
export default function OnboardingIndex() {
  const hydrated = useOnboardingHydrated();

  if (!hydrated) return null;
  return <Redirect href={stepHref('language')} />;
}
