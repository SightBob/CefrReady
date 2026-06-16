import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { testAttempts, questions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateOrigin, checkRateLimit } from '@/lib/api-security';
import {
  FULL_TEST_PART_DISTRIBUTION,
  FULL_TEST_TOTAL_QUESTIONS,
  FULL_TEST_TOTAL_SECONDS,
  type CefrLevel,
  type PerTypeLevels,
  cefrIndex,
} from '@/lib/full-test/constants';
import { getNextLevel, selectQuestion, getPerTypeAnswerHistory, getInitialLevels } from '@/lib/full-test/algorithm';

const bodySchema = z.object({
  attemptId: z.number().int(),
  questionId: z.number().int(),
  selectedAnswer: z.string(),
  timeRemaining: z.number().int().min(0).max(FULL_TEST_TOTAL_SECONDS),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const originError = validateOrigin(request);
  if (originError) return originError;

  const rateLimitError = await checkRateLimit(request, { windowMs: 60_000, maxRequests: 30, keySuffix: 'next' });
  if (rateLimitError) return rateLimitError;

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
    reused?: boolean;
  }>;

  if (currentPath.some((p) => p.questionId === questionId)) {
    // Idempotent: question already processed — return current state instead of erroring.
    // This handles double-clicks, React strict mode re-renders, and page refreshes.
    const currentLevels: PerTypeLevels = (attempt.currentLevels as PerTypeLevels) ?? getInitialLevels('B1');
    const nextIndex = currentPath.length;

    if (nextIndex >= FULL_TEST_TOTAL_QUESTIONS) {
      return NextResponse.json({ success: true, data: { finished: true } });
    }

    const nextPart = FULL_TEST_PART_DISTRIBUTION[nextIndex];
    const nextTypeLevel = (currentLevels[nextPart] as CefrLevel) ?? 'B1';
    const seenIds = new Set(currentPath.map((p) => p.questionId));
    const pool = await db
      .select()
      .from(questions)
      .where(and(eq(questions.testTypeId, nextPart), eq(questions.active, 'true')));

    const selection = selectQuestion({
      questions: pool,
      seenQuestionIds: seenIds,
      targetLevel: nextTypeLevel,
      requiredTestTypeId: nextPart,
      direction: 'neutral',
    });

    if (!selection) {
      return NextResponse.json({ success: true, data: { finished: true, reason: 'pool_exhausted' } });
    }

    return NextResponse.json({
      success: true,
      data: {
        question: selection.question,
        questionIndex: nextIndex,
        finished: false,
      },
    });
  }

  let isCorrect = false;
  let blanksCorrect = 0;
  let blanksTotal = 0;
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
      blanksTotal = art.blanks.length;
      blanksCorrect = art.blanks.filter(
        (b) =>
          (parsed[String(b.id)] ?? '').toLowerCase().trim() ===
          b.correctAnswer.toLowerCase().trim()
      ).length;
      isCorrect = blanksCorrect === blanksTotal;
    }
  } else {
    isCorrect =
      selectedAnswer.toLowerCase().trim() ===
      (question.correctAnswer ?? '').toLowerCase().trim();
  }

  const orderIndex = currentPath.length;
  const seenQuestionIds = new Set(currentPath.map((p) => p.questionId));
  const isReused = seenQuestionIds.has(questionId);
  seenQuestionIds.add(questionId);

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
      reused: isReused,
    },
  ];

  const currentLevels: PerTypeLevels = (attempt.currentLevels as PerTypeLevels) ?? getInitialLevels('B1');
  const testTypeLevels = { ...currentLevels };

  // For form-meaning, expand into per-blank sub-entries for adaptive level adjustment
  if (question.testTypeId === 'form-meaning' && blanksTotal > 0) {
    const expandedHistory: boolean[] = [];
    for (let i = 0; i < blanksTotal; i++) {
      expandedHistory.push(i < blanksCorrect);
    }
    const typeHistory = getPerTypeAnswerHistory(newPath, question.testTypeId);
    const combinedHistory = [...typeHistory.slice(0, -1), ...expandedHistory];
    const updatedLevel = getNextLevel(
      (testTypeLevels[question.testTypeId] as CefrLevel) ?? 'B1',
      combinedHistory
    );
    testTypeLevels[question.testTypeId] = updatedLevel;
  } else {
    const typeHistory = getPerTypeAnswerHistory(newPath, question.testTypeId);
    const updatedLevel = getNextLevel(
      (testTypeLevels[question.testTypeId] as CefrLevel) ?? 'B1',
      typeHistory
    );
    testTypeLevels[question.testTypeId] = updatedLevel;
  }

  const nextIndex = newPath.length;
  if (nextIndex >= FULL_TEST_TOTAL_QUESTIONS) {
    await db
      .update(testAttempts)
      .set({
        adaptivePath: newPath,
        currentLevels: testTypeLevels,
        timeRemainingSeconds: timeRemaining,
        lastActivityAt: new Date(),
      })
      .where(eq(testAttempts.id, attemptId));

    return NextResponse.json({ success: true, data: { finished: true } });
  }

  const nextPart = FULL_TEST_PART_DISTRIBUTION[nextIndex];
  const prevLevel = (currentLevels[nextPart] as CefrLevel) ?? 'B1';
  const nextTypeLevel = (testTypeLevels[nextPart] as CefrLevel) ?? 'B1';
  const direction: 'up' | 'down' | 'neutral' =
    cefrIndex(nextTypeLevel) > cefrIndex(prevLevel) ? 'up' :
    cefrIndex(nextTypeLevel) < cefrIndex(prevLevel) ? 'down' : 'neutral';

  const pool = await db
    .select()
    .from(questions)
    .where(and(eq(questions.testTypeId, nextPart), eq(questions.active, 'true')));

  const selection = selectQuestion({
    questions: pool,
    seenQuestionIds: seenQuestionIds,
    targetLevel: nextTypeLevel,
    requiredTestTypeId: nextPart,
    direction,
  });

  if (!selection) {
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
      currentLevels: testTypeLevels,
      timeRemainingSeconds: timeRemaining,
      lastActivityAt: new Date(),
    })
    .where(eq(testAttempts.id, attemptId));

  return NextResponse.json({
    success: true,
    data: {
      question: selection.question,
      questionIndex: nextIndex,
      finished: false,
    },
  });
}