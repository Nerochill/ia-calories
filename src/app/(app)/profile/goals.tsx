import { useTranslation } from 'react-i18next';

import { SettingsRow, SettingsSection } from '@/components/profile/settings';
import { SettingsPage } from '@/components/profile/settings-page';
import { useProfile } from '@/hooks/use-profile';
import { formatWeight } from '@/lib/units';

export default function GoalsScreen() {
  const { t } = useTranslation();
  const profile = useProfile();
  if (!profile) return null;

  // TODO: let users log a new weight and change their goal (regenerating the targets).
  return (
    <SettingsPage>
      <SettingsSection plain>
        <SettingsRow label={t('profile.goal')} value={t(`onboarding.goal.${profile.goal}`)} />
        <SettingsRow label={t('profile.currentWeight')} value={formatWeight(profile.weightKg, profile.unitSystem)} />
      </SettingsSection>
    </SettingsPage>
  );
}
