import { NextResponse } from 'next/server';
import { db } from '@/db';
import { testAttempts, questions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
import { checkIpThrottle, checkUserRateLimit } from '@/lib/api-security';
import { FULL_TEST_PART_DISTRIBUTION, FULL_TEST_TOTAL_QUESTIONS, FULL_TEST_TOTAL_SECONDS, type CefrLevel, type PerTypeLevels } from '@/lib/full-test/constants';
import { selectQuestion, getInitialLevels } from '@/lib/full-test/algorithm';
import { submitAttempt } from '@/lib/full-test/submit-attempt';
import { determineSelectionMode, logQuestionSelection } from '@/lib/full-test/log-selection';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const ipThrottleError = await checkIpThrottle(request, { keySuffix: 'full-resume' });
  if (ipThrottleError) return ipThrottleError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitError = await checkUserRateLimit(user.id, { windowMs: 60_000, maxRequests: 10, keySuffix: 'resume' });
  if (rateLimitError) return rateLimitError;

  const [attempt] = await db
    .select()
    .from(testAttempts)
    .where(and(
      eq(testAttempts.userId, user.id),
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
    const result = await submitAttempt(attempt.id, user.id);
    return NextResponse.json({ success: true, data: { expired: true, result } });
  }

  const path = (attempt.adaptivePath ?? []) as Array<{ questionId: number; testTypeId: string }>;
  const nextIndex = path.length;

  if (nextIndex >= FULL_TEST_TOTAL_QUESTIONS) {
    const result = await submitAttempt(attempt.id, user.id);
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
    .select()
    .from(questions)
    .where(and(eq(questions.testTypeId, nextPart), eq(questions.active, 'true')));

  const selection = selectQuestion({
    questions: pool,
    seenQuestionIds: seenIds,
    targetLevel: nextTypeLevel,
    requiredTestTypeId: nextPart,
  });

  if (!selection) {
    const result = await submitAttempt(attempt.id, user.id);
    return NextResponse.json({ success: true, data: { completed: true, result, reason: 'pool_exhausted' } });
  }

  const selectionMode = determineSelectionMode(selection.reused, selection.question.cefrLevel, nextTypeLevel);
  await logQuestionSelection({
    attemptId: attempt.id,
    testTypeId: nextPart,
    questionId: selection.question.id,
    targetLevel: nextTypeLevel,
    selectedLevel: selection.question.cefrLevel,
    mode: selectionMode,
  });

  return NextResponse.json({
    success: true,
    data: {
      attemptId: attempt.id,
      question: selection.question,
      questionIndex: nextIndex,
      timeRemaining: realRemaining,
      totalQuestions: FULL_TEST_PART_DISTRIBUTION.length,
    },
  });
}