import { useTranslation } from 'react-i18next';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { OptionCard, type OptionIcon } from '@/components/onboarding/option-card';
import type { UnitSystem } from '@/lib/units';
import { useOnboardingStore } from '@/stores/onboarding';

const OPTIONS: { value: UnitSystem; icon: OptionIcon }[] = [
  { value: 'metric', icon: { ios: 'ruler', android: 'straighten', web: 'straighten' } },
  { value: 'imperial', icon: { ios: 'scalemass', android: 'scale', web: 'scale' } },
];

export default function UnitsStep() {
  const { t } = useTranslation();
  const unitSystem = useOnboardingStore((s) => s.unitSystem);
  const setAnswers = useOnboardingStore((s) => s.setAnswers);

  return (
    <OnboardingScreen
      step="units"
      title={t('onboarding.units.title')}
      subtitle={t('onboarding.units.subtitle')}
      scrollable>
      {OPTIONS.map(({ value, icon }) => (
        <OptionCard
          key={value}
          large
          icon={icon}
          title={t(`onboarding.units.${value}`)}
          description={t(`onboarding.units.${value}Hint`)}
          selected={unitSystem === value}
          onPress={() => setAnswers({ unitSystem: value })}
        />
      ))}
    </OnboardingScreen>
  );
}
