import { db } from '@/db';
import { testAttempts, userAnswers, userProgress, questions, type DbTestAttempt } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { type CefrLevel } from './constants';
import {
  calculateRawScore,
  calculateMaxPossibleScore,
  normalizeScore,
  normalizedScoreToCefr,
  calculateConfidence,
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
  const expandedTotalQuestions = expandedPath.length;
  const expandedCorrectCount = expandedPath.filter((p) => p.wasCorrect).length;

  const rawScore = calculateRawScore(expandedPath);
  const maxPossible = calculateMaxPossibleScore(expandedPath);
  const normalized = normalizeScore(rawScore, maxPossible);
  const cefrLevel = normalizedScoreToCefr(normalized);
  const confidence = calculateConfidence(expandedTotalQuestions);

  const reusedCount = path.filter((p) => p.reused).length;

  const now = new Date();

  await db
    .update(testAttempts)
    .set({
      status: 'completed',
      score: normalized.toString(),
      totalQuestions: expandedTotalQuestions,
      correctAnswers: expandedCorrectCount,
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

  return buildResult(updated, normalized, cefrLevel, expandedCorrectCount, expandedTotalQuestions, confidence, reusedCount);
}

function buildResult(
  attempt: DbTestAttempt,
  normalized?: number,
  cefrLevel?: CefrLevel,
  correctCount?: number,
  totalQuestions?: number,
  confidence?: 'high' | 'medium' | 'low',
  reusedCount?: number,
) {
  return {
    attemptId: attempt.id,
    score: normalized ?? parseFloat(attempt.score ?? '0'),
    cefrLevel: cefrLevel ?? null,
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