import { useTranslation } from 'react-i18next';

import { SettingsRow, SettingsSection } from '@/components/profile/settings';
import { SettingsPage } from '@/components/profile/settings-page';
import { useProfile } from '@/hooks/use-profile';
import { formatHeight } from '@/lib/units';

export default function PersonalDetailsScreen() {
  const { t } = useTranslation();
  const profile = useProfile();
  if (!profile) return null;

  // TODO: make these rows editable (regenerating the targets unless they were overridden).
  return (
    <SettingsPage>
      <SettingsSection plain>
        <SettingsRow label={t('profile.sex')} value={t(`onboarding.sex.${profile.sex}`)} />
        <SettingsRow label={t('profile.age')} value={`${profile.age} ${t('onboarding.age.unit')}`} />
        <SettingsRow label={t('profile.height')} value={formatHeight(profile.heightCm, profile.unitSystem)} />
        <SettingsRow label={t('profile.activity')} value={t(`onboarding.activity.${profile.activityLevel}`)} />
        <SettingsRow label={t('profile.diet')} value={t(`onboarding.diet.${profile.diet}`)} />
      </SettingsSection>
    </SettingsPage>
  );
}
