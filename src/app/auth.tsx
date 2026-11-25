import { useSSO } from '@clerk/expo';
import * as Sentry from '@sentry/react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppleLogo } from '@/components/auth/apple-logo';
import { GoogleLogo } from '@/components/auth/google-logo';
import { useSSOFlowStore } from '@/lib/auth/sso-flow';

type Provider = 'oauth_apple' | 'oauth_google';

/** Preloads the browser on Android so the SSO sheet opens faster. */
function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

/**
 * Combined sign-in / sign-up. Reached at the end of onboarding, or from the welcome
 * screen's "Sign In" link with `?mode=signin`.
 */
export default function AuthScreen() {
  useWarmUpBrowser();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: 'signin' }>();
  const { startSSOFlow } = useSSO();
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = mode === 'signin' ? 'auth.signin' : 'auth.signup';

  const signInWith = async (strategy: Provider) => {
    setPending(strategy);
    setError(null);
    useSSOFlowStore.setState({ inProgress: true });
    try {
      const { createdSessionId, setActive, signUp } = await startSSOFlow({ strategy });
      if (createdSessionId) {
        // The root layout's guards take it from here: users with a profile go to the app,
        // everyone else finishes onboarding, which saves the plan via POST /api/onboarding.
        await setActive?.({ session: createdSessionId });
        Sentry.logger.info('User signed in', { provider: strategy, mode: mode ?? 'signup', platform: Platform.OS });
      } else if (signUp?.status === 'missing_requirements') {
        Sentry.logger.warn('Sign-in missing requirements', {
          provider: strategy,
          missing_fields: signUp.missingFields.join(','),
          platform: Platform.OS,
        });
        setError(t('auth.error'));
      }
      // No session and no missing requirements: the user closed the browser.
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      Sentry.logger.error('Sign-in failed', {
        provider: strategy,
        mode: mode ?? 'signup',
        platform: Platform.OS,
        error_message: err instanceof Error ? err.message : JSON.stringify(err),
      });
      setError(t('auth.error'));
    } finally {
      setPending(null);
      useSSOFlowStore.setState({ inProgress: false });
    }
  };

  return (
    <View
      className="flex-1 bg-white px-6"
      style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }}>
      <StatusBar style="dark" />

      <View className="h-11 flex-row items-center">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={12}
          className="-ml-1 p-1 active:opacity-50">
          <SymbolView
            name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }}
            size={22}
            tintColor="#000"
          />
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center">
        <Image source={require('@/assets/images/logo.png')} style={{ width: 88, height: 88 }} />
        <Text className="mt-8 text-center text-[28px] font-bold leading-[34px] tracking-tight text-black">
          {t(`${copy}.title`)}
        </Text>
        <Text className="mt-3 px-2 text-center text-[15px] leading-[21px] text-neutral-500">
          {t(`${copy}.subtitle`)}
        </Text>
      </View>

      <View className="gap-3">
        <AuthButton
          dark
          label={t('auth.apple')}
          icon={<AppleLogo />}
          loading={pending === 'oauth_apple'}
          disabled={pending !== null}
          onPress={() => signInWith('oauth_apple')}
        />
        <AuthButton
          label={t('auth.google')}
          icon={<GoogleLogo />}
          loading={pending === 'oauth_google'}
          disabled={pending !== null}
          onPress={() => signInWith('oauth_google')}
        />
      </View>

      <Text className={`mt-4 min-h-5 text-center text-[13px] ${error ? 'text-red-600' : 'text-neutral-400'}`}>
        {error ?? t('auth.privacy')}
      </Text>
    </View>
  );
}

type AuthButtonProps = {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  loading: boolean;
  disabled: boolean;
  dark?: boolean;
};

function AuthButton({ label, icon, onPress, loading, disabled, dark }: AuthButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      className={`h-14 flex-row items-center justify-center rounded-xl active:opacity-80 ${
        dark ? 'bg-black' : 'border-[1.5px] border-neutral-200 bg-white'
      } ${disabled && !loading ? 'opacity-50' : ''}`}>
      {loading ? (
        <ActivityIndicator color={dark ? '#fff' : '#000'} />
      ) : (
        <>
          <View className="absolute left-5">{icon}</View>
          <Text className={`text-[17px] font-semibold ${dark ? 'text-white' : 'text-black'}`}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
