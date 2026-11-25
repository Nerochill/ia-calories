import { withDb } from '@/db';
import { withAuth } from '@/lib/server/auth';
import { createUploadAuth } from '@/lib/server/imagekit';
import { findMealOwner } from '@/lib/server/meals';

/** Signed params for uploading one meal photo straight to ImageKit, into the user's folder. */
export const GET = withAuth(async (_request, clerkUserId) => {
  const owner = await withDb((db) => findMealOwner(db, clerkUserId));
  if (!owner) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });

  return Response.json(await createUploadAuth(owner.id));
});
