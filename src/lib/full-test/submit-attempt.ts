import { db } from '@/db';
import { testAttempts, userAnswers, userProgress, questions, type DbTestAttempt } from '@/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { type CefrLevel } from './constants';
import {
  calculateRawScore,
  calculateMaxPossibleScore,
  calculateConfidence,
  normalizeScore,
  normalizedScoreToCefr,
} from './algorithm';

interface ExpandedPathEntry {
  questionId: number;
  testTypeId: string;
  cefrLevel: CefrLevel;
  wasCorrect: boolean;
  selectedAnswer: string;
  reused?: boolean;
}

function expandPathForScoring(
  path: Array<{ questionId: number; testTypeId: string; cefrLevel: CefrLevel; wasCorrect: boolean; selectedAnswer: string; reused?: boolean }>,
  blankCounts: Map<number, { total: number; correct: number }>
): ExpandedPathEntry[] {
  const expanded: ExpandedPathEntry[] = [];
  for (const entry of path) {
    const blanks = blankCounts.get(entry.questionId);
    if (blanks && blanks.total > 0) {
      for (let i = 0; i < blanks.total; i++) {
        expanded.push({
          ...entry,
          wasCorrect: i < blanks.correct,
        });
      }
    } else {
      expanded.push(entry);
    }
  }
  return expanded;
}

export async function submitAttempt(attemptId: number, userId: string) {
  const [attempt] = await db
    .select()
    .from(testAttempts)
    .where(and(eq(testAttempts.id, attemptId), eq(testAttempts.userId, userId)));

  if (!attempt) throw new Error('Attempt not found');
  if (attempt.status === 'completed') {
    const score = parseFloat(attempt.score ?? '0');
    return buildResult(attempt, score);
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
    orderIndex: number;
    reused?: boolean;
  }>;

  const formMeaningIds = path
    .filter((p) => p.testTypeId === 'form-meaning')
    .map((p) => p.questionId);

  const blankCounts = new Map<number, { total: number; correct: number }>();

  if (formMeaningIds.length > 0) {
    const fmQuestions = await db
      .select({ id: questions.id, article: questions.article })
      .from(questions)
      .where(inArray(questions.id, formMeaningIds));

    for (const q of fmQuestions) {
      const art = q.article as { blanks?: Array<{ id: number; correctAnswer: string }> } | null;
      const blanks = art?.blanks;
      if (!Array.isArray(blanks) || blanks.length === 0) continue;

      const pathEntry = path.find((p) => p.questionId === q.id);
      if (!pathEntry) continue;

      let parsed: Record<string, string> = {};
      try {
        parsed = JSON.parse(pathEntry.selectedAnswer);
      } catch { /* empty */ }

      const blanksCorrect = blanks.filter(
        (b) => (parsed[String(b.id)] ?? '').toLowerCase().trim() === b.correctAnswer.toLowerCase().trim()
      ).length;

      blankCounts.set(q.id, { total: blanks.length, correct: blanksCorrect });
    }
  }

  const expandedPath = expandPathForScoring(path, blankCounts);
  const rawScore = calculateRawScore(expandedPath);
  const maxPossible = calculateMaxPossibleScore(expandedPath);
  const confidence = calculateConfidence(path.length);

  // Score granularity differs from adaptive granularity by design:
  // - percentageScore: per-blank granularity for accurate final scoring
  // - Adaptive engine (getNextLevel): per-question granularity (form-meaning = 1 entry) for stable level adjustment
  const expandedTotal = expandedPath.length;
  const expandedCorrect = expandedPath.filter((p) => p.wasCorrect).length;
  const percentageScore = expandedTotal > 0
    ? Math.round((expandedCorrect / expandedTotal) * 100 * 100) / 100
    : 0;

  const normalizedScore = normalizeScore(rawScore, maxPossible);
  const cefrLevel = normalizedScoreToCefr(normalizedScore);

  const reusedCount = path.filter((p) => p.reused).length;

  const now = new Date();

  const [updated] = await db
    .update(testAttempts)
    .set({
      status: 'completed',
      score: percentageScore.toString(),
      totalQuestions: expandedTotal,
      correctAnswers: expandedCorrect,
      completedAt: now,
    })
    .where(and(eq(testAttempts.id, attemptId), eq(testAttempts.status, 'in_progress')))
    .returning();

  if (!updated) {
    throw new Error('Attempt already submitted or cancelled by another request');
  }

  if (path.length > 0) {
    await db
      .insert(userAnswers)
      .values(
        path.map((p) => ({
          attemptId,
          questionId: p.questionId,
          selectedAnswer: p.selectedAnswer,
          isCorrect: p.wasCorrect,
          createdAt: now,
        }))
      );
  }

  await updateUserProgress(userId, 'full-test', percentageScore);

  return buildResult(updated, percentageScore, cefrLevel, normalizedScore, expandedCorrect, expandedTotal, confidence, reusedCount);
}

function buildResult(
  attempt: DbTestAttempt,
  score?: number,
  cefrLevel?: CefrLevel,
  normalizedScore?: number,
  correctCount?: number,
  totalQuestions?: number,
  confidence?: 'high' | 'medium' | 'low',
  reusedCount?: number,
) {
  return {
    attemptId: attempt.id,
    score: score ?? parseFloat(attempt.score ?? '0'),
    cefrLevel: cefrLevel ?? null,
    normalizedScore: normalizedScore ?? null,
    correctAnswers: correctCount ?? attempt.correctAnswers,
    totalQuestions: totalQuestions ?? attempt.totalQuestions,
    adaptivePath: attempt.adaptivePath ?? [],
    confidence: confidence ?? 'medium',
    reusedCount: reusedCount ?? 0,
  };
}

async function updateUserProgress(userId: string, testTypeId: string, score: number) {
  const existing = await db
    .select()
    .from(userProgress)
    .where(and(eq(userProgress.userId, userId), eq(userProgress.testTypeId, testTypeId)));

  if (existing.length > 0) {
    const p = existing[0];
    await db
      .update(userProgress)
      .set({
        averageScore: sql`((${userProgress.averageScore}::numeric * ${userProgress.testsTaken}) + ${score}) / (${userProgress.testsTaken} + 1)`,
        testsTaken: sql`${userProgress.testsTaken} + 1`,
        lastAttemptAt: new Date(),
      })
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