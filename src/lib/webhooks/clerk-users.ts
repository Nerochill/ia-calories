import type { DeletedObjectJSON, User } from '@clerk/backend';

import { users, type Db } from '@/db';
import { deleteUserData } from '@/lib/server/account';
import { clerk } from '@/lib/server/auth';

function primaryEmail(user: User) {
  return (user.primaryEmailAddress ?? user.emailAddresses[0])?.emailAddress ?? null;
}

/**
 * The user as Clerk has them now, or null if they've been deleted. Clerk doesn't deliver
 * webhooks in order, so the payload may be stale: a retried `user.updated` can arrive
 * after `user.deleted`, or after a newer update.
 */
async function currentUser(clerkUserId: string) {
  try {
    return await clerk.users.getUser(clerkUserId);
  } catch (err) {
    if ((err as { status?: number })?.status === 404) return null;
    throw err;
  }
}

// Created and updated are handled alike: upsert on clerk_user_id with Clerk's latest
// state, so retried or out-of-order deliveries are safe, a row already created by
// POST /api/onboarding just gets its email filled in, and a late event never brings
// back a deleted user.
async function syncUser(db: Db, clerkUserId: string) {
  const user = await currentUser(clerkUserId);
  if (!user) return;

  const email = primaryEmail(user);
  await db
    .insert(users)
    .values({ clerkUserId, email })
    .onConflictDoUpdate({ target: users.clerkUserId, set: { email } });
}

export async function handleUserCreated(db: Db, clerkUserId: string) {
  await syncUser(db, clerkUserId);
}

export async function handleUserUpdated(db: Db, clerkUserId: string) {
  await syncUser(db, clerkUserId);
}

/** Removes the user's photos and rows (cascading to their profile, meals and meal items). */
export async function handleUserDeleted(db: Db, deleted: DeletedObjectJSON) {
  if (!deleted.id) return;
  await deleteUserData(db, deleted.id);
}
