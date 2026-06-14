import type { questions } from '@/db/schema';
import { type CefrLevel, CEFR_LEVELS, CEFR_WEIGHTS, CEFR_SCORE_RANGES, cefrIndex, clampLevel } from './constants';

export type DbQuestion = typeof questions.$inferSelect;

export function getNextLevel(
  currentLevel: CefrLevel,
  answerHistory: boolean[]
): CefrLevel {
  const currentIndex = cefrIndex(currentLevel);

  // Question 1: use single result
  if (answerHistory.length === 1) {
    return answerHistory[0] ? clampLevel(currentIndex + 1) : clampLevel(currentIndex - 1);
  }

  // Question 2: use last 2
  if (answerHistory.length === 2) {
    const avg = answerHistory.reduce((a, b) => a + (b ? 1 : 0), 0) / answerHistory.length;
    if (avg >= 0.7) return clampLevel(currentIndex + 1);
    if (avg <= 0.3) return clampLevel(currentIndex - 1);
    return currentLevel;
  }

  // Question 3+: simple moving average (flat average) of the last up to 5 answers
  const window = answerHistory.slice(-5);
  const avg = window.reduce((a, b) => a + (b ? 1 : 0), 0) / window.length;
  if (avg >= 0.7) return clampLevel(currentIndex + 1);
  if (avg <= 0.3) return clampLevel(currentIndex - 1);
  return currentLevel;
}

interface QuestionPool {
  questions: DbQuestion[];
  seenQuestionIds: Set<number>;
  targetLevel: CefrLevel;
  requiredTestTypeId: string;
}

export function selectQuestion({
  questions,
  seenQuestionIds,
  targetLevel,
  requiredTestTypeId,
}: QuestionPool): DbQuestion | null {
  const levelIndex = cefrIndex(targetLevel);

  const findUnused = (level: CefrLevel) =>
    questions.find(
      (q) =>
        q.testTypeId === requiredTestTypeId &&
        q.cefrLevel === level &&
        !seenQuestionIds.has(q.id)
    );

  // 1. Try target level
  let candidate = findUnused(targetLevel);
  if (candidate) return candidate;

  // 2. Fallback to nearest levels (alternate up/down)
  const checkedLevels = new Set<CefrLevel>();
  for (let offset = 1; offset < CEFR_LEVELS.length; offset++) {
    const higher = clampLevel(levelIndex + offset);
    if (!checkedLevels.has(higher)) {
      checkedLevels.add(higher);
      candidate = findUnused(higher);
      if (candidate) return candidate;
    }

    const lower = clampLevel(levelIndex - offset);
    if (!checkedLevels.has(lower)) {
      checkedLevels.add(lower);
      candidate = findUnused(lower);
      if (candidate) return candidate;
    }
  }

  // 3. Reuse any previously seen question for this part type
  candidate = questions.find(
    (q) => q.testTypeId === requiredTestTypeId
  );
  if (candidate) return candidate;

  // 4. Nothing available
  return null;
}

export function calculateRawScore(
  path: Array<{ cefrLevel: CefrLevel; wasCorrect: boolean }>
): number {
  return path.reduce((sum, item) => {
    if (!item.wasCorrect) return sum;
    return sum + CEFR_WEIGHTS[item.cefrLevel];
  }, 0);
}

export function calculateMaxPossibleScore(
  path: Array<{ cefrLevel: CefrLevel }>
): number {
  return path.reduce((sum, item) => sum + CEFR_WEIGHTS[item.cefrLevel], 0);
}

export function normalizeScore(
  rawScore: number,
  maxPossibleScore: number
): number {
  if (maxPossibleScore <= 0) return 0;
  return Math.round((rawScore / maxPossibleScore) * 120);
}

export function normalizedScoreToCefr(score: number): CefrLevel {
  const entries = Object.entries(CEFR_SCORE_RANGES) as [CefrLevel, { min: number; max: number }][];
  for (const [level, range] of entries) {
    if (score >= range.min && score <= range.max) return level;
  }
  if (score < 1) return 'A1';
  return 'C2';
}
