import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { OptionCard } from '@/components/onboarding/option-card';
import type { Sex } from '@/lib/nutrition/targets';
import { useOnboardingStore } from '@/stores/onboarding';

// U+FE0E keeps the glyphs as text instead of emoji.
const GLYPHS: Record<Sex, string> = { male: '♂︎', female: '♀︎' };

export default function SexStep() {
  const { t } = useTranslation();
  const sex = useOnboardingStore((s) => s.sex);
  const setAnswers = useOnboardingStore((s) => s.setAnswers);

  return (
    <OnboardingScreen
      step="sex"
      title={t('onboarding.sex.title')}
      subtitle={t('onboarding.sex.subtitle')}
      canContinue={!!sex}
      scrollable>
      {(['male', 'female'] as const).map((option) => (
        <OptionCard
          key={option}
          large
          icon={<Text className="text-[32px] leading-[38px] text-neutral-800">{GLYPHS[option]}</Text>}
          title={t(`onboarding.sex.${option}`)}
          selected={sex === option}
          onPress={() => setAnswers({ sex: option })}
        />
      ))}
    </OnboardingScreen>
  );
}
