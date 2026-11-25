import { useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

const TICK_SPACING = 10;

type Props = {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  /** Show a label every N steps. */
  labelEvery: number;
  formatLabel?: (value: number) => string;
  /** The large value shown above the ruler. */
  formatValue: (value: number) => string;
  unit?: string;
};

/** Vertical scrolling ruler; higher values sit at the top, like the design. */
export function RulerPicker({
  min,
  max,
  step,
  value,
  onChange,
  labelEvery,
  formatLabel = String,
  formatValue,
  unit,
}: Props) {
  const [height, setHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const didScrollToInitial = useRef(false);

  const count = Math.round((max - min) / step) + 1;
  const indexToValue = (i: number) => Number((max - i * step).toFixed(2));
  const clampIndex = (i: number) => Math.min(Math.max(i, 0), count - 1);

  // Memoized so scrolling (which re-renders with a new value) doesn't rebuild hundreds of ticks.
  const ticks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const tickValue = Number((max - i * step).toFixed(2));
        const isLabel = Math.round((tickValue - min) / step) % labelEvery === 0;
        return (
          <View key={i} style={{ height: TICK_SPACING }} className="items-center justify-center">
            <View className={`h-[1.5px] rounded-full bg-neutral-300 ${isLabel ? 'w-5' : 'w-3'}`} />
            {isLabel && (
              <View className="absolute left-1/2 ml-12 h-5 justify-center" style={{ top: -5 }}>
                <Text className="text-[13px] text-neutral-500">{formatLabel(tickValue)}</Text>
              </View>
            )}
          </View>
        );
      }),
    [count, max, min, step, labelEvery, formatLabel]
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = indexToValue(clampIndex(Math.round(e.nativeEvent.contentOffset.y / TICK_SPACING)));
    if (next !== value) onChange(next);
  };

  const scrollToInitial = () => {
    if (didScrollToInitial.current) return;
    didScrollToInitial.current = true;
    const y = clampIndex(Math.round((max - value) / step)) * TICK_SPACING;
    scrollRef.current?.scrollTo({ y, animated: false });
  };

  return (
    <View className="flex-1">
      <View className="mt-6 flex-row items-baseline justify-center">
        <Text className="text-[44px] font-semibold tracking-tight text-black">{formatValue(value)}</Text>
        {unit && <Text className="ml-1.5 text-base text-neutral-500">{unit}</Text>}
      </View>

      <View
        className="mt-4 flex-1"
        onLayout={(e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height)}>
        {height > 0 && (
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            snapToInterval={TICK_SPACING}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScroll={onScroll}
            onContentSizeChange={scrollToInitial}
            contentContainerStyle={{ paddingVertical: height / 2 - TICK_SPACING / 2 }}>
            {ticks}
          </ScrollView>
        )}

        {/* Fixed selection indicator across the middle of the ruler. */}
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 items-center justify-center"
          style={{ top: height / 2 - 8, height: 16 }}>
          <View className="h-[1.5px] w-[88px] bg-black" />
          <View className="absolute h-4 w-4 rounded-full bg-black" />
        </View>
      </View>
    </View>
  );
}
