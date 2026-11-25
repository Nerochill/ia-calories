import { verifyWebhook } from '@clerk/backend/webhooks';

import { withDb } from '@/db';
import {
  handleUserCreated,
  handleUserDeleted,
  handleUserUpdated,
} from '@/lib/webhooks/clerk-users';

// Public route: the svix signature (checked against CLERK_WEBHOOK_SIGNING_SECRET) is the only auth.
export async function POST(request: Request) {
  let evt;
  try {
    evt = await verifyWebhook(request);
  } catch (err) {
    console.error('Clerk webhook verification failed:', err);
    return new Response('Verification failed', { status: 400 });
  }

  try {
    await withDb(async (db) => {
      switch (evt.type) {
        case 'user.created':
          return handleUserCreated(db, evt.data.id);
        case 'user.updated':
          return handleUserUpdated(db, evt.data.id);
        case 'user.deleted':
          return handleUserDeleted(db, evt.data);
      }
    });
  } catch (err) {
    // A non-2xx response makes Clerk (svix) retry the delivery.
    console.error(`Clerk webhook ${evt.type} failed:`, err);
    return new Response('Webhook handler failed', { status: 500 });
  }

  return new Response('OK', { status: 200 });
}
