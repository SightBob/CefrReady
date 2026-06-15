import { NextResponse } from 'next/server';
import { db } from '@/db';
import { testAttempts, userProgress, questions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
import {
  FULL_TEST_PART_DISTRIBUTION,
  FULL_TEST_TOTAL_SECONDS,
  type CefrLevel,
} from '@/lib/full-test/constants';
import { selectQuestion, normalizedScoreToCefr, getInitialLevels } from '@/lib/full-test/algorithm';

export const dynamic = 'force-dynamic';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Cancel any stale in_progress attempts for this user before starting a new one.
  // This handles leftover attempts from before schema changes or abandoned sessions.
  const staleAttempts = await db
    .select({ id: testAttempts.id })
    .from(testAttempts)
    .where(and(
      eq(testAttempts.userId, user.id),
      eq(testAttempts.status, 'in_progress'),
      eq(testAttempts.testTypeId, 'full-test')
    ));

  if (staleAttempts.length > 0) {
    await db
      .update(testAttempts)
      .set({ status: 'cancelled' })
      .where(and(
        eq(testAttempts.userId, user.id),
        eq(testAttempts.status, 'in_progress'),
        eq(testAttempts.testTypeId, 'full-test')
      ));
  }

  // Determine starting level
  const progress = await db
    .select()
    .from(userProgress)
    .where(and(eq(userProgress.userId, user.id), eq(userProgress.testTypeId, 'full-test')));

  const overallScore = progress[0]?.averageScore
    ? parseFloat(progress[0].averageScore)
    : 0;
  const startLevel: CefrLevel = overallScore > 0
    ? normalizedScoreToCefr(overallScore)
    : 'B1';

  const initialLevels = getInitialLevels(startLevel);

  // Select first question (slot 0 = focus-form)
  const firstPart = FULL_TEST_PART_DISTRIBUTION[0];
  const pool = await db
    .select()
    .from(questions)
    .where(and(eq(questions.testTypeId, firstPart), eq(questions.active, 'true')));

  const firstResult = selectQuestion({
    questions: pool,
    seenQuestionIds: new Set(),
    targetLevel: initialLevels[firstPart] as CefrLevel,
    requiredTestTypeId: firstPart,
  });

  if (!firstResult) {
    return NextResponse.json({ success: false, error: 'No questions available' }, { status: 500 });
  }

  const [attempt] = await db
    .insert(testAttempts)
    .values({
      userId: user.id,
      testTypeId: 'full-test',
      status: 'in_progress',
      currentLevels: initialLevels,
      timeRemainingSeconds: FULL_TEST_TOTAL_SECONDS,
      lastActivityAt: new Date(),
      adaptivePath: [],
    })
    .returning();

  return NextResponse.json({
    success: true,
    data: {
      attemptId: attempt.id,
      question: firstResult.question,
      questionIndex: 0,
      totalQuestions: FULL_TEST_PART_DISTRIBUTION.length,
      timeRemaining: FULL_TEST_TOTAL_SECONDS,
    },
  });
}