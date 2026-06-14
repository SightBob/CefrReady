import { NextResponse } from 'next/server';
import { db } from '@/db';
import { testAttempts, questions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
import { FULL_TEST_PART_DISTRIBUTION, FULL_TEST_TOTAL_QUESTIONS, type CefrLevel } from '@/lib/full-test/constants';
import { selectQuestion } from '@/lib/full-test/algorithm';
import { submitAttempt } from '@/lib/full-test/submit-attempt';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

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
  const realRemaining = (attempt.timeRemainingSeconds ?? 0) - elapsedSeconds;

  if (realRemaining <= 0) {
    const result = await submitAttempt(attempt.id, user.id);
    return NextResponse.json({ success: true, data: { expired: true, result } });
  }

  const path = (attempt.adaptivePath ?? []) as Array<{ questionId: number; testTypeId: string }>;
  const nextIndex = path.length;

  // If the user already answered the last question, submit the attempt instead of
  // trying to index past the end of the distribution array.
  if (nextIndex >= FULL_TEST_TOTAL_QUESTIONS) {
    const result = await submitAttempt(attempt.id, user.id);
    return NextResponse.json({ success: true, data: { expired: true, result } });
  }

  const nextPart = FULL_TEST_PART_DISTRIBUTION[nextIndex];

  const seenIds = new Set(path.map((p) => p.questionId));
  const pool = await db
    .select()
    .from(questions)
    .where(and(eq(questions.testTypeId, nextPart), eq(questions.active, 'true')));

  const nextQuestion = selectQuestion({
    questions: pool,
    seenQuestionIds: seenIds,
    targetLevel: (attempt.currentLevel as CefrLevel) ?? 'B1',
    requiredTestTypeId: nextPart,
  });

  return NextResponse.json({
    success: true,
    data: {
      attemptId: attempt.id,
      question: nextQuestion,
      questionIndex: nextIndex,
      timeRemaining: realRemaining,
      totalQuestions: FULL_TEST_PART_DISTRIBUTION.length,
    },
  });
}
