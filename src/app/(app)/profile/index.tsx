import { useClerk, useUser } from '@clerk/expo';
import * as Sentry from '@sentry/react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SETTINGS_BACKGROUND, SettingsRow, SettingsSection } from '@/components/profile/settings';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '@/constants/links';
import { useDeleteAccount, useProfile } from '@/hooks/use-profile';
import { ApiError } from '@/lib/api';
import { openFeedback } from '@/lib/feedback';
import { formatWeight } from '@/lib/units';
import { useOnboardingStore } from '@/stores/onboarding';

const openLink = (url: string) =>
  openBrowserAsync(url, { presentationStyle: WebBrowserPresentationStyle.AUTOMATIC });

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { signOut } = useClerk();
  const profile = useProfile();
  const deleteAccount = useDeleteAccount();

  // Briefly undefined while signing out, before the guards remove this screen.
  if (!profile) return null;

  const number = new Intl.NumberFormat(i18n.language);
  const email = user?.primaryEmailAddress?.emailAddress;
  const name = user?.fullName || email;

  const handleDelete = async () => {
    try {
      await deleteAccount.mutateAsync();
      // Don't carry this account's onboarding answers into the next sign-up.
      useOnboardingStore.getState().reset();
      router.replace('/');
    } catch (err) {
      console.error('[profile] Account deletion failed:', err);
      Sentry.logger.error('Account deletion failed', {
        status: err instanceof ApiError ? err.status : 0,
        error_message: err instanceof Error ? err.message : String(err),
      });
      Alert.alert(t('profile.deleteErrorTitle'), t('profile.deleteErrorBody'));
    }
  };

  const confirmDelete = () =>
    Alert.alert(t('profile.deleteTitle'), t('profile.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.deleteConfirm'), style: 'destructive', onPress: handleDelete },
    ]);

  return (
    <View className="flex-1" style={{ paddingTop: insets.top, backgroundColor: SETTINGS_BACKGROUND }}>
      <StatusBar style="dark" />

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-8" showsVerticalScrollIndicator={false}>
        <Text className="mt-4 text-[34px] font-bold leading-[40px] tracking-tight text-black">
          {t('profile.title')}
        </Text>

        <SettingsSection>
          <View className="flex-row items-center px-4 py-4">
            {user?.imageUrl ? (
              <Image source={{ uri: user.imageUrl }} style={{ width: 52, height: 52, borderRadius: 26 }} />
            ) : (
              <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-neutral-100">
                <SymbolView name={{ ios: 'person', android: 'person', web: 'person' }} size={24} tintColor="#000" />
              </View>
            )}
            <View className="ml-4 flex-1">
              {name && (
                <Text className="text-[17px] font-bold text-black" numberOfLines={1}>
                  {name}
                </Text>
              )}
              {email && email !== name && (
                <Text className="mt-0.5 text-sm text-neutral-500" numberOfLines={1}>
                  {email}
                </Text>
              )}
            </View>
          </View>
        </SettingsSection>

        <SettingsSection title={t('profile.account')}>
          <SettingsRow
            label={t('profile.details')}
            icon={{ ios: 'person.text.rectangle', android: 'badge', web: 'badge' }}
            onPress={() => router.push('/profile/details')}
            chevron
          />
          <SettingsRow
            label={t('profile.preferences')}
            icon={{ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' }}
            value={t(`onboarding.units.${profile.unitSystem}`)}
            onPress={() => router.push('/profile/preferences')}
            chevron
          />
          <SettingsRow
            label={t('profile.language')}
            icon={{ ios: 'character.bubble', android: 'translate', web: 'translate' }}
            value={t(`onboarding.language.${profile.language}`)}
            onPress={() => router.push('/profile/language')}
            chevron
          />
        </SettingsSection>

        <SettingsSection title={t('profile.goalsTracking')}>
          <SettingsRow
            label={t('profile.targets')}
            icon={{ ios: 'target', android: 'track_changes', web: 'track_changes' }}
            value={profile.targets ? `${number.format(profile.targets.calories)} kcal` : undefined}
            onPress={() => router.push('/profile/targets')}
            chevron
          />
          <SettingsRow
            label={t('profile.goalsWeight')}
            icon={{ ios: 'scalemass', android: 'monitor_weight', web: 'monitor_weight' }}
            value={formatWeight(profile.weightKg, profile.unitSystem)}
            onPress={() => router.push('/profile/goals')}
            chevron
          />
        </SettingsSection>

        <SettingsSection title={t('profile.support')}>
          <SettingsRow
            label={t('profile.feedback')}
            icon={{ ios: 'bubble.left.and.text.bubble.right', android: 'feedback', web: 'feedback' }}
            onPress={() => openFeedback(t, { name: user?.fullName, email })}
          />
        </SettingsSection>

        <SettingsSection title={t('profile.legal')}>
          <SettingsRow
            label={t('profile.privacy')}
            icon={{ ios: 'hand.raised', android: 'shield', web: 'shield' }}
            onPress={() => openLink(PRIVACY_POLICY_URL)}
            chevron
          />
          <SettingsRow
            label={t('profile.terms')}
            icon={{ ios: 'doc.text', android: 'description', web: 'description' }}
            onPress={() => openLink(TERMS_OF_SERVICE_URL)}
            chevron
          />
        </SettingsSection>

        <SettingsSection>
          <SettingsRow
            label={t('auth.signOut')}
            icon={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }}
            onPress={() => signOut()}
          />
          <SettingsRow
            label={t('profile.deleteAccount')}
            icon={{ ios: 'trash', android: 'delete', web: 'delete' }}
            onPress={confirmDelete}
            loading={deleteAccount.isPending}
            destructive
          />
        </SettingsSection>

        <Text className="mt-6 px-4 text-center text-xs leading-[18px] text-neutral-400">
          {t('profile.disclaimer')}
        </Text>
      </ScrollView>
    </View>
  );
}
