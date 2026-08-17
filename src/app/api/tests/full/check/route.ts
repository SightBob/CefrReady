import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { testAttempts, questions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
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

  const ipThrottleError = await checkIpThrottle(request, { keySuffix: 'full-check' });
  if (ipThrottleError) return ipThrottleError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitError = await checkUserRateLimit(user.id, { windowMs: 60_000, maxRequests: 60, keySuffix: 'check' });
  if (rateLimitError) return rateLimitError;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { attemptId, questionId } = parsed.data;

  const [attempt] = await db
    .select({ id: testAttempts.id, status: testAttempts.status })
    .from(testAttempts)
    .where(and(eq(testAttempts.id, attemptId), eq(testAttempts.userId, user.id)));

  if (!attempt || attempt.status !== 'in_progress') {
    return NextResponse.json({ success: false, error: 'Attempt not found' }, { status: 404 });
  }

  const [question] = await db
    .select({
      id: questions.id,
      testTypeId: questions.testTypeId,
      correctAnswer: questions.correctAnswer,
      article: questions.article,
    })
    .from(questions)
    .where(eq(questions.id, questionId));

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
