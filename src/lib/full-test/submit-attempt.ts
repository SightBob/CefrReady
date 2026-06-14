import { db } from '@/db';
import { testAttempts, userAnswers, userProgress, type DbTestAttempt } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { type CefrLevel } from './constants';
import {
  calculateRawScore,
  calculateMaxPossibleScore,
  normalizeScore,
  normalizedScoreToCefr,
} from './algorithm';

export async function submitAttempt(attemptId: number, userId: string) {
  const [attempt] = await db
    .select()
    .from(testAttempts)
    .where(and(eq(testAttempts.id, attemptId), eq(testAttempts.userId, userId)));

  if (!attempt) throw new Error('Attempt not found');
  if (attempt.status === 'completed') {
    const score = parseFloat(attempt.score ?? '0');
    return buildResult(attempt, score, normalizedScoreToCefr(score));
  }
  if (attempt.status === 'cancelled') {
    throw new Error('Attempt was cancelled');
  }

  const path = (attempt.adaptivePath ?? []) as Array<{
    questionId: number;
    testTypeId: string;
    cefrLevel: CefrLevel;
    wasCorrect: boolean;
    selectedAnswer: string;
  }>;

  const rawScore = calculateRawScore(path);
  const maxPossible = calculateMaxPossibleScore(path);
  const normalized = normalizeScore(rawScore, maxPossible);
  const cefrLevel = normalizedScoreToCefr(normalized);
  const correctCount = path.filter((p) => p.wasCorrect).length;
  const now = new Date();

  await db
    .update(testAttempts)
    .set({
      status: 'completed',
      score: normalized.toString(),
      totalQuestions: path.length,
      correctAnswers: correctCount,
      completedAt: now,
    })
    .where(eq(testAttempts.id, attemptId));

  if (path.length > 0) {
    await db.insert(userAnswers).values(
      path.map((p) => ({
        attemptId,
        questionId: p.questionId,
        selectedAnswer: p.selectedAnswer,
        isCorrect: p.wasCorrect,
        createdAt: now,
      }))
    );
  }

  await updateUserProgress(userId, 'full-test', normalized);

  const [updated] = await db
    .select()
    .from(testAttempts)
    .where(eq(testAttempts.id, attemptId));

  return buildResult(updated, normalized, cefrLevel, correctCount, path.length);
}

function buildResult(
  attempt: DbTestAttempt,
  normalized?: number,
  cefrLevel?: CefrLevel,
  correctCount?: number,
  totalQuestions?: number
) {
  return {
    attemptId: attempt.id,
    score: normalized ?? parseFloat(attempt.score ?? '0'),
    cefrLevel: cefrLevel ?? null,
    correctAnswers: correctCount ?? attempt.correctAnswers,
    totalQuestions: totalQuestions ?? attempt.totalQuestions,
    adaptivePath: attempt.adaptivePath ?? [],
  };
}

async function updateUserProgress(userId: string, testTypeId: string, score: number) {
  const existing = await db
    .select()
    .from(userProgress)
    .where(and(eq(userProgress.userId, userId), eq(userProgress.testTypeId, testTypeId)));

  if (existing.length > 0) {
    const p = existing[0];
    const taken = (p.testsTaken ?? 0) + 1;
    const prevAvg = parseFloat((p.averageScore ?? '0').toString()) || 0;
    const newAvg = (prevAvg * (taken - 1) + score) / taken;
    await db
      .update(userProgress)
      .set({ averageScore: newAvg.toString(), testsTaken: taken, lastAttemptAt: new Date() })
      .where(eq(userProgress.id, p.id));
  } else {
    await db.insert(userProgress).values({
      userId,
      testTypeId,
      averageScore: score.toString(),
      testsTaken: 1,
      lastAttemptAt: new Date(),
    });
  }
}
