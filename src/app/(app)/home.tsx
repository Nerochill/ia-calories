import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MealCard } from '@/components/home/meal-card';
import { STREAK_COLOR, StreakSheet } from '@/components/home/streak-sheet';
import { WeekStrip } from '@/components/home/week-strip';
import { ProgressRing } from '@/components/ui/progress-ring';
import { MACROS } from '@/constants/macros';
import { useMealsQuery } from '@/hooks/use-meals';
import { useProfile } from '@/hooks/use-profile';
import { useStreak } from '@/hooks/use-streak';
import { isSameDay, toLocalDate } from '@/lib/dates';

type Mode = 'left' | 'eaten' | 'over';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const targets = useProfile()?.targets ?? null;
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showEaten, setShowEaten] = useState(false);

  const streak = useStreak();
  const [streakOpen, setStreakOpen] = useState(false);

  const mealsQuery = useMealsQuery(toLocalDate(selectedDate));
  const meals = mealsQuery.data ?? [];
  // Only analyzed meals count; analyzing and failed ones have no numbers yet.
  const eaten = meals
    .filter((meal) => meal.status === 'completed')
    .reduce(
      (sum, meal) => ({
        calories: sum.calories + meal.calories,
        proteinG: sum.proteinG + meal.proteinG,
        carbsG: sum.carbsG + meal.carbsG,
        fatG: sum.fatG + meal.fatG,
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    );

  const isToday = isSameDay(selectedDate, new Date());
  const number = new Intl.NumberFormat(i18n.language);

  /** The number to show for a target and which label goes with it. */
  const display = (target: number | undefined, consumed: number): { value: string; mode: Mode } => {
    if (showEaten) return { value: number.format(Math.round(consumed)), mode: 'eaten' };
    if (target == null) return { value: '—', mode: 'left' };
    const remaining = Math.round(target - consumed);
    return { value: number.format(Math.abs(remaining)), mode: remaining < 0 ? 'over' : 'left' };
  };

  const calories = display(targets?.calories, eaten.calories);

  return (
    // The padded wrapper keeps the ScrollView below the status bar, so the native tabs'
    // automatic content inset only has to account for the tab bar.
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8"
        showsVerticalScrollIndicator={false}>
        <View className="h-14 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Image source={require('@/assets/images/logo.png')} style={{ width: 28, height: 28 }} />
            <Text className="text-[22px] font-bold tracking-tight text-black">IA Calories</Text>
          </View>

          <Pressable
            onPress={() => setStreakOpen(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('streak.badge', { count: streak })}
            className="flex-row items-center gap-1.5 rounded-full border-[1.5px] border-neutral-200 px-3 py-1.5 active:opacity-60">
            <SymbolView
              name={{ ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }}
              size={14}
              tintColor={STREAK_COLOR}
            />
            <Text className="text-[15px] font-semibold text-black">{streak}</Text>
          </Pressable>
        </View>

        <View className="mt-2">
          <WeekStrip selected={selectedDate} onSelect={setSelectedDate} />
        </View>

        <Pressable
          onPress={() => setShowEaten((v) => !v)}
          accessibilityRole="button"
          accessibilityHint={t('home.toggleHint')}
          className="mt-4 flex-row items-center rounded-3xl border-[1.5px] border-neutral-200 bg-white p-5 active:opacity-80">
          <View className="flex-1">
            <Text className="text-[44px] font-bold tracking-tight text-black">{calories.value}</Text>
            <View className="flex-row items-center gap-1">
              <Text className="text-[15px] text-neutral-500">{t(`home.calories.${calories.mode}`)}</Text>
              <SymbolView
                name={{ ios: 'arrow.up.arrow.down', android: 'swap_vert', web: 'swap_vert' }}
                size={12}
                tintColor="#a3a3a3"
              />
            </View>
          </View>

          <ProgressRing
            size={104}
            strokeWidth={9}
            progress={targets ? eaten.calories / targets.calories : 0}
            color={calories.mode === 'over' ? '#ef4444' : '#000'}>
            <View className="h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
              <SymbolView
                name={{ ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }}
                size={24}
                tintColor="#000"
              />
            </View>
          </ProgressRing>
        </Pressable>

        <View className="mt-3 flex-row gap-3">
          {MACROS.map(({ key, targetKey, icon, color }) => {
            const target = targets?.[targetKey];
            const consumed = eaten[targetKey];
            const { value, mode } = display(target, consumed);
            const progress = target ? Math.min(consumed / target, 1) : 0;

            return (
              <Pressable
                key={key}
                onPress={() => setShowEaten((v) => !v)}
                className="flex-1 rounded-2xl border-[1.5px] border-neutral-200 bg-white p-3.5 active:opacity-80">
                <Text className="text-lg font-bold text-black">
                  {value}
                  {value !== '—' && 'g'}
                </Text>
                <Text className="mt-0.5 text-xs text-neutral-500" numberOfLines={1}>
                  {t(`home.${key}.${mode}`)}
                </Text>

                <View className="mt-4 flex-row items-center gap-2">
                  <SymbolView name={icon} size={14} tintColor={color} />
                  <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                    <View
                      className="h-full rounded-full"
                      style={{ width: `${progress * 100}%`, backgroundColor: mode === 'over' ? '#ef4444' : color }}
                    />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text className="mt-8 text-xl font-bold tracking-tight text-black">
          {isToday
            ? t('home.todayMeals')
            : new Intl.DateTimeFormat(i18n.language, { weekday: 'long', month: 'short', day: 'numeric' }).format(
                selectedDate
              )}
        </Text>

        {mealsQuery.isPending ? (
          <ActivityIndicator className="mt-8" color="#000" />
        ) : mealsQuery.isError ? (
          <Pressable onPress={() => mealsQuery.refetch()} className="mt-3 items-center rounded-3xl bg-neutral-50 p-6">
            <Text className="text-center text-sm leading-5 text-neutral-500">{t('home.mealsError')}</Text>
            <Text className="mt-2 text-sm font-semibold text-black">{t('common.retry')}</Text>
          </Pressable>
        ) : meals.length === 0 ? (
          <EmptyMeals isToday={isToday} />
        ) : (
          <View className="mt-3 gap-3">
            {meals.map((meal) => (
              <MealCard key={meal.id} meal={meal} />
            ))}
          </View>
        )}
      </ScrollView>

      {streakOpen && <StreakSheet visible streak={streak} onClose={() => setStreakOpen(false)} />}
    </View>
  );
}

function EmptyMeals({ isToday }: { isToday: boolean }) {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={() => router.navigate('/scan')}
      disabled={!isToday}
      accessibilityRole={isToday ? 'button' : undefined}
      className="mt-3 items-center rounded-3xl bg-neutral-50 px-6 py-6 active:opacity-80">
      <View className="w-full flex-row items-center rounded-2xl border-[1.5px] border-neutral-100 bg-white p-3">
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-neutral-100">
          <SymbolView
            name={{ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }}
            size={20}
            tintColor="#a3a3a3"
          />
        </View>
        <View className="ml-3 flex-1 gap-2">
          <View className="h-2.5 w-3/4 rounded-full bg-neutral-100" />
          <View className="h-2.5 w-1/2 rounded-full bg-neutral-100" />
        </View>
      </View>

      <Text className="mt-4 text-center text-sm leading-5 text-neutral-500">
        {isToday ? t('home.emptyToday') : t('home.emptyPast')}
      </Text>
    </Pressable>
  );
}
