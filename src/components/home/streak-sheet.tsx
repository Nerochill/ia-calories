import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

export const STREAK_COLOR = '#FF5A00';

type Props = {
  visible: boolean;
  streak: number;
  onClose: () => void;
};

/** Bottom sheet celebrating the user's streak: fading backdrop, sliding sheet, pulsing flame. */
export function StreakSheet({ visible, streak, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // 0 = hidden, 1 = fully shown. Drives the backdrop fade and the sheet slide together.
  const progress = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!visible) return;
    progress.set(withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }));
    pulse.set(
      withRepeat(
        withSequence(
          withTiming(1.12, { duration: 650, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) })
        ),
        -1
      )
    );
    return () => cancelAnimation(pulse);
  }, [visible, progress, pulse]);

  // Animate out first, then let the parent unmount the modal.
  const close = () => {
    progress.set(
      withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(onClose);
      })
    );
  };

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.get(), [0, 1], [400, 0]) }],
  }));
  const flameStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));

  const hasStreak = streak > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={close}>
      <Animated.View className="absolute inset-0 bg-black/40" style={backdropStyle}>
        <Pressable className="flex-1" onPress={close} accessibilityLabel={t('common.close')} />
      </Animated.View>

      <View className="flex-1 justify-end" pointerEvents="box-none">
        <Animated.View
          className="items-center rounded-t-[32px] bg-white px-6 pt-3"
          style={[sheetStyle, { paddingBottom: insets.bottom + 16 }]}>
          <View className="h-1.5 w-10 rounded-full bg-neutral-200" />

          <View className="mt-8 h-28 w-28 items-center justify-center rounded-full bg-orange-50">
            <Animated.View style={flameStyle}>
              <SymbolView
                name={{ ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }}
                size={64}
                tintColor={STREAK_COLOR}
              />
            </Animated.View>
          </View>

          <Text className="mt-6 text-center text-[28px] font-bold leading-[34px] tracking-tight text-black">
            {hasStreak ? t('streak.title', { count: streak }) : t('streak.emptyTitle')}
          </Text>
          <Text className="mt-2 px-2 text-center text-[15px] leading-[21px] text-neutral-500">
            {hasStreak ? t('streak.body', { count: streak }) : t('streak.emptyBody')}
          </Text>

          <Pressable
            onPress={close}
            accessibilityRole="button"
            className="mt-8 h-14 w-full items-center justify-center rounded-xl bg-black active:opacity-80">
            <Text className="text-[17px] font-semibold text-white">{t('streak.button')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
