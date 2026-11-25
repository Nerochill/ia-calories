import { useTranslation } from 'react-i18next';

import { ChoiceRow, SettingsSection } from '@/components/profile/settings';
import { SettingsPage } from '@/components/profile/settings-page';
import { useProfile, useUpdatePreferences } from '@/hooks/use-profile';
import type { Profile } from '@/lib/profile';

const LANGUAGES: Profile['language'][] = ['en', 'es'];

export default function LanguageScreen() {
  const { t } = useTranslation();
  const profile = useProfile();
  const updatePreferences = useUpdatePreferences();
  if (!profile) return null;

  return (
    <SettingsPage>
      <SettingsSection plain>
        {LANGUAGES.map((language) => (
          <ChoiceRow
            key={language}
            label={t(`onboarding.language.${language}`)}
            selected={profile.language === language}
            onPress={() => updatePreferences.mutate({ language })}
          />
        ))}
      </SettingsSection>
    </SettingsPage>
  );
}
