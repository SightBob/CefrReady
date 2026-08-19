import { NextResponse } from 'next/server';
import { db } from '@/db';
import { testAttempts, questions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { checkIpThrottle, checkUserRateLimit } from '@/lib/api-security';
import { FULL_TEST_PART_DISTRIBUTION, FULL_TEST_TOTAL_QUESTIONS, FULL_TEST_TOTAL_SECONDS, type CefrLevel, type PerTypeLevels } from '@/lib/full-test/constants';
import { selectQuestion, getInitialLevels } from '@/lib/full-test/algorithm';
import { submitAttempt } from '@/lib/full-test/submit-attempt';
import { determineSelectionMode, logQuestionSelection } from '@/lib/full-test/log-selection';
import { sanitizeQuestionForClient } from '@/lib/sanitize-question';

// Adaptive selection only needs id/type/level metadata; heavy columns are
// fetched for the single selected question instead of the whole pool.
const poolSelection = { id: questions.id, testTypeId: questions.testTypeId, cefrLevel: questions.cefrLevel };

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const [ipThrottleError, rateLimitError] = await Promise.all([
    checkIpThrottle(request, { keySuffix: 'full-resume' }),
    checkUserRateLimit(userId, { windowMs: 60_000, maxRequests: 10, keySuffix: 'resume' }),
  ]);
  if (ipThrottleError) return ipThrottleError;
  if (rateLimitError) return rateLimitError;

  const [attempt] = await db
    .select()
    .from(testAttempts)
    .where(and(
      eq(testAttempts.userId, userId),
      eq(testAttempts.status, 'in_progress'),
      eq(testAttempts.testTypeId, 'full-test')
    ))
    .orderBy(sql`${testAttempts.startedAt} desc`)
    .limit(1);

  if (!attempt) {
    return NextResponse.json({ success: true, data: null });
  }

  const elapsedSeconds = Math.floor(
    (Date.now() - new Date(attempt.lastActivityAt ?? attempt.startedAt).getTime()) / 1000
  );
  const stored = Math.max(0, Math.min(FULL_TEST_TOTAL_SECONDS, attempt.timeRemainingSeconds ?? FULL_TEST_TOTAL_SECONDS));
  const realRemaining = stored - elapsedSeconds;

  if (realRemaining <= 0) {
    const result = await submitAttempt(attempt.id, userId);
    return NextResponse.json({ success: true, data: { expired: true, result } });
  }

  const path = (attempt.adaptivePath ?? []) as Array<{ questionId: number; testTypeId: string }>;
  const nextIndex = path.length;

  if (nextIndex >= FULL_TEST_TOTAL_QUESTIONS) {
    const result = await submitAttempt(attempt.id, userId);
    return NextResponse.json({ success: true, data: { completed: true, result } });
  }

  const nextPart = FULL_TEST_PART_DISTRIBUTION[nextIndex];
  const rawLevels = attempt.currentLevels as PerTypeLevels | null;
  const currentLevels: PerTypeLevels = (rawLevels && Object.keys(rawLevels).length > 0)
    ? rawLevels
    : getInitialLevels('B1');
  const nextTypeLevel = (currentLevels[nextPart] as CefrLevel) ?? 'B1';

  const seenIds = new Set(path.map((p) => p.questionId));
  const pool = await db
    .select(poolSelection)
    .from(questions)
    .where(and(eq(questions.testTypeId, nextPart), eq(questions.active, 'true')));

  const selection = selectQuestion({
    questions: pool,
    seenQuestionIds: seenIds,
    targetLevel: nextTypeLevel,
    requiredTestTypeId: nextPart,
  });

  if (!selection) {
    const result = await submitAttempt(attempt.id, userId);
    return NextResponse.json({ success: true, data: { completed: true, result, reason: 'pool_exhausted' } });
  }

  const selectionMode = determineSelectionMode(selection.reused, selection.question.cefrLevel, nextTypeLevel);

  const [questionRows] = await Promise.all([
    db.select().from(questions).where(eq(questions.id, selection.question.id)),
    logQuestionSelection({
      attemptId: attempt.id,
      testTypeId: nextPart,
      questionId: selection.question.id,
      targetLevel: nextTypeLevel,
      selectedLevel: selection.question.cefrLevel,
      mode: selectionMode,
    }),
  ]);
  const fullQuestion = questionRows[0];

  if (!fullQuestion) {
    return NextResponse.json({ success: false, error: 'Question not found' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      attemptId: attempt.id,
      // SECURITY: never send correctAnswer/explanation pre-submission (C3).
      question: sanitizeQuestionForClient(fullQuestion),
      questionIndex: nextIndex,
      timeRemaining: realRemaining,
      totalQuestions: FULL_TEST_PART_DISTRIBUTION.length,
    },
  });
}
