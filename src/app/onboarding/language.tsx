import { useTranslation } from 'react-i18next';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { OptionCard } from '@/components/onboarding/option-card';
import type { AppLanguage } from '@/lib/i18n';
import { useOnboardingStore } from '@/stores/onboarding';

const LANGUAGES: AppLanguage[] = ['en', 'es'];

export default function LanguageStep() {
  const { t } = useTranslation();
  const language = useOnboardingStore((s) => s.language);
  const setLanguage = useOnboardingStore((s) => s.setLanguage);

  return (
    <OnboardingScreen
      step="language"
      title={t('onboarding.language.title')}
      subtitle={t('onboarding.language.subtitle')}
      scrollable>
      {LANGUAGES.map((lang) => (
        <OptionCard
          key={lang}
          large
          icon={{ ios: 'globe', android: 'language', web: 'language' }}
          title={t(`onboarding.language.${lang}`)}
          selected={language === lang}
          onPress={() => setLanguage(lang)}
        />
      ))}
    </OnboardingScreen>
  );
}
