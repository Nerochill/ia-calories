import { Image } from 'expo-image';
import { type Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '@/constants/links';

const openLink = (url: string) =>
  openBrowserAsync(url, { presentationStyle: WebBrowserPresentationStyle.AUTOMATIC });

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  // Both entry points ask for agreement to the Terms and Privacy Policy first; this is where
  // "Accept & Continue" goes once they agree.
  const [pendingRoute, setPendingRoute] = useState<Href | null>(null);
  const isTermsModalVisible = pendingRoute !== null;

  const closeTermsModal = () => setPendingRoute(null);

  const acceptAndContinue = () => {
    if (!pendingRoute) return;
    router.push(pendingRoute);
    closeTermsModal();
  };

  return (
    <View
      className="flex-1 bg-white px-6"
      style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 8 }}>
      <StatusBar style="dark" />

      {/* Phone mockup of the scanner; shrinks to fit so the text and buttons always stay on screen. */}
      <View className="flex-1 items-center">
        <Image
          source={require('@/assets/images/welcome-hero.png')}
          contentFit="contain"
          style={{ height: '100%', aspectRatio: 755 / 1525, maxWidth: '100%' }}
        />
      </View>

      <Image
        source={require('@/assets/images/logo.png')}
        style={{ width: 48, height: 48, alignSelf: 'center', marginTop: 20 }}
      />

      <Text className="mt-3 text-center text-[36px] font-bold leading-[40px] tracking-tight text-black">
        Calorie tracking{'\n'}made easy
      </Text>

      <Pressable
        onPress={() => setPendingRoute('/onboarding')}
        className="mt-6 h-[60px] items-center justify-center rounded-full bg-black active:opacity-80">
        <Text className="text-[18px] font-semibold text-white">Get Started</Text>
      </Pressable>

      <View className="mt-4 flex-row justify-center">
        <Text className="text-[15px] text-neutral-700">Already have an account? </Text>
        <Pressable
          hitSlop={8}
          onPress={() => setPendingRoute({ pathname: '/auth', params: { mode: 'signin' } })}>
          <Text className="text-[15px] font-bold text-black">Sign In</Text>
        </Pressable>
      </View>

      <Modal
        visible={isTermsModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeTermsModal}>
        <View className="flex-1 justify-end bg-black/40">
          {/* Tapping the dimmed area behaves like Cancel. */}
          <Pressable className="flex-1" onPress={closeTermsModal} accessibilityLabel="Cancel" />

          <View
            className="rounded-t-[28px] bg-white px-6 pt-3"
            style={{ paddingBottom: insets.bottom + 16 }}>
            <View className="mb-5 h-1.5 w-10 self-center rounded-full bg-neutral-300" />

            <Text className="text-[24px] font-bold tracking-tight text-black">
              Terms & Privacy
            </Text>
            <Text className="mt-3 text-[15px] leading-[22px] text-neutral-600">
              Before you continue, please review and accept our Terms of Service and Privacy
              Policy. They explain how the app works, how your meal photos and health information
              are used, and the choices you have over your data.
            </Text>

            <View className="mt-5 overflow-hidden rounded-2xl border border-neutral-200">
              <Pressable
                onPress={() => openLink(TERMS_OF_SERVICE_URL)}
                className="flex-row items-center justify-between px-4 py-4 active:bg-neutral-100">
                <Text className="text-[16px] font-semibold text-black">Terms of Service</Text>
                <Text className="text-[18px] text-neutral-400">›</Text>
              </Pressable>
              <View className="h-px bg-neutral-200" />
              <Pressable
                onPress={() => openLink(PRIVACY_POLICY_URL)}
                className="flex-row items-center justify-between px-4 py-4 active:bg-neutral-100">
                <Text className="text-[16px] font-semibold text-black">Privacy Policy</Text>
                <Text className="text-[18px] text-neutral-400">›</Text>
              </Pressable>
            </View>

            <Text className="mt-4 text-[13px] leading-[18px] text-neutral-500">
              By tapping “Accept & Continue”, you agree to the Terms of Service and Privacy Policy.
            </Text>

            <Pressable
              onPress={acceptAndContinue}
              className="mt-5 h-[60px] items-center justify-center rounded-full bg-black active:opacity-80">
              <Text className="text-[18px] font-semibold text-white">Accept & Continue</Text>
            </Pressable>
            <Pressable
              onPress={closeTermsModal}
              className="mt-2 h-[52px] items-center justify-center rounded-full active:bg-neutral-100">
              <Text className="text-[16px] font-semibold text-neutral-700">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
