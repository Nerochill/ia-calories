import { useTranslation } from 'react-i18next';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { RulerPicker } from '@/components/onboarding/ruler-picker';
import { kgToLb, lbToKg } from '@/lib/units';
import { useOnboardingStore } from '@/stores/onboarding';

export default function WeightStep() {
  const { t } = useTranslation();
  const weightKg = useOnboardingStore((s) => s.weightKg);
  const unitSystem = useOnboardingStore((s) => s.unitSystem);
  const setAnswers = useOnboardingStore((s) => s.setAnswers);

  return (
    <OnboardingScreen
      step="weight"
      title={t('onboarding.weight.title')}
      subtitle={t('onboarding.weight.subtitle')}>
      {unitSystem === 'metric' ? (
        <RulerPicker
          min={30}
          max={250}
          step={0.5}
          labelEvery={4}
          value={Math.round(weightKg * 2) / 2}
          onChange={(kg) => setAnswers({ weightKg: kg })}
          formatValue={(kg) => kg.toFixed(1)}
          unit="kg"
        />
      ) : (
        <RulerPicker
          min={66}
          max={550}
          step={1}
          labelEvery={5}
          value={kgToLb(weightKg)}
          onChange={(lb) => setAnswers({ weightKg: lbToKg(lb) })}
          formatValue={String}
          unit="lb"
        />
      )}
    </OnboardingScreen>
  );
}
