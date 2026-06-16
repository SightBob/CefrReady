import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { testAttempts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateOrigin, checkRateLimit } from '@/lib/api-security';

const bodySchema = z.object({ attemptId: z.number() });

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const originError = validateOrigin(request);
  if (originError) return originError;

  const rateLimitError = await checkRateLimit(request, { windowMs: 60_000, maxRequests: 10, keySuffix: 'cancel' });
  if (rateLimitError) return rateLimitError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await db
    .update(testAttempts)
    .set({ status: 'cancelled' })
    .where(
      and(
        eq(testAttempts.id, parsed.data.attemptId),
        eq(testAttempts.userId, user.id),
        eq(testAttempts.status, 'in_progress')
      )
    )
    .returning();

  if (result.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Attempt not found or already completed' },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
