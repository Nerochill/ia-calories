import { useTranslation } from 'react-i18next';

import { ChoiceRow, SettingsSection } from '@/components/profile/settings';
import { SettingsPage } from '@/components/profile/settings-page';
import { useProfile, useUpdatePreferences } from '@/hooks/use-profile';
import type { UnitSystem } from '@/lib/units';

const UNIT_SYSTEMS: UnitSystem[] = ['metric', 'imperial'];

export default function PreferencesScreen() {
  const { t } = useTranslation();
  const profile = useProfile();
  const updatePreferences = useUpdatePreferences();
  if (!profile) return null;

  return (
    <SettingsPage>
      <SettingsSection title={t('profile.units')} plain>
        {UNIT_SYSTEMS.map((unitSystem) => (
          <ChoiceRow
            key={unitSystem}
            label={t(`onboarding.units.${unitSystem}`)}
            hint={t(`onboarding.units.${unitSystem}Hint`)}
            selected={profile.unitSystem === unitSystem}
            onPress={() => updatePreferences.mutate({ unitSystem })}
          />
        ))}
      </SettingsSection>
    </SettingsPage>
  );
}
