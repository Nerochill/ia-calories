import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

export type OptionIcon = Extract<SymbolViewProps['name'], { android?: unknown }>;

type Props = {
  title: string;
  description?: string;
  /** A symbol, or any custom node (e.g. a glyph). */
  icon?: OptionIcon | ReactNode;
  selected?: boolean;
  /** Omit for a static, non-selectable card. */
  onPress?: () => void;
  /** Taller card with a larger icon, used for two-option questions. */
  large?: boolean;
};

const isSymbol = (icon: Props['icon']): icon is OptionIcon =>
  typeof icon === 'object' && icon !== null && 'ios' in icon;

export function OptionCard({ title, description, icon, selected, onPress, large }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'radio' : undefined}
      accessibilityState={onPress ? { checked: selected } : undefined}
      className={`flex-row items-center rounded-2xl border-[1.5px] bg-white px-4 active:opacity-70 ${
        large ? 'h-[84px]' : 'min-h-[64px] py-3'
      } ${selected ? 'border-black' : 'border-neutral-200'}`}>
      {icon != null && (
        <View className={`items-center ${large ? 'mr-4 w-10' : 'mr-3.5 w-7'}`}>
          {isSymbol(icon) ? (
            <SymbolView name={icon} size={large ? 30 : 22} tintColor="#262626" />
          ) : (
            icon
          )}
        </View>
      )}

      <View className="flex-1">
        <Text className={`font-semibold text-black ${large ? 'text-base' : 'text-[15px]'}`}>
          {title}
        </Text>
        {description && (
          <Text className="mt-0.5 text-[13px] leading-[18px] text-neutral-500">{description}</Text>
        )}
      </View>

      {selected && (
        <View className="ml-3 h-6 w-6 items-center justify-center rounded-full bg-black">
          <SymbolView
            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
            size={14}
            tintColor="#fff"
          />
        </View>
      )}
    </Pressable>
  );
}
