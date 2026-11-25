import { withDb } from '@/db';
import { profilePatchSchema } from '@/lib/profile';
import { deleteAccount } from '@/lib/server/account';
import { withAuth } from '@/lib/server/auth';
import { findProfile, updatePreferences } from '@/lib/server/profiles';

/**
 * The signed-in user's profile, or `{ profile: null }` if they haven't finished onboarding.
 * That includes users with no `users` row yet (e.g. a missed Clerk webhook): onboarding
 * creates the row when it saves the profile.
 */
export const GET = withAuth(async (_request, clerkUserId) => {
  const profile = await withDb((db) => findProfile(db, clerkUserId));
  return Response.json({ profile });
});

/** Updates display preferences (units, language). */
export const PATCH = withAuth(async (request, clerkUserId) => {
  const parsed = profilePatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });
  }

  const profile = await withDb((db) => updatePreferences(db, clerkUserId, parsed.data));
  if (!profile) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  return Response.json({ profile });
});

/** Permanently deletes the account: meal photos, the Clerk user and all database rows. */
export const DELETE = withAuth(async (_request, clerkUserId) => {
  await deleteAccount(clerkUserId);
  return Response.json({ deleted: true });
});
