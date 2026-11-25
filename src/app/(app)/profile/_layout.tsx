import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SETTINGS_BACKGROUND } from '@/components/profile/settings';

/** The profile tab: the settings list, plus the pages its rows open. */
export default function ProfileLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: '#000',
        headerStyle: { backgroundColor: SETTINGS_BACKGROUND },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: SETTINGS_BACKGROUND },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="details" options={{ title: t('profile.details') }} />
      <Stack.Screen name="preferences" options={{ title: t('profile.preferences') }} />
      <Stack.Screen name="language" options={{ title: t('profile.language') }} />
      <Stack.Screen name="goals" options={{ title: t('profile.goalsWeight') }} />
      <Stack.Screen name="targets" options={{ title: t('profile.targets') }} />
    </Stack>
  );
}
