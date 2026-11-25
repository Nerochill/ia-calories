import { useAuth } from '@clerk/expo';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { OptionCard, type OptionIcon } from '@/components/onboarding/option-card';
import type { DietPreference } from '@/lib/nutrition/targets';
import { stepHref } from '@/lib/onboarding/steps';
import { useOnboardingStore } from '@/stores/onboarding';

const OPTIONS: { value: DietPreference; icon: OptionIcon }[] = [
  { value: 'none', icon: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' } },
  { value: 'vegetarian', icon: { ios: 'leaf', android: 'eco', web: 'eco' } },
  { value: 'vegan', icon: { ios: 'carrot', android: 'nutrition', web: 'nutrition' } },
  { value: 'keto', icon: { ios: 'drop', android: 'water_drop', web: 'water_drop' } },
  { value: 'high_protein', icon: { ios: 'fish', android: 'egg', web: 'egg' } },
];

export default function DietStep() {
  const { t } = useTranslation();
  const { isSignedIn } = useAuth();
  const diet = useOnboardingStore((s) => s.diet);
  const setAnswers = useOnboardingStore((s) => s.setAnswers);

  // The last question: signed-in users go on to generate their plan, everyone else to sign-in.
  const finish = () => {
    setAnswers({ questionsCompleted: true });
    router.push(stepHref(isSignedIn ? 'plan' : 'preview'));
  };

  return (
    <OnboardingScreen
      step="diet"
      title={t('onboarding.diet.title')}
      subtitle={t('onboarding.diet.subtitle')}
      canContinue={!!diet}
      onContinue={finish}
      scrollable>
      {OPTIONS.map(({ value, icon }) => (
        <OptionCard
          key={value}
          icon={icon}
          title={t(`onboarding.diet.${value}`)}
          description={t(`onboarding.diet.${value}Hint`)}
          selected={diet === value}
          onPress={() => setAnswers({ diet: value })}
        />
      ))}
    </OnboardingScreen>
  );
}
