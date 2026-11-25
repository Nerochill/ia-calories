import { useAuth } from '@clerk/expo';
import * as Sentry from '@sentry/react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Redirect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { MACROS } from '@/constants/macros';
import { profileQueryKey } from '@/hooks/use-profile';
import { ApiError, useApi } from '@/lib/api';
import { stepHref } from '@/lib/onboarding/steps';
import type { OnboardingInput, Profile } from '@/lib/profile';
import { toOnboardingInput, useOnboardingStore } from '@/stores/onboarding';

// Decorative dots around the avatar, as [left %, top px, color].
const CONFETTI: [number, number, string][] = [
  [12, 10, '#fca5a5'], [24, 64, '#fcd34d'], [8, 112, '#86efac'], [30, 132, '#c4b5fd'],
  [84, 14, '#86efac'], [72, 58, '#fca5a5'], [90, 96, '#c4b5fd'], [66, 128, '#fcd34d'],
  [20, 36, '#93c5fd'], [80, 140, '#93c5fd'],
];

/**
 * Signed in only. Sends the answers to POST /api/onboarding, which generates the daily
 * targets with AI and saves the profile, then reveals the saved targets.
 */
export default function PlanStep() {
  const { t, i18n } = useTranslation();
  const { isSignedIn, userId } = useAuth();
  const api = useApi();
  const queryClient = useQueryClient();
  const input = toOnboardingInput(useOnboardingStore());

  const generate = useMutation({
    mutationFn: async (body: OnboardingInput) => {
      const startedAt = Date.now();
      // The answers that shape the plan, without personal measurements.
      const context = { goal: body.goal, diet: body.diet, activity_level: body.activityLevel };
      try {
        const { profile } = await api<{ profile: Profile }>('/api/onboarding', { method: 'POST', body });
        Sentry.logger.info('Onboarding plan generated', {
          ...context,
          target_calories: profile.targets.calories,
          duration_ms: Date.now() - startedAt,
        });
        return profile;
      } catch (err) {
        Sentry.logger.error('Onboarding plan generation failed', {
          ...context,
          status: err instanceof ApiError ? err.status : 0,
          duration_ms: Date.now() - startedAt,
        });
        throw err;
      }
    },
  });

  useEffect(() => {
    if (isSignedIn && input && generate.isIdle) generate.mutate(input);
  });

  // Signed out (deep link): the plan is generated after sign-in.
  if (!isSignedIn) return <Redirect href={stepHref('preview')} />;
  // Unfinished questions. Once generated, the store is reset, so keep showing the result.
  if (!input && !generate.data) return <Redirect href={stepHref('language')} />;

  const profile = generate.data;

  // Handing the profile to the cache flips the root layout's guards to the app.
  const finish = () => {
    if (!profile) return;
    queryClient.setQueryData(profileQueryKey(userId), profile);
    useOnboardingStore.getState().reset();
  };

  return (
    <OnboardingScreen
      step="plan"
      hideHeader
      canContinue={!generate.isPending}
      buttonLabel={generate.isError ? t('common.retry') : t('common.continue')}
      onContinue={() => (generate.isError && input ? generate.mutate(input) : finish())}>
      <View className="h-40">
        {CONFETTI.map(([left, top, color], i) => (
          <View
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{ left: `${left}%`, top, backgroundColor: color }}
          />
        ))}
        <View className="mt-4 h-32 w-32 items-center justify-center self-center rounded-full bg-neutral-100">
          <Image source={require('@/assets/images/logo.png')} style={{ width: 84, height: 84 }} />
        </View>
      </View>

      {profile ? (
        <>
          <Text className="mt-4 text-center text-[22px] font-bold tracking-tight text-black">
            {t('onboarding.plan.title')}
          </Text>
          <Text className="mt-2 px-4 text-center text-sm leading-5 text-neutral-500">
            {t('onboarding.plan.subtitle')}
          </Text>

          <Text className="mt-6 text-center text-[44px] font-bold tracking-tight text-black">
            {new Intl.NumberFormat(i18n.language).format(profile.targets.calories)}
          </Text>
          <Text className="text-center text-base text-neutral-500">{t('onboarding.plan.perDay')}</Text>

          <View className="mt-6 flex-row rounded-2xl border-[1.5px] border-neutral-200 py-4">
            {MACROS.map(({ key, targetKey, icon, color }) => (
              <View key={key} className="flex-1 items-center">
                <SymbolView name={icon} size={22} tintColor={color} />
                <Text className="mt-2 text-[15px] font-semibold text-black">{profile.targets[targetKey]}g</Text>
                <Text className="mt-0.5 text-xs text-neutral-500">{t(`onboarding.plan.${key}`)}</Text>
              </View>
            ))}
          </View>

          <View className="mt-auto flex-row rounded-2xl bg-violet-50 p-4">
            <View className="mr-3 mt-1 h-3 w-3 items-center justify-center rounded-full bg-violet-200">
              <View className="h-1.5 w-1.5 rounded-full bg-violet-600" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-black">{t('onboarding.plan.noteTitle')}</Text>
              <Text className="mt-1 text-[13px] leading-[18px] text-neutral-600">
                {t('onboarding.plan.noteBody')}
              </Text>
            </View>
          </View>
        </>
      ) : generate.isError ? (
        <>
          <Text className="mt-4 text-center text-[22px] font-bold tracking-tight text-black">
            {t('onboarding.plan.errorTitle')}
          </Text>
          <Text className="mt-2 px-4 text-center text-sm leading-5 text-neutral-500">
            {t('onboarding.plan.errorBody')}
          </Text>
        </>
      ) : (
        <>
          <Text className="mt-4 text-center text-[22px] font-bold tracking-tight text-black">
            {t('onboarding.plan.generatingTitle')}
          </Text>
          <Text className="mt-2 px-4 text-center text-sm leading-5 text-neutral-500">
            {t('onboarding.plan.generatingBody')}
          </Text>
          <ActivityIndicator className="mt-8" color="#000" size="large" />
        </>
      )}
    </OnboardingScreen>
  );
}
