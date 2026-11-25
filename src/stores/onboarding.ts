import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCalendars, getLocales } from 'expo-localization';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import i18n, { type AppLanguage } from '@/lib/i18n';
import type { ActivityLevel, DietPreference, Goal, Sex } from '@/lib/nutrition/targets';
import type { OnboardingInput } from '@/lib/profile';
import type { UnitSystem } from '@/lib/units';

type OnboardingAnswers = {
  language: AppLanguage;
  unitSystem: UnitSystem;
  sex?: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel?: ActivityLevel;
  goal?: Goal;
  diet?: DietPreference;
  /** Set when the user finishes the last question, so defaults never pass as real answers. */
  questionsCompleted: boolean;
};

type OnboardingState = OnboardingAnswers & {
  setAnswers: (answers: Partial<OnboardingAnswers>) => void;
  setLanguage: (language: AppLanguage) => void;
  reset: () => void;
};

function defaultAnswers(): OnboardingAnswers {
  const [locale] = getLocales();
  return {
    language: locale.languageCode === 'es' ? 'es' : 'en',
    unitSystem: locale.measurementSystem === 'us' ? 'imperial' : 'metric',
    age: 25,
    heightCm: 170,
    weightKg: 70,
    questionsCompleted: false,
  };
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...defaultAnswers(),
      setAnswers: (answers) => set(answers),
      setLanguage: (language) => {
        i18n.changeLanguage(language);
        set({ language });
      },
      reset: () => set(defaultAnswers()),
    }),
    {
      name: 'onboarding',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) i18n.changeLanguage(state.language);
      },
    }
  )
);

const subscribeHydration = (onChange: () => void) =>
  useOnboardingStore.persist.onFinishHydration(onChange);

export function useOnboardingHydrated() {
  return useSyncExternalStore(subscribeHydration, useOnboardingStore.persist.hasHydrated);
}

/** The answers as a POST /api/onboarding body, or null until every question is answered. */
export function toOnboardingInput(answers: OnboardingAnswers): OnboardingInput | null {
  const { sex, activityLevel, goal, diet, questionsCompleted } = answers;
  if (!questionsCompleted || !sex || !activityLevel || !goal || !diet) return null;

  return {
    sex,
    age: answers.age,
    heightCm: answers.heightCm,
    weightKg: answers.weightKg,
    activityLevel,
    goal,
    diet,
    unitSystem: answers.unitSystem,
    language: answers.language,
    timezone: getCalendars()[0]?.timeZone ?? 'UTC',
  };
}
