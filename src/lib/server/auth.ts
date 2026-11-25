import { createClerkClient } from '@clerk/backend';

export const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
});

/**
 * The Clerk user id from the request's `Authorization: Bearer <session token>` header,
 * or null when the token is missing, expired or invalid. Server-only.
 */
async function getClerkUserId(request: Request): Promise<string | null> {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error(
      'CLERK_SECRET_KEY is not set. Add it to .env (Clerk dashboard → API keys) and restart `npx expo start`.'
    );
  }

  const state = await clerk.authenticateRequest(request, { acceptsToken: 'session_token' });
  if (!state.isAuthenticated) {
    console.warn(`[api] ${request.method} ${new URL(request.url).pathname} unauthorized: ${state.reason}`);
    return null;
  }
  return state.toAuth().userId;
}

type AuthedHandler = (request: Request, clerkUserId: string) => Promise<Response>;

/**
 * Wraps an API route handler: rejects unauthenticated requests with 401, and turns any
 * thrown error into a logged JSON 500 (with the message in development) instead of a crash.
 */
export function withAuth(handler: AuthedHandler) {
  return async (request: Request) => {
    try {
      const clerkUserId = await getClerkUserId(request);
      if (!clerkUserId) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
      return await handler(request, clerkUserId);
    } catch (err) {
      console.error(`[api] ${request.method} ${new URL(request.url).pathname} failed:`, err);
      const message = process.env.NODE_ENV === 'production' ? undefined : String((err as Error)?.message ?? err);
      return Response.json({ error: 'SERVER_ERROR', message }, { status: 500 });
    }
  };
}
