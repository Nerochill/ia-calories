import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { OptionCard, type OptionIcon } from '@/components/onboarding/option-card';

const FEATURES: { key: string; icon: OptionIcon }[] = [
  { key: 'targets', icon: { ios: 'target', android: 'track_changes', web: 'track_changes' } },
  { key: 'scan', icon: { ios: 'camera.viewfinder', android: 'center_focus_strong', web: 'center_focus_strong' } },
  { key: 'edit', icon: { ios: 'square.and.pencil', android: 'edit_note', web: 'edit_note' } },
  { key: 'history', icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' } },
  { key: 'language', icon: { ios: 'globe', android: 'language', web: 'language' } },
];

export default function PreviewStep() {
  const { t } = useTranslation();

  return (
    <OnboardingScreen
      step="preview"
      title={t('onboarding.preview.title')}
      subtitle={t('onboarding.preview.subtitle')}
      buttonLabel={t('common.continue')}
      onContinue={() => router.push('/auth')}
      scrollable>
      {FEATURES.map(({ key, icon }) => (
        <OptionCard
          key={key}
          icon={icon}
          title={t(`onboarding.preview.${key}Title`)}
          description={t(`onboarding.preview.${key}Hint`)}
        />
      ))}
    </OnboardingScreen>
  );
}
