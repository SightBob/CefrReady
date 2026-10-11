import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { testAttempts, questions, questionSelectionLogs } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { validateOrigin, checkIpThrottle, checkUserRateLimit } from '@/lib/api-security';
import { FULL_TEST_PART_DISTRIBUTION, FULL_TEST_TOTAL_QUESTIONS, FULL_TEST_TOTAL_SECONDS, type CefrLevel, cefrIndex, CEFR_LEVELS } from '@/lib/full-test/constants';
import { getNextLevel, selectQuestion, getPerTypeAnswerHistory, getInitialLevels } from '@/lib/full-test/algorithm';
import { determineSelectionMode } from '@/lib/full-test/log-selection';
import { getCachedQuestionPool } from '@/lib/full-test/question-pool';
import { sanitizeQuestionForClient } from '@/lib/sanitize-question';
import { parseStructuredAnswer } from '@/lib/score-utils';
import { partLevels, readSelection, withSelection, type AttemptPathEntry } from '@/lib/full-test/state';

const bodySchema = z.object({
  attemptId: z.number().int().positive(),
  questionId: z.number().int().positive(),
  questionIndex: z.number().int().min(0).max(FULL_TEST_TOTAL_QUESTIONS - 1),
  selectedAnswer: z.string().max(20_000),
  timeRemaining: z.number().int().min(0).max(FULL_TEST_TOTAL_SECONDS),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const originError = validateOrigin(request);
  if (originError) return originError;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  const { attemptId, questionId, questionIndex, selectedAnswer, timeRemaining } = parsed.data;
  const errors = await Promise.all([
    checkIpThrottle(request, { keySuffix: 'full-next' }),
    checkUserRateLimit(userId, { maxRequests: 30, keySuffix: 'next' }),
  ]);
  for (const error of errors) if (error) return error;

  try {
    return await db.transaction(async (tx) => {
      const [attempt] = await tx.select().from(testAttempts)
        .where(and(eq(testAttempts.id, attemptId), eq(testAttempts.userId, userId), eq(testAttempts.testTypeId, 'full-test')))
        .limit(1).for('update');
      if (!attempt || attempt.status !== 'in_progress') {
        return NextResponse.json({ success: false, error: 'Attempt not found' }, { status: 404 });
      }
      const now = Date.now();
      const remaining = Math.min(
        (attempt.timeRemainingSeconds ?? FULL_TEST_TOTAL_SECONDS) - (now - new Date(attempt.lastActivityAt ?? attempt.startedAt).getTime()) / 1000,
        FULL_TEST_TOTAL_SECONDS - (now - new Date(attempt.startedAt).getTime()) / 1000,
      );
      if (remaining <= 0) return NextResponse.json({ success: false, error: 'EXAM_TIME_EXPIRED' }, { status: 403 });
      const path = (attempt.adaptivePath ?? []) as AttemptPathEntry[];
      const current = readSelection(attempt.currentLevels);
      // Retries are keyed by slot, not question ID: reuse is a genuine new answer.
      if (questionIndex < path.length) {
        const previous = path[questionIndex];
        if (previous?.questionId !== questionId || previous.selectedAnswer !== selectedAnswer) {
          return NextResponse.json({ success: false, error: 'Answer already committed' }, { status: 409 });
        }
        if (path.length >= FULL_TEST_TOTAL_QUESTIONS) return NextResponse.json({ success: true, data: { finished: true } });
        if (!current || current.slot !== path.length) return NextResponse.json({ success: false, error: 'Resume the attempt first' }, { status: 409 });
        const [nextQuestion] = await tx.select().from(questions).where(eq(questions.id, current.questionId));
        if (!nextQuestion) throw new Error('Current question missing');
        return NextResponse.json({ success: true, data: { question: sanitizeQuestionForClient(nextQuestion), questionIndex: path.length, finished: false } });
      }
      if (questionIndex !== path.length) return NextResponse.json({ success: false, error: 'Invalid question slot' }, { status: 409 });
      let selectedId = current?.slot === path.length ? current.questionId : null;
      let reused = current?.reused ?? false;
      // Existing attempts created before slot state was introduced use the selection log.
      if (selectedId === null) {
        const [log] = await tx.select().from(questionSelectionLogs).where(eq(questionSelectionLogs.attemptId, attemptId))
          .orderBy(desc(questionSelectionLogs.createdAt), desc(questionSelectionLogs.id)).limit(1);
        selectedId = log?.questionId ?? null;
        reused = log?.mode === 'reuse';
      }
      if (selectedId !== questionId) return NextResponse.json({ success: false, error: 'Not the current question' }, { status: 403 });
      const [question] = await tx.select().from(questions).where(eq(questions.id, questionId)).limit(1);
      if (!question || question.testTypeId !== FULL_TEST_PART_DISTRIBUTION[path.length] || !CEFR_LEVELS.includes(question.cefrLevel as CefrLevel)) {
        return NextResponse.json({ success: false, error: 'Invalid current question' }, { status: 400 });
      }
      let wasCorrect: boolean;
      if (question.testTypeId === 'form-meaning' && question.article) {
        const answer = parseStructuredAnswer(selectedAnswer);
        if (!answer) return NextResponse.json({ success: false, error: 'Invalid structured answer' }, { status: 400 });
        const article = question.article as { blanks?: Array<{ id: number; correctAnswer: string }> };
        wasCorrect = !!article.blanks?.length && article.blanks.every((blank) =>
          !!answer[String(blank.id)]?.trim() && answer[String(blank.id)].trim().toLowerCase() === blank.correctAnswer.trim().toLowerCase());
      } else {
        wasCorrect = !!question.correctAnswer?.trim() && selectedAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
      }
      const newPath: AttemptPathEntry[] = [...path, {
        questionId, testTypeId: question.testTypeId, cefrLevel: question.cefrLevel as CefrLevel,
        difficulty: question.difficulty, wasCorrect, selectedAnswer, orderIndex: path.length, reused, questionSnapshot: question,
      }];
      const levels = partLevels(attempt.currentLevels, getInitialLevels('B1'));
      const oldLevels = { ...levels };
      levels[question.testTypeId] = getNextLevel(levels[question.testTypeId], getPerTypeAnswerHistory(newPath, question.testTypeId));
      const nextIndex = newPath.length;
      const nextPart = FULL_TEST_PART_DISTRIBUTION[nextIndex];
      let nextQuestion = null;
      let selectionState = null;
      if (nextIndex < FULL_TEST_TOTAL_QUESTIONS) {
        const targetLevel = levels[nextPart];
        const direction = cefrIndex(targetLevel) > cefrIndex(oldLevels[nextPart]) ? 'up' : cefrIndex(targetLevel) < cefrIndex(oldLevels[nextPart]) ? 'down' : 'neutral';
        const pool = (await getCachedQuestionPool(nextPart)).filter((entry) => CEFR_LEVELS.includes(entry.cefrLevel as CefrLevel));
        const selection = selectQuestion({ questions: pool, seenQuestionIds: new Set(newPath.map((entry) => entry.questionId)), targetLevel, requiredTestTypeId: nextPart, direction });
        if (!selection) throw new Error('No questions available for the next slot');
        [nextQuestion] = await tx.select().from(questions).where(eq(questions.id, selection.question.id));
        if (!nextQuestion) throw new Error('Next question missing');
        selectionState = { questionId: nextQuestion.id, slot: nextIndex, reused: selection.reused };
        await tx.insert(questionSelectionLogs).values({ attemptId, testTypeId: nextPart, questionId: nextQuestion.id, targetLevel, selectedLevel: nextQuestion.cefrLevel, mode: determineSelectionMode(selection.reused, nextQuestion.cefrLevel, targetLevel) });
      }
      await tx.update(testAttempts).set({
        adaptivePath: newPath, currentLevels: withSelection(levels, selectionState),
        timeRemainingSeconds: Math.max(0, Math.floor(Math.min(remaining, timeRemaining))), lastActivityAt: new Date(now),
      }).where(eq(testAttempts.id, attemptId));
      return NextResponse.json({ success: true, data: nextQuestion
        ? { question: sanitizeQuestionForClient(nextQuestion), questionIndex: nextIndex, finished: false }
        : { finished: true } });
    });
  } catch (error) {
    console.error('[full/next] Failed to advance:', error);
    return NextResponse.json({ success: false, error: 'Failed to advance test' }, { status: 500 });
  }
}
