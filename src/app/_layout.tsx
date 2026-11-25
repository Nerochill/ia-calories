import '@/global.css';

import { ClerkProvider, useAuth, useClerk } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import * as Sentry from '@sentry/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, useColorScheme, View } from 'react-native';

// Initializes i18n before any screen renders.
import i18n from '@/lib/i18n';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useProfileQuery } from '@/hooks/use-profile';
import { ApiError } from '@/lib/api';
import { createFeedbackIntegration } from '@/lib/feedback';
import { stepHref } from '@/lib/onboarding/steps';
import { toOnboardingInput, useOnboardingHydrated, useOnboardingStore } from '@/stores/onboarding';

// Runs first so errors thrown during startup (like the missing Clerk key below) are reported too.
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  // Logs SDK activity to the console in dev, which helps confirm events are being sent.
  debug: __DEV__,
  // Sends Sentry.logger.* calls to Sentry's Logs view.
  enableLogs: true,
  // User Feedback, opened from the profile's "Send feedback" row (Sentry.wrap renders the form).
  integrations: [createFeedbackIntegration(i18n.t.bind(i18n))],
});

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

if (!publishableKey) {
  throw new Error('Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env file');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      // Retry network blips and server hiccups, not requests the server rejected outright.
      retry: (failures, error) => failures < 2 && !(error instanceof ApiError && error.status < 500),
    },
  },
});

function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AnimatedSplashOverlay />
          <RootStack />
        </ThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

/**
 * Three states, each with its own screens:
 * - signed out: welcome, onboarding questions, sign-in
 * - signed in without a profile: onboarding (mandatory, ends by generating the plan)
 * - signed in with a profile: the app
 */
function RootStack() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const profile = useProfileQuery();
  const hydrated = useOnboardingHydrated();

  const hasProfile = !!isSignedIn && !!profile.data;
  const needsOnboarding = !!isSignedIn && profile.isSuccess && profile.data === null;

  // Signed in without a profile: resume onboarding. Finished questions (e.g. answered
  // before signing up) go straight to generating the plan; otherwise start from the top.
  useEffect(() => {
    if (!needsOnboarding || !hydrated) return;
    const answered = toOnboardingInput(useOnboardingStore.getState()) !== null;
    router.replace(stepHref(answered ? 'plan' : 'language'));
  }, [needsOnboarding, hydrated]);

  const language = profile.data?.language;
  useEffect(() => {
    if (language) i18n.changeLanguage(language);
  }, [language]);

  // Don't keep one account's data around for the next one.
  useEffect(() => {
    if (!isSignedIn) queryClient.clear();
  }, [isSignedIn]);

  // Tags errors and logs with the Clerk user id (only the id, no email or name).
  useEffect(() => {
    Sentry.setUser(userId ? { id: userId } : null);
  }, [userId]);

  // Wait for Clerk to restore the session from the token cache, so signed-in users
  // don't see the welcome screen flash on every cold start.
  if (!isLoaded) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          {/* The SSO redirect lands here mid-sign-in; once signed in, the guards take over. */}
          <Stack.Screen name="sso-callback" options={{ animation: 'none' }} />
        </Stack.Protected>
        <Stack.Protected guard={!hasProfile}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={hasProfile}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>

      {/* Covers the onboarding screens the guards fall back to while we find out
          whether a signed-in user already has a profile. */}
      {isSignedIn && (profile.isPending || profile.isError) && (
        <ProfileGate error={profile.error} onRetry={() => profile.refetch()} />
      )}
    </>
  );
}

function ProfileGate({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  const { t } = useTranslation();
  const { signOut } = useClerk();

  return (
    <View className="absolute inset-0 items-center justify-center bg-white px-8">
      {error ? (
        <>
          <Text className="text-center text-[22px] font-bold tracking-tight text-black">
            {t('gate.errorTitle')}
          </Text>
          <Text className="mt-2 text-center text-[15px] leading-[21px] text-neutral-500">
            {t('gate.errorBody')}
          </Text>
          {/* The real reason, for whoever is running the dev build. */}
          {__DEV__ && (
            <Text selectable className="mt-4 text-center font-mono text-xs leading-[18px] text-red-600">
              {error.message}
            </Text>
          )}
          <Pressable
            onPress={onRetry}
            accessibilityRole="button"
            className="mt-8 h-14 w-full items-center justify-center rounded-xl bg-black active:opacity-80">
            <Text className="text-[17px] font-semibold text-white">{t('common.retry')}</Text>
          </Pressable>
          <Pressable onPress={() => signOut()} hitSlop={8} className="mt-5">
            <Text className="text-[15px] font-semibold text-neutral-600">{t('auth.signOut')}</Text>
          </Pressable>
        </>
      ) : (
        <ActivityIndicator color="#000" size="large" />
      )}
    </View>
  );
}

export default Sentry.wrap(RootLayout);
