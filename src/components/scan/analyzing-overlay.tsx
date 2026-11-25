import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { STREAK_COLOR } from '@/components/home/streak-sheet';

/** The micro-steps shown while a meal is processed, in order. */
export type ScanStep = 'uploading' | 'identifying' | 'estimating' | 'finalizing';

const ACCENT = STREAK_COLOR;
const LOADER_SIZE = 96;

type Props = {
  photoUri: string;
  step: ScanStep;
  onCancel: () => void;
};

/**
 * Full-card processing state: the meal photo blurred under a frosted white layer, with a
 * card holding a spinning ring, a pulsing flame, and the current step fading in and out.
 */
export function AnalyzingOverlay({ photoUri, step, onCancel }: Props) {
  const { t } = useTranslation();

  return (
    <View className="mt-6 flex-1 overflow-hidden rounded-3xl bg-neutral-100">
      {/* Blurred so the meal stays recognizable underneath without competing with the card. */}
      <Image source={{ uri: photoUri }} style={{ flex: 1 }} contentFit="cover" blurRadius={18} />

      <View className="absolute inset-0 items-center justify-center bg-white/70 px-6">
        <Animated.View
          entering={FadeIn.duration(250)}
          className="w-full items-center rounded-3xl border border-neutral-100 bg-white px-6 pb-4 pt-8 shadow-sm"
          accessibilityRole="progressbar"
          accessibilityLabel={t('scan.analyzingTitle')}>
          <ScanLoader />

          <Text className="mt-6 text-[17px] font-semibold tracking-tight text-neutral-900">
            {t('scan.analyzingTitle')}
          </Text>

          {/* Fixed height so steps cross-fade in place instead of shifting the layout. */}
          <View className="mt-1.5 h-5 w-full items-center justify-center" accessibilityLiveRegion="polite">
            <Animated.View
              key={step}
              entering={FadeIn.duration(350)}
              exiting={FadeOut.duration(200)}
              className="absolute">
              <Text className="text-[13px] text-neutral-500">{t(`scan.steps.${step}`)}</Text>
            </Animated.View>
          </View>

          <StepDots step={step} />

          <Pressable onPress={onCancel} hitSlop={12} accessibilityRole="button" className="mt-6 py-1 active:opacity-50">
            <Text className="text-[14px] font-medium text-neutral-400">{t('scan.goBack')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

/** A thin accent arc orbiting a light track, around a gently pulsing flame. */
function ScanLoader() {
  const spin = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    spin.set(withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1));
    pulse.set(
      withRepeat(
        withSequence(
          withTiming(1.1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) })
        ),
        -1
      )
    );
    return () => {
      cancelAnimation(spin);
      cancelAnimation(pulse);
    };
  }, [spin, pulse]);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get() * 360}deg` }] }));
  const flameStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));

  return (
    <View style={{ width: LOADER_SIZE, height: LOADER_SIZE }} className="items-center justify-center">
      <View className="absolute inset-0 rounded-full border-[3px] border-neutral-100" />
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: LOADER_SIZE,
            height: LOADER_SIZE,
            borderRadius: LOADER_SIZE / 2,
            borderWidth: 3,
            borderColor: 'transparent',
            borderTopColor: ACCENT,
          },
          ringStyle,
        ]}
      />
      <Animated.View style={flameStyle} className="h-14 w-14 items-center justify-center rounded-full bg-neutral-50">
        <SymbolView
          name={{ ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }}
          size={26}
          tintColor={ACCENT}
        />
      </Animated.View>
    </View>
  );
}

const STEPS: ScanStep[] = ['uploading', 'identifying', 'estimating', 'finalizing'];

/** Four small dots: done steps in off-black, the current one as an accent pill. */
function StepDots({ step }: { step: ScanStep }) {
  const current = STEPS.indexOf(step);

  return (
    <View className="mt-5 flex-row items-center gap-1.5">
      {STEPS.map((s, index) => (
        <View
          key={s}
          className={`h-1.5 rounded-full ${index === current ? 'w-5' : 'w-1.5'} ${
            index < current ? 'bg-neutral-900' : index === current ? '' : 'bg-neutral-200'
          }`}
          style={index === current ? { backgroundColor: ACCENT } : undefined}
        />
      ))}
    </View>
  );
}
