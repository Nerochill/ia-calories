import { useAuth } from '@clerk/expo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useApi } from '@/lib/api';
import type { MealsResponse } from '@/lib/meals';

/** While any meal is still analyzing, check back this often until it finishes. */
const ANALYZING_REFETCH_MS = 3000;

/** Keyed by Clerk user id so one account never sees another's cached meals. */
export const mealsQueryKey = (userId: string | null | undefined, date?: string) =>
  date ? (['meals', userId, date] as const) : (['meals', userId] as const);

/** GET /api/meals for one local day (YYYY-MM-DD), newest first. */
export function useMealsQuery(date: string) {
  const { isSignedIn, userId } = useAuth();
  const api = useApi();

  return useQuery({
    queryKey: mealsQueryKey(userId, date),
    queryFn: async () => (await api<MealsResponse>(`/api/meals?date=${date}`)).meals,
    enabled: !!isSignedIn,
    refetchInterval: (query) =>
      query.state.data?.some((meal) => meal.status === 'analyzing') ? ANALYZING_REFETCH_MS : false,
  });
}

/** Marks every day's meals stale, e.g. after a scan adds or finishes one. Stable across renders. */
export function useInvalidateMeals() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: mealsQueryKey(userId) }),
    [queryClient, userId]
  );
}
