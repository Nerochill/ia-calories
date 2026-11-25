import { useTranslation } from 'react-i18next';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { OptionCard, type OptionIcon } from '@/components/onboarding/option-card';
import type { ActivityLevel } from '@/lib/nutrition/targets';
import { useOnboardingStore } from '@/stores/onboarding';

const OPTIONS: { value: ActivityLevel; icon: OptionIcon }[] = [
  { value: 'sedentary', icon: { ios: 'sofa', android: 'weekend', web: 'weekend' } },
  { value: 'light', icon: { ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' } },
  { value: 'moderate', icon: { ios: 'dumbbell', android: 'fitness_center', web: 'fitness_center' } },
  { value: 'active', icon: { ios: 'figure.run', android: 'directions_run', web: 'directions_run' } },
  {
    value: 'very_active',
    icon: { ios: 'flame', android: 'local_fire_department', web: 'local_fire_department' },
  },
];

export default function ActivityStep() {
  const { t } = useTranslation();
  const activityLevel = useOnboardingStore((s) => s.activityLevel);
  const setAnswers = useOnboardingStore((s) => s.setAnswers);

  return (
    <OnboardingScreen
      step="activity"
      title={t('onboarding.activity.title')}
      subtitle={t('onboarding.activity.subtitle')}
      canContinue={!!activityLevel}
      scrollable>
      {OPTIONS.map(({ value, icon }) => (
        <OptionCard
          key={value}
          icon={icon}
          title={t(`onboarding.activity.${value}`)}
          description={t(`onboarding.activity.${value}Hint`)}
          selected={activityLevel === value}
          onPress={() => setAnswers({ activityLevel: value })}
        />
      ))}
    </OnboardingScreen>
  );
}
