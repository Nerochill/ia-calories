import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, Text, View } from 'react-native';

import { addDays, isSameDay, startOfWeek, toLocalDate } from '@/lib/dates';

/** How many past weeks the strip can be swiped back to. */
const WEEKS_BACK = 12;

type Props = {
  selected: Date;
  onSelect: (date: Date) => void;
};

/** Sunday–Saturday day picker, one week per page; swipe right for earlier weeks. */
export function WeekStrip({ selected, onSelect }: Props) {
  const { i18n } = useTranslation();
  const [width, setWidth] = useState(0);

  const today = new Date();
  const thisWeek = startOfWeek(today);
  const weeks = Array.from({ length: WEEKS_BACK + 1 }, (_, i) => addDays(thisWeek, -7 * i));
  const weekday = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' });

  return (
    <View className="h-[76px]" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        // Inverted so the current week is the first page and older weeks sit to the left.
        <FlatList
          horizontal
          inverted
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          data={weeks}
          keyExtractor={toLocalDate}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          renderItem={({ item: weekStart }) => (
            <View className="flex-row justify-between" style={{ width }}>
              {Array.from({ length: 7 }, (_, i) => {
                const day = addDays(weekStart, i);
                const isSelected = isSameDay(day, selected);
                const isFuture = day > today;

                return (
                  <Pressable
                    key={i}
                    onPress={() => onSelect(day)}
                    disabled={isFuture}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected, disabled: isFuture }}
                    className={`w-[13.5%] items-center rounded-2xl border-[1.5px] py-2 active:opacity-60 ${
                      isSelected ? 'border-neutral-200 bg-white' : 'border-transparent'
                    }`}>
                    <Text
                      className={`text-xs font-medium capitalize ${
                        isFuture ? 'text-neutral-300' : 'text-neutral-500'
                      }`}>
                      {weekday.format(day).replace('.', '')}
                    </Text>
                    <View
                      className={`mt-1.5 h-9 w-9 items-center justify-center rounded-full border-[1.5px] ${
                        isSelected ? 'border-black' : 'border-dashed border-neutral-300'
                      }`}>
                      <Text
                        className={`text-sm font-semibold ${
                          isFuture ? 'text-neutral-300' : 'text-black'
                        }`}>
                        {day.getDate()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        />
      )}
    </View>
  );
}
