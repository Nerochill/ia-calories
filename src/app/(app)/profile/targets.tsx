import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { SettingsSection } from '@/components/profile/settings';
import { SettingsPage } from '@/components/profile/settings-page';
import { MACROS } from '@/constants/macros';
import { useProfile } from '@/hooks/use-profile';

export default function DailyTargetsScreen() {
  const { t, i18n } = useTranslation();
  const profile = useProfile();
  if (!profile) return null;

  const { targets } = profile;
  const number = new Intl.NumberFormat(i18n.language);

  return (
    <SettingsPage footer={t('profile.targetsHint')}>
      <SettingsSection plain>
        <View className="items-center pb-5 pt-6">
          <Text className="text-[40px] font-bold tracking-tight text-black">
            {targets ? number.format(targets.calories) : '—'}
          </Text>
          <Text className="text-sm text-neutral-500">{t('onboarding.plan.perDay')}</Text>
        </View>
        <View className="flex-row py-4">
          {MACROS.map(({ key, targetKey, icon, color }) => (
            <View key={key} className="flex-1 items-center">
              <SymbolView name={icon} size={20} tintColor={color} />
              <Text className="mt-2 text-[15px] font-semibold text-black">
                {targets ? `${targets[targetKey]}g` : '—'}
              </Text>
              <Text className="mt-0.5 text-xs text-neutral-500">{t(`onboarding.plan.${key}`)}</Text>
            </View>
          ))}
        </View>
      </SettingsSection>
    </SettingsPage>
  );
}
