import { useAuth } from '@clerk/expo';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { nextStep, prevStep, QUESTION_STEPS, stepHref, type OnboardingStep } from '@/lib/onboarding/steps';

type Props = {
  step: OnboardingStep;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Wrap the body in a ScrollView (option lists). Rulers manage their own scrolling. */
  scrollable?: boolean;
  canContinue?: boolean;
  buttonLabel?: string;
  /** Defaults to advancing to the next step. */
  onContinue?: () => void;
  hideHeader?: boolean;
};

export function OnboardingScreen({
  step,
  title,
  subtitle,
  children,
  scrollable,
  canContinue = true,
  buttonLabel,
  onContinue,
  hideHeader,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  // Signed-in users must finish onboarding, and the welcome screen isn't available to them.
  const canGoBack = !(isSignedIn && !prevStep(step));

  const goBack = () => {
    if (router.canGoBack()) return router.back();
    const prev = prevStep(step);
    router.replace(prev ? stepHref(prev) : '/');
  };

  const goNext = () => {
    if (onContinue) return onContinue();
    const next = nextStep(step);
    if (next) router.push(stepHref(next));
  };

  const Body = scrollable ? ScrollView : View;

  return (
    <View
      className="flex-1 bg-white px-6"
      style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }}>
      <StatusBar style="dark" />

      {!hideHeader && (
        <View className="h-11 flex-row items-center">
          {canGoBack && (
            <Pressable onPress={goBack} hitSlop={12} className="-ml-1 mr-5 p-1 active:opacity-50">
              <SymbolView
                name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }}
                size={22}
                tintColor="#000"
              />
            </Pressable>
          )}
          <ProgressDashes step={step} />
        </View>
      )}

      {title && (
        <Text className="mt-6 text-[28px] font-bold leading-[34px] tracking-tight text-black">
          {title}
        </Text>
      )}
      {subtitle && (
        <Text className="mt-2 text-[15px] leading-[21px] text-neutral-500">{subtitle}</Text>
      )}

      <Body
        className="flex-1"
        {...(scrollable && {
          contentContainerClassName: 'gap-3 pt-8 pb-4',
          showsVerticalScrollIndicator: false,
        })}>
        {children}
      </Body>

      <Pressable
        onPress={goNext}
        disabled={!canContinue}
        className={`mt-3 h-14 items-center justify-center rounded-xl active:opacity-80 ${
          canContinue ? 'bg-black' : 'bg-neutral-300'
        }`}>
        <Text className="text-[17px] font-semibold text-white">{buttonLabel ?? t('common.next')}</Text>
      </Pressable>
    </View>
  );
}

function ProgressDashes({ step }: { step: OnboardingStep }) {
  const index = QUESTION_STEPS.indexOf(step as (typeof QUESTION_STEPS)[number]);
  const reached = index === -1 ? QUESTION_STEPS.length : index + 1;

  return (
    <View className="flex-row gap-1">
      {QUESTION_STEPS.map((s, i) => (
        <View
          key={s}
          className={`h-[3px] w-4 rounded-full ${i < reached ? 'bg-black' : 'bg-neutral-200'}`}
        />
      ))}
    </View>
  );
}
