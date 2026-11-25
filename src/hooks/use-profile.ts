import { useAuth } from '@clerk/expo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useApi } from '@/lib/api';
import type { Profile, ProfilePatch } from '@/lib/profile';

/** Keyed by Clerk user id so one account never sees another's cached profile. */
export const profileQueryKey = (userId: string | null | undefined) => ['profile', userId] as const;

/** GET /api/profile. `data` is null when the user hasn't finished onboarding. */
export function useProfileQuery() {
  const { isSignedIn, userId } = useAuth();
  const api = useApi();

  return useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: async () => (await api<{ profile: Profile | null }>('/api/profile')).profile,
    enabled: !!isSignedIn,
  });
}

/**
 * The signed-in user's profile. Screens under (app) only render once it has loaded,
 * but it can briefly be undefined while signing out.
 */
export function useProfile(): Profile | undefined {
  return useProfileQuery().data ?? undefined;
}

/** PATCH /api/profile, applied to the cache optimistically. */
export function useUpdatePreferences() {
  const { userId } = useAuth();
  const api = useApi();
  const queryClient = useQueryClient();
  const key = profileQueryKey(userId);

  return useMutation({
    mutationFn: async (patch: ProfilePatch) =>
      (await api<{ profile: Profile }>('/api/profile', { method: 'PATCH', body: patch })).profile,
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Profile | null>(key);
      if (previous) queryClient.setQueryData<Profile>(key, { ...previous, ...patch });
      return { previous };
    },
    onError: (_err, _patch, context) => queryClient.setQueryData(key, context?.previous),
    onSuccess: (profile) => queryClient.setQueryData(key, profile),
  });
}

/**
 * DELETE /api/profile: permanently deletes the account (photos, Clerk user, all rows),
 * then signs out and drops the cached data. The root guards show the welcome screen.
 */
export function useDeleteAccount() {
  const { signOut } = useAuth();
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api<{ deleted: true }>('/api/profile', { method: 'DELETE' }),
    onSuccess: async () => {
      // The Clerk user is gone, so its session may already be revoked; clear it locally regardless.
      await signOut().catch((err) => console.warn('[profile] signOut after account deletion failed:', err));
      queryClient.clear();
    },
  });
}
