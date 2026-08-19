import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { testAttempts, questions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { validateOrigin, checkIpThrottle, checkUserRateLimit } from '@/lib/api-security';

const bodySchema = z.object({
  attemptId: z.number().int(),
  questionId: z.number().int(),
});

export const dynamic = 'force-dynamic';

// Reveals the answer key for a single question AFTER the user has committed a
// selection client-side (options lock on reveal). Only pre-submission guard:
// attempt must belong to the caller and be in progress.
export async function POST(request: NextRequest) {
  const originError = validateOrigin(request);
  if (originError) return originError;

  // JWT session carries user.id — skips a users-table round trip per request.
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const [ipThrottleError, rateLimitError] = await Promise.all([
    checkIpThrottle(request, { keySuffix: 'full-check' }),
    checkUserRateLimit(userId, { windowMs: 60_000, maxRequests: 60, keySuffix: 'check' }),
  ]);
  if (ipThrottleError) return ipThrottleError;
  if (rateLimitError) return rateLimitError;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { attemptId, questionId } = parsed.data;

  // Attempt ownership check and question fetch are independent — run both in
  // one round trip window.
  const [attemptRows, questionRows] = await Promise.all([
    db
      .select({ id: testAttempts.id, status: testAttempts.status })
      .from(testAttempts)
      .where(and(eq(testAttempts.id, attemptId), eq(testAttempts.userId, userId)))
      .limit(1),
    db
      .select({
        id: questions.id,
        testTypeId: questions.testTypeId,
        correctAnswer: questions.correctAnswer,
        article: questions.article,
      })
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1),
  ]);

  const attempt = attemptRows[0];
  const question = questionRows[0];

  if (!attempt || attempt.status !== 'in_progress') {
    return NextResponse.json({ success: false, error: 'Attempt not found' }, { status: 404 });
  }

  if (!question) {
    return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 });
  }

  if (question.testTypeId === 'form-meaning') {
    const art = question.article as { blanks?: Array<{ id: number; correctAnswer: string }> } | null;
    const blanks: Record<string, string> = {};
    art?.blanks?.forEach((b) => { blanks[String(b.id)] = b.correctAnswer; });
    return NextResponse.json({ success: true, data: { type: 'cloze', blanks } });
  }

  return NextResponse.json({
    success: true,
    data: { type: 'mcq', correctAnswer: question.correctAnswer ?? null },
  });
}
