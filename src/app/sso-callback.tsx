import { useAuth } from '@clerk/expo';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useSSOFlowStore } from '@/lib/auth/sso-flow';

/**
 * Clerk's SSO redirect (`<scheme>://sso-callback`) also reaches Expo Router on Android.
 * The auth screen underneath finishes the flow; this screen just waits for the result.
 */
export default function SSOCallback() {
  const { isSignedIn } = useAuth();
  const inProgress = useSSOFlowStore((s) => s.inProgress);

  // Cancelled, failed, or opened with no flow running (e.g. after a cold start):
  // return to the auth screen, which shows any error.
  useEffect(() => {
    if (isSignedIn || inProgress) return;
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [isSignedIn, inProgress]);

  // Once signed in, the root layout's guards remove this screen and route the user
  // to onboarding or the app.
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator color="#000" />
    </View>
  );
}
