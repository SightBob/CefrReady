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
import { getCachedQuestionPool } from '@/lib/full-test/question-pool';
import { sanitizeQuestionForClient } from '@/lib/sanitize-question';
import { partLevels, readSelection, withSelection } from '@/lib/full-test/state';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    return await handleResume(request);
  } catch (error) {
    // ไม่ให้ throw ออกไปเป็น HTML 500 — client รอ { success, data }
    // ข้อความภายในของ error ห้ามหลุดไปถึง client
    console.error('[full/resume] Failed to resume:', error);
    return NextResponse.json({ success: false, error: 'Failed to resume test' }, { status: 500 });
  }
}

async function handleResume(request: Request) {
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
    .select({
      id: testAttempts.id,
      adaptivePath: testAttempts.adaptivePath,
      currentLevels: testAttempts.currentLevels,
      timeRemainingSeconds: testAttempts.timeRemainingSeconds,
      lastActivityAt: testAttempts.lastActivityAt,
      startedAt: testAttempts.startedAt,
    })
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
  const realRemaining = Math.min(stored - elapsedSeconds, FULL_TEST_TOTAL_SECONDS - Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000));

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
  const currentLevels: PerTypeLevels = partLevels(attempt.currentLevels, getInitialLevels('B1'));
  const currentSelection = readSelection(attempt.currentLevels);
  const nextTypeLevel = (currentLevels[nextPart] as CefrLevel) ?? 'B1';

  const seenIds = new Set(path.map((p) => p.questionId));
  const pool = await getCachedQuestionPool(nextPart);

  const persistedQuestion = currentSelection?.slot === nextIndex
    ? pool.find((entry) => entry.id === currentSelection.questionId) : null;
  const selection = persistedQuestion && currentSelection
    ? { question: persistedQuestion, reused: currentSelection.reused }
    : selectQuestion({
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

  const [questionRows, updatedRows] = await Promise.all([
    db.select().from(questions).where(eq(questions.id, selection.question.id)),
    db.update(testAttempts).set({ currentLevels: withSelection(currentLevels, { questionId: selection.question.id, slot: nextIndex, reused: selection.reused }) })
      .where(and(eq(testAttempts.id, attempt.id), eq(testAttempts.status, 'in_progress'), sql`jsonb_array_length(${testAttempts.adaptivePath}) = ${nextIndex}`)).returning({ id: testAttempts.id }),
    logQuestionSelection({
      attemptId: attempt.id,
      testTypeId: nextPart,
      questionId: selection.question.id,
      targetLevel: nextTypeLevel,
      selectedLevel: selection.question.cefrLevel,
      mode: selectionMode,
    }),
  ]);
  if (!updatedRows.length) return NextResponse.json({ success: false, error: 'Attempt advanced; resume again' }, { status: 409 });
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
