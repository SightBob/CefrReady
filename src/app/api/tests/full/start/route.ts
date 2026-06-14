import { NextResponse } from 'next/server';
import { db } from '@/db';
import { testAttempts, userProgress, questions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
import { estimateCefrLevel } from '@/lib/cefr-estimator';
import {
  FULL_TEST_PART_DISTRIBUTION,
  FULL_TEST_TOTAL_SECONDS,
  type CefrLevel,
} from '@/lib/full-test/constants';
import { selectQuestion } from '@/lib/full-test/algorithm';

export const dynamic = 'force-dynamic';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Check for existing in-progress attempt
  const existing = await db
    .select()
    .from(testAttempts)
    .where(and(eq(testAttempts.userId, user.id), eq(testAttempts.status, 'in_progress')))
    .orderBy(sql`${testAttempts.startedAt} desc`)
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ success: true, data: { attemptId: existing[0].id, resume: true } });
  }

  // Determine starting level
  const progress = await db
    .select()
    .from(userProgress)
    .where(eq(userProgress.userId, user.id));

  const overallScore = progress[0]?.averageScore
    ? parseFloat(progress[0].averageScore)
    : 0;
  const startLevel = overallScore > 0
    ? estimateCefrLevel(overallScore)
    : 'B1';

  // Create attempt
  const [attempt] = await db
    .insert(testAttempts)
    .values({
      userId: user.id,
      testTypeId: 'full-test',
      status: 'in_progress',
      currentLevel: startLevel,
      timeRemainingSeconds: FULL_TEST_TOTAL_SECONDS,
      lastActivityAt: new Date(),
      adaptivePath: [],
    })
    .returning();

  // Select first question (slot 0 = form-meaning)
  const firstPart = FULL_TEST_PART_DISTRIBUTION[0];
  const pool = await db
    .select()
    .from(questions)
    .where(and(eq(questions.testTypeId, firstPart), eq(questions.active, 'true')));

  const firstQuestion = selectQuestion({
    questions: pool,
    seenQuestionIds: new Set(),
    targetLevel: startLevel as CefrLevel,
    requiredTestTypeId: firstPart,
  });

  if (!firstQuestion) {
    return NextResponse.json({ success: false, error: 'No questions available' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      attemptId: attempt.id,
      question: firstQuestion,
      questionIndex: 0,
      totalQuestions: FULL_TEST_PART_DISTRIBUTION.length,
      timeRemaining: FULL_TEST_TOTAL_SECONDS,
    },
  });
}
