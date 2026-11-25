import { addDays, toLocalDate } from '@/lib/dates';

/**
 * Consecutive days, ending today, with at least one non-failed meal.
 * A day with nothing logged yet doesn't break the streak until it's over, so when
 * today is empty the count starts from yesterday.
 *
 * @param loggedDates `local_date` values (YYYY-MM-DD) of the user's non-failed meals.
 */
export function calculateStreak(loggedDates: Iterable<string>, today: Date): number {
  const days = new Set(loggedDates);
  let day = days.has(toLocalDate(today)) ? today : addDays(today, -1);
  let streak = 0;

  while (days.has(toLocalDate(day))) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}
