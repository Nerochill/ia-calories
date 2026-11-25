import { withDb } from '@/db';
import { onboardingInputSchema } from '@/lib/profile';
import { withAuth } from '@/lib/server/auth';
import { generateTargets } from '@/lib/server/openai-targets';
import { saveOnboarding } from '@/lib/server/profiles';

/** Saves the onboarding answers with AI-generated daily targets, and returns the profile. */
export const POST = withAuth(async (request, clerkUserId) => {
  const parsed = onboardingInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'INVALID_INPUT', issues: parsed.error.issues }, { status: 400 });
  }

  let targets;
  try {
    targets = await generateTargets(parsed.data);
  } catch (err) {
    console.error('[api] POST /api/onboarding generating targets failed:', err);
    return Response.json({ error: 'AI_ERROR' }, { status: 502 });
  }

  const profile = await withDb((db) => saveOnboarding(db, clerkUserId, parsed.data, targets));
  return Response.json({ profile });
});
