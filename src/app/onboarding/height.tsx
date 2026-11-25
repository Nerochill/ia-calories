import { useTranslation } from 'react-i18next';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { RulerPicker } from '@/components/onboarding/ruler-picker';
import { cmToInches, formatFeetInches, inchesToCm } from '@/lib/units';
import { useOnboardingStore } from '@/stores/onboarding';

export default function HeightStep() {
  const { t } = useTranslation();
  const heightCm = useOnboardingStore((s) => s.heightCm);
  const unitSystem = useOnboardingStore((s) => s.unitSystem);
  const setAnswers = useOnboardingStore((s) => s.setAnswers);

  return (
    <OnboardingScreen
      step="height"
      title={t('onboarding.height.title')}
      subtitle={t('onboarding.height.subtitle')}>
      {unitSystem === 'metric' ? (
        <RulerPicker
          min={100}
          max={250}
          step={1}
          labelEvery={5}
          value={Math.round(heightCm)}
          onChange={(cm) => setAnswers({ heightCm: cm })}
          formatValue={String}
          unit="cm"
        />
      ) : (
        <RulerPicker
          min={40}
          max={96}
          step={1}
          labelEvery={6}
          value={cmToInches(heightCm)}
          onChange={(inches) => setAnswers({ heightCm: inchesToCm(inches) })}
          formatLabel={formatFeetInches}
          formatValue={formatFeetInches}
        />
      )}
    </OnboardingScreen>
  );
}
