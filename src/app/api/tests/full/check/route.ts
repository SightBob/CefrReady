import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { testAttempts, questions, questionSelectionLogs } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { validateOrigin, checkIpThrottle, checkUserRateLimit } from '@/lib/api-security';
import { canRevealAnswer } from '@/lib/full-test/reveal-guard';

const bodySchema = z.object({
  attemptId: z.number().int(),
  questionId: z.number().int(),
});

export const dynamic = 'force-dynamic';

// Reveals the answer key for a single question AFTER the user has committed a
// selection client-side (options lock on reveal). Pre-submission guards:
// 1. attempt must belong to the caller and be in progress
// 2. the question must be the one the attempt is actually on — otherwise a
//    signed-in learner could walk the whole question bank through this endpoint
//    and collect answer keys without ever sitting the exam (see reveal-guard.ts).
export async function POST(request: NextRequest) {
  const originError = validateOrigin(request);
  if (originError) return originError;

  // JWT session carries user.id — skips a users-table round trip per request.
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { attemptId, questionId } = parsed.data;

  // This endpoint hands out answer keys, so the throttle deliberately stays
  // FIRST: a throttled caller must not be able to make the database work.
  const [ipThrottleError, rateLimitError] = await Promise.all([
    checkIpThrottle(request, { keySuffix: 'full-check' }),
    checkUserRateLimit(userId, { windowMs: 60_000, maxRequests: 60, keySuffix: 'check' }),
  ]);
  if (ipThrottleError) return ipThrottleError;
  if (rateLimitError) return rateLimitError;

  // Attempt, question and latest selection log are independent reads — all
  // three travel in one round-trip window.
  const [[attempt], [question], [latestSelection]] = await Promise.all([
    db
      .select({
        id: testAttempts.id,
        status: testAttempts.status,
        // Only the LENGTH of adaptivePath is needed by the guard;
        // jsonb_array_length keeps the (multi-KB) JSONB payload inside Postgres.
        answeredCount: sql<number>`jsonb_array_length(coalesce(${testAttempts.adaptivePath}, '[]'::jsonb))`,
      })
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
    // The newest selection log row for this attempt IS the question the learner
    // is looking at — test_attempts has no currentQuestionId column.
    db
      .select({ questionId: questionSelectionLogs.questionId })
      .from(questionSelectionLogs)
      .where(eq(questionSelectionLogs.attemptId, attemptId))
      .orderBy(desc(questionSelectionLogs.createdAt), desc(questionSelectionLogs.id))
      .limit(1),
  ]);

  if (!attempt || attempt.status !== 'in_progress') {
    return NextResponse.json({ success: false, error: 'Attempt not found' }, { status: 404 });
  }

  if (!question) {
    return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 });
  }

  // SECURITY: reveal only the answer of the question the attempt is currently
  // on, so the bank cannot be harvested question by question.
  const guard = canRevealAnswer({
    requestedQuestionId: questionId,
    latestSelectedQuestionId: latestSelection?.questionId ?? null,
    requestedTestTypeId: question.testTypeId,
    answeredCount: Number(attempt.answeredCount ?? 0),
  });
  if (!guard.allowed) {
    return NextResponse.json(
      { success: false, error: 'Answer key is not available for this question' },
      { status: 403 }
    );
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
