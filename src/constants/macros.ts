import type { OptionIcon } from '@/components/onboarding/option-card';
import type { Targets } from '@/lib/nutrition/targets';

export type Macro = 'protein' | 'carbs' | 'fat';

/** Display order, icon and accent color for each macro. */
export const MACROS: { key: Macro; targetKey: Exclude<keyof Targets, 'calories'>; icon: OptionIcon; color: string }[] = [
  { key: 'protein', targetKey: 'proteinG', icon: { ios: 'fish.fill', android: 'set_meal', web: 'set_meal' }, color: '#ef4444' },
  { key: 'carbs', targetKey: 'carbsG', icon: { ios: 'leaf.fill', android: 'grass', web: 'grass' }, color: '#eab308' },
  { key: 'fat', targetKey: 'fatG', icon: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' }, color: '#f59e0b' },
];
