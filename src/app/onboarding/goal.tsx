import { useTranslation } from 'react-i18next';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { OptionCard, type OptionIcon } from '@/components/onboarding/option-card';
import type { Goal } from '@/lib/nutrition/targets';
import { useOnboardingStore } from '@/stores/onboarding';

const OPTIONS: { value: Goal; icon: OptionIcon }[] = [
  { value: 'lose', icon: { ios: 'chart.line.downtrend.xyaxis', android: 'trending_down', web: 'trending_down' } },
  { value: 'maintain', icon: { ios: 'heart', android: 'favorite', web: 'favorite' } },
  { value: 'gain', icon: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' } },
];

export default function GoalStep() {
  const { t } = useTranslation();
  const goal = useOnboardingStore((s) => s.goal);
  const setAnswers = useOnboardingStore((s) => s.setAnswers);

  return (
    <OnboardingScreen
      step="goal"
      title={t('onboarding.goal.title')}
      subtitle={t('onboarding.goal.subtitle')}
      canContinue={!!goal}
      scrollable>
      {OPTIONS.map(({ value, icon }) => (
        <OptionCard
          key={value}
          icon={icon}
          title={t(`onboarding.goal.${value}`)}
          description={t(`onboarding.goal.${value}Hint`)}
          selected={goal === value}
          onPress={() => setAnswers({ goal: value })}
        />
      ))}
    </OnboardingScreen>
  );
}
