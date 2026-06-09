import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { testFeedback, testAttempts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
import { rateLimit, rateLimitResponse, getRateLimitIdentifier } from '@/lib/rate-limit';
import { z } from 'zod';

const feedbackBodySchema = z.object({
  attemptId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const rl = await rateLimit(getRateLimitIdentifier(request), { windowMs: 60_000, maxRequests: 10 });
  if (rl.limited) return rateLimitResponse(rl.retryAfterMs);

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = feedbackBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { attemptId, rating, comment } = parsed.data;

    const [attempt] = await db
      .select({ id: testAttempts.id, userId: testAttempts.userId })
      .from(testAttempts)
      .where(eq(testAttempts.id, attemptId))
      .limit(1);

    if (!attempt) {
      return NextResponse.json(
        { success: false, error: 'Test attempt not found' },
        { status: 404 }
      );
    }

    if (attempt.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const [feedback] = await db
      .insert(testFeedback)
      .values({
        attemptId,
        userId: user.id,
        rating,
        comment: comment?.trim() || null,
      })
      .onConflictDoUpdate({
        target: testFeedback.attemptId,
        set: {
          rating,
          comment: comment?.trim() || null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({ success: true, data: feedback });
  } catch (error) {
    console.error('[POST /api/tests/feedback] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
