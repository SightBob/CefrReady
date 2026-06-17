import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth-utils';
import { submitAttempt } from '@/lib/full-test/submit-attempt';
import { validateOrigin, checkIpThrottle, checkUserRateLimit } from '@/lib/api-security';

const bodySchema = z.object({ attemptId: z.number() });

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const originError = validateOrigin(request);
  if (originError) return originError;

  const ipThrottleError = await checkIpThrottle(request, { keySuffix: 'full-submit' });
  if (ipThrottleError) return ipThrottleError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitError = await checkUserRateLimit(user.id, { windowMs: 60_000, maxRequests: 10, keySuffix: 'submit' });
  if (rateLimitError) return rateLimitError;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await submitAttempt(parsed.data.attemptId, user.id);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 404 });
  }
}