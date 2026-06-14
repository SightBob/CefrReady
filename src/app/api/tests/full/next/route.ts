import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { testAttempts, questions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
import {
  FULL_TEST_PART_DISTRIBUTION,
  FULL_TEST_TOTAL_QUESTIONS,
  FULL_TEST_TOTAL_SECONDS,
  type CefrLevel,
} from '@/lib/full-test/constants';
import { getNextLevel, selectQuestion } from '@/lib/full-test/algorithm';

const bodySchema = z.object({
  attemptId: z.number().int(),
  questionId: z.number().int(),
  selectedAnswer: z.string(),
  timeRemaining: z.number().int().min(0).max(FULL_TEST_TOTAL_SECONDS),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { attemptId, questionId, selectedAnswer, timeRemaining } = parsed.data;

  const [attempt] = await db
    .select()
    .from(testAttempts)
    .where(and(eq(testAttempts.id, attemptId), eq(testAttempts.userId, user.id)));

  if (!attempt || attempt.status !== 'in_progress') {
    return NextResponse.json({ success: false, error: 'Attempt not found' }, { status: 404 });
  }

  // Validate answer against DB
  const [question] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId));

  if (!question) {
    return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 });
  }

  const currentPath = (attempt.adaptivePath ?? []) as Array<{
    questionId: number;
    testTypeId: string;
    cefrLevel: CefrLevel;
    difficulty: string | null;
    wasCorrect: boolean;
    selectedAnswer: string;
    orderIndex: number;
  }>;

  // Prevent duplicate answers via replay
  if (currentPath.some((p) => p.questionId === questionId)) {
    return NextResponse.json({ success: false, error: 'Question already answered' }, { status: 400 });
  }

  // Determine correctness
  let isCorrect = false;
  if (
    question.testTypeId === 'form-meaning' &&
    question.article &&
    typeof question.article === 'object'
  ) {
    const art = question.article as { blanks?: Array<{ id: number; correctAnswer: string }> };
    if (Array.isArray(art.blanks) && art.blanks.length > 0) {
      let parsed: Record<string, string> = {};
      try {
        parsed = JSON.parse(selectedAnswer);
      } catch {
        // Leave parsed empty; the blanks comparison below will fail gracefully.
      }
      isCorrect = art.blanks.every(
        (b) =>
          (parsed[String(b.id)] ?? '').toLowerCase().trim() ===
          b.correctAnswer.toLowerCase().trim()
      );
    }
  } else {
    isCorrect =
      selectedAnswer.toLowerCase().trim() ===
      (question.correctAnswer ?? '').toLowerCase().trim();
  }

  const orderIndex = currentPath.length;
  const newPath = [
    ...currentPath,
    {
      questionId,
      testTypeId: question.testTypeId,
      cefrLevel: question.cefrLevel as CefrLevel,
      difficulty: question.difficulty,
      wasCorrect: isCorrect,
      selectedAnswer,
      orderIndex,
    },
  ];

  const answerHistory = newPath.map((p) => p.wasCorrect);
  const nextLevel = getNextLevel((attempt.currentLevel as CefrLevel) ?? 'B1', answerHistory);

  // Determine next part
  const nextIndex = newPath.length;
  if (nextIndex >= FULL_TEST_TOTAL_QUESTIONS) {
    await db
      .update(testAttempts)
      .set({
        adaptivePath: newPath,
        timeRemainingSeconds: timeRemaining,
        lastActivityAt: new Date(),
      })
      .where(eq(testAttempts.id, attemptId));

    return NextResponse.json({ success: true, data: { finished: true } });
  }

  const nextPart = FULL_TEST_PART_DISTRIBUTION[nextIndex];

  // Select next question
  const seenIds = new Set(newPath.map((p) => p.questionId));
  const pool = await db
    .select()
    .from(questions)
    .where(and(eq(questions.testTypeId, nextPart), eq(questions.active, 'true')));

  const nextQuestion = selectQuestion({
    questions: pool,
    seenQuestionIds: seenIds,
    targetLevel: nextLevel,
    requiredTestTypeId: nextPart,
  });

  if (!nextQuestion) {
    await db
      .update(testAttempts)
      .set({
        adaptivePath: newPath,
        timeRemainingSeconds: timeRemaining,
        lastActivityAt: new Date(),
      })
      .where(eq(testAttempts.id, attemptId));
    return NextResponse.json({ success: true, data: { finished: true, reason: 'pool_exhausted' } });
  }

  await db
    .update(testAttempts)
    .set({
      adaptivePath: newPath,
      currentLevel: nextLevel,
      timeRemainingSeconds: timeRemaining,
      lastActivityAt: new Date(),
    })
    .where(eq(testAttempts.id, attemptId));

  return NextResponse.json({
    success: true,
    data: {
      question: nextQuestion,
      questionIndex: nextIndex,
      finished: false,
    },
  });
}
