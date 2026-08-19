import { NextResponse } from 'next/server';
import { db } from '@/db';
import { testAttempts, userProgress, questions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { validateOrigin, checkIpThrottle, checkUserRateLimit } from '@/lib/api-security';
import {
  FULL_TEST_PART_DISTRIBUTION,
  FULL_TEST_TOTAL_SECONDS,
  type CefrLevel,
} from '@/lib/full-test/constants';
import { selectQuestion, getInitialLevels } from '@/lib/full-test/algorithm';
import { estimateCefrLevel } from '@/lib/cefr-estimator';
import { determineSelectionMode, logQuestionSelection } from '@/lib/full-test/log-selection';
import { sanitizeQuestionForClient } from '@/lib/sanitize-question';

// Adaptive selection only needs id/type/level metadata; heavy columns
// (article jsonb, transcript, explanation) are fetched for the single
// selected question instead of the whole pool.
const poolSelection = { id: questions.id, testTypeId: questions.testTypeId, cefrLevel: questions.cefrLevel };

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const originError = validateOrigin(request);
  if (originError) return originError;

  // JWT session carries user.id — skips a users-table round trip per request.
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const [ipThrottleError, rateLimitError] = await Promise.all([
    checkIpThrottle(request, { keySuffix: 'full-start' }),
    checkUserRateLimit(userId, { windowMs: 60_000, maxRequests: 10, keySuffix: 'start' }),
  ]);
  if (ipThrottleError) return ipThrottleError;
  if (rateLimitError) return rateLimitError;

  const firstPart = FULL_TEST_PART_DISTRIBUTION[0];

  // Cancel stale attempts, read starting level, and load the selection pool
  // concurrently — none depends on another.
  const [, progressRows, pool] = await Promise.all([
    db
      .update(testAttempts)
      .set({ status: 'cancelled' })
      .where(and(
        eq(testAttempts.userId, userId),
        eq(testAttempts.status, 'in_progress'),
        eq(testAttempts.testTypeId, 'full-test')
      )),
    db
      .select()
      .from(userProgress)
      .where(and(eq(userProgress.userId, userId), eq(userProgress.testTypeId, 'full-test'))),
    db
      .select(poolSelection)
      .from(questions)
      .where(and(eq(questions.testTypeId, firstPart), eq(questions.active, 'true'))),
  ]);

  const overallScore = progressRows[0]?.averageScore
    ? parseFloat(progressRows[0].averageScore)
    : 0;
  const startLevel: CefrLevel = overallScore > 0
    ? estimateCefrLevel(overallScore)
    : 'B1';

  const initialLevels = getInitialLevels(startLevel);

  // Select first question (slot 0 = focus-form)
  const firstResult = selectQuestion({
    questions: pool,
    seenQuestionIds: new Set(),
    targetLevel: initialLevels[firstPart] as CefrLevel,
    requiredTestTypeId: firstPart,
  });

  if (!firstResult) {
    return NextResponse.json({ success: false, error: 'No questions available' }, { status: 500 });
  }

  const targetLevel = initialLevels[firstPart] as CefrLevel;
  const selectionMode = determineSelectionMode(firstResult.reused, firstResult.question.cefrLevel, targetLevel);

  const [[attempt], questionRows] = await Promise.all([
    db
      .insert(testAttempts)
      .values({
        userId,
        testTypeId: 'full-test',
        status: 'in_progress',
        currentLevels: initialLevels,
        timeRemainingSeconds: FULL_TEST_TOTAL_SECONDS,
        lastActivityAt: new Date(),
        adaptivePath: [],
      })
      .returning(),
    db.select().from(questions).where(eq(questions.id, firstResult.question.id)),
  ]);

  const fullQuestion = questionRows[0];
  if (!fullQuestion) {
    return NextResponse.json({ success: false, error: 'No questions available' }, { status: 500 });
  }

  await logQuestionSelection({
    attemptId: attempt.id,
    testTypeId: firstPart,
    questionId: firstResult.question.id,
    targetLevel,
    selectedLevel: firstResult.question.cefrLevel,
    mode: selectionMode,
  });

  return NextResponse.json({
    success: true,
    data: {
      attemptId: attempt.id,
      // SECURITY: never send correctAnswer/explanation pre-submission (C3).
      question: sanitizeQuestionForClient(fullQuestion),
      questionIndex: 0,
      totalQuestions: FULL_TEST_PART_DISTRIBUTION.length,
      timeRemaining: FULL_TEST_TOTAL_SECONDS,
    },
  });
}
