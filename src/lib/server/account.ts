import { eq } from 'drizzle-orm';

import { users, withDb, type Db } from '@/db';
import { clerk } from '@/lib/server/auth';
import { deleteUserFolder } from '@/lib/server/imagekit';

/**
 * Deletes a user's uploads, then their `users` row (which cascades to the profile, meals
 * and meal items). Uploads go first, so if that fails the row is still there to retry from.
 * Used by account deletion and by the Clerk `user.deleted` webhook (e.g. a user removed
 * from the Clerk dashboard).
 */
export async function deleteUserData(db: Db, clerkUserId: string) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.clerkUserId, clerkUserId));
  // No row means nothing was ever uploaded: the upload folder is keyed by this id.
  if (!user) return;

  await deleteUserFolder(user.id);
  await db.delete(users).where(eq(users.id, user.id));
}

/**
 * Permanently deletes an account: every photo in ImageKit, the Clerk user, and all
 * database rows.
 * Photos go first, so a failure there leaves the account intact to retry.
 * If a later step fails, the Clerk `user.deleted` webhook finishes the cleanup.
 */
export async function deleteAccount(clerkUserId: string) {
  const [user] = await withDb((db) =>
    db.select({ id: users.id }).from(users).where(eq(users.clerkUserId, clerkUserId))
  );
  if (user) await deleteUserFolder(user.id);

  try {
    await clerk.users.deleteUser(clerkUserId);
  } catch (err) {
    // Already deleted in Clerk (e.g. a retry after a partial failure).
    if ((err as { status?: number })?.status !== 404) throw err;
  }

  // Repeats the (now empty) folder delete, which is a no-op.
  await withDb((db) => deleteUserData(db, clerkUserId));
}
