import { SymbolView } from 'expo-symbols';
import { Children, isValidElement, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { OptionIcon } from '@/components/onboarding/option-card';

/** Page background behind the white setting cards. */
export const SETTINGS_BACKGROUND = '#f5f5f7';

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.04,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
};

const CHEVRON: OptionIcon = { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' };

/**
 * A white rounded card, optionally under a section heading. Rows inside get hairline dividers,
 * indented past the icons unless `plain` (rows without icons).
 */
export function SettingsSection({ title, plain, children }: { title?: string; plain?: boolean; children: ReactNode }) {
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View className="mt-6">
      {title && <Text className="mb-2 px-1 text-[15px] font-semibold text-neutral-500">{title}</Text>}
      <View className="overflow-hidden rounded-2xl bg-white" style={CARD_SHADOW}>
        {rows.map((row, i) => (
          <View key={row.key ?? i}>
            {i > 0 && <View className={`h-px bg-neutral-100 ${plain ? 'ml-4' : 'ml-[52px]'}`} />}
            {row}
          </View>
        ))}
      </View>
    </View>
  );
}

type SettingsRowProps = {
  label: string;
  icon?: OptionIcon;
  /** Secondary text shown on the right, before the chevron. */
  value?: string;
  onPress?: () => void;
  /** Shows a chevron, for rows that open another page. */
  chevron?: boolean;
  destructive?: boolean;
  loading?: boolean;
  /** Replaces the value/chevron, e.g. a checkmark. */
  accessory?: ReactNode;
};

export function SettingsRow({ label, icon, value, onPress, chevron, destructive, loading, accessory }: SettingsRowProps) {
  const color = destructive ? '#dc2626' : '#000';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || loading}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={loading ? { busy: true, disabled: true } : undefined}
      className="min-h-[54px] flex-row items-center px-4 py-3 active:bg-neutral-50">
      {icon && (
        <View className="mr-3 w-6 items-center">
          <SymbolView name={icon} size={20} tintColor={color} />
        </View>
      )}
      <Text className="flex-1 text-[16px] font-medium" style={{ color }} numberOfLines={1}>
        {label}
      </Text>
      {value != null && (
        <Text className="ml-3 max-w-[55%] text-right text-[15px] text-neutral-500" numberOfLines={1}>
          {value}
        </Text>
      )}
      {loading ? (
        <ActivityIndicator className="ml-2" color={color} />
      ) : (
        accessory ??
        (chevron && (
          <View className="ml-2">
            <SymbolView name={CHEVRON} size={14} tintColor="#a3a3a3" weight="semibold" />
          </View>
        ))
      )}
    </Pressable>
  );
}

/** A row in a single-choice list, checked when selected. */
export function ChoiceRow({ label, hint, selected, onPress }: { label: string; hint?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      className="min-h-[54px] flex-row items-center px-4 py-3 active:bg-neutral-50">
      <View className="flex-1">
        <Text className="text-[16px] font-medium text-black">{label}</Text>
        {hint && <Text className="mt-0.5 text-[13px] text-neutral-500">{hint}</Text>}
      </View>
      {selected && (
        <SymbolView
          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
          size={18}
          tintColor="#000"
          weight="semibold"
        />
      )}
    </Pressable>
  );
}
