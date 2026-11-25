import { calculateStreak } from '@/lib/streak';

/**
 * The user's current meal-logging streak, in days.
 *
 * TODO: feed this the `local_date`s of the user's non-failed meals once the meals API
 * exists (it needs a recent range, not just one day). Until then there are no logged
 * meals, so the streak is always 0.
 */
export function useStreak() {
  const loggedDates: string[] = [];
  return calculateStreak(loggedDates, new Date());
}
