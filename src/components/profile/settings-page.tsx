import type { ReactNode } from 'react';
import { ScrollView, Text } from 'react-native';

/** Scrollable body for a page pushed from the profile, under the stack's native header. */
export function SettingsPage({ footer, children }: { footer?: string; children: ReactNode }) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-5 pb-8"
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}>
      {children}
      {footer && <Text className="mt-3 px-1 text-[13px] leading-[18px] text-neutral-500">{footer}</Text>}
    </ScrollView>
  );
}
