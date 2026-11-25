import { useTranslation } from 'react-i18next';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { RulerPicker } from '@/components/onboarding/ruler-picker';
import { useOnboardingStore } from '@/stores/onboarding';

export default function AgeStep() {
  const { t } = useTranslation();
  const age = useOnboardingStore((s) => s.age);
  const setAnswers = useOnboardingStore((s) => s.setAnswers);

  return (
    <OnboardingScreen
      step="age"
      title={t('onboarding.age.title')}
      subtitle={t('onboarding.age.subtitle')}>
      <RulerPicker
        min={13}
        max={100}
        step={1}
        labelEvery={5}
        value={age}
        onChange={(value) => setAnswers({ age: value })}
        formatValue={String}
        unit={t('onboarding.age.unit')}
      />
    </OnboardingScreen>
  );
}
