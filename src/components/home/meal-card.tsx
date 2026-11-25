import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';

import { MACROS } from '@/constants/macros';
import type { Meal } from '@/lib/meals';

const THUMBNAIL = 64;

/** One logged meal on Home: thumbnail, name, time, calories and macros. Analyzing and failed meals get their own look. */
export function MealCard({ meal }: { meal: Meal }) {
  const { t, i18n } = useTranslation();
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 });
  const time = new Intl.DateTimeFormat(i18n.language, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(meal.loggedAt)
  );

  return (
    <View className="flex-row items-center rounded-2xl border-[1.5px] border-neutral-200 bg-white p-3">
      <View
        style={{ width: THUMBNAIL, height: THUMBNAIL }}
        className="items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
        {/* A 200×200 ImageKit crop, never the original upload. */}
        {meal.thumbnailUrl ? (
          <Image
            source={{ uri: meal.thumbnailUrl }}
            style={{ width: THUMBNAIL, height: THUMBNAIL, opacity: meal.status === 'completed' ? 1 : 0.5 }}
            contentFit="cover"
            transition={200}
            recyclingKey={meal.id}
          />
        ) : (
          <SymbolView name={{ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }} size={20} tintColor="#a3a3a3" />
        )}
        {meal.status === 'analyzing' && (
          <View className="absolute inset-0 items-center justify-center">
            <ActivityIndicator color="#000" />
          </View>
        )}
      </View>

      <View className="ml-3 flex-1">
        {meal.status === 'completed' && (
          <>
            <View className="flex-row items-start justify-between gap-2">
              <Text className="flex-1 text-[15px] font-semibold text-black" numberOfLines={1}>
                {meal.name}
              </Text>
              <Text className="text-xs text-neutral-400">{time}</Text>
            </View>

            <View className="mt-1 flex-row items-center gap-1">
              <SymbolView
                name={{ ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }}
                size={13}
                tintColor="#000"
              />
              <Text className="text-[15px] font-bold text-black">
                {number.format(meal.calories)} {t('scan.kcal')}
              </Text>
            </View>

            <View className="mt-1.5 flex-row items-center gap-3">
              {MACROS.map(({ key, targetKey, icon, color }) => (
                <View key={key} className="flex-row items-center gap-1">
                  <SymbolView name={icon} size={11} tintColor={color} />
                  <Text className="text-xs text-neutral-500">{number.format(meal[targetKey])}g</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {meal.status === 'analyzing' && (
          <>
            <Text className="text-[15px] font-semibold text-black">{t('home.meal.analyzing')}</Text>
            <View className="mt-2 gap-1.5">
              <View className="h-2 w-3/4 rounded-full bg-neutral-100" />
              <View className="h-2 w-1/2 rounded-full bg-neutral-100" />
            </View>
          </>
        )}

        {meal.status === 'failed' && (
          <>
            <View className="flex-row items-start justify-between gap-2">
              <Text className="flex-1 text-[15px] font-semibold text-black" numberOfLines={1}>
                {meal.errorCode === 'NOT_FOOD' ? t('home.meal.notFood') : t('home.meal.failed')}
              </Text>
              <Text className="text-xs text-neutral-400">{time}</Text>
            </View>
            <Text className="mt-1 text-xs leading-4 text-neutral-500">{t('home.meal.failedHint')}</Text>
          </>
        )}
      </View>
    </View>
  );
}
