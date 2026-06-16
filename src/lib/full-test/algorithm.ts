import { type DbQuestion } from '@/db/schema';
import {
  type CefrLevel,
  type PerTypeLevels,
  CEFR_LEVELS,
  CEFR_WEIGHTS,
  CEFR_SCORE_RANGES,
  REUSE_WEIGHT_DISCOUNT,
  MIN_WINDOW_BEFORE_ADJUST,
  LEVEL_ADJUSTMENT_WINDOW,
  THRESHOLD_UP,
  THRESHOLD_DOWN,
  MAJOR_STEP_UP,
  MAJOR_STEP_DOWN,
  MIN_QUESTIONS_FOR_CONFIDENT,
  cefrIndex,
  clampLevel,
} from './constants';

export function getNextLevel(
  currentLevel: CefrLevel,
  answerHistory: boolean[]
): CefrLevel {
  if (answerHistory.length < MIN_WINDOW_BEFORE_ADJUST) return currentLevel;

  const currentIndex = cefrIndex(currentLevel);
  const window = answerHistory.slice(-LEVEL_ADJUSTMENT_WINDOW);
  const avg = window.reduce((a, b) => a + (b ? 1 : 0), 0) / window.length;

  if (avg >= MAJOR_STEP_UP) return clampLevel(currentIndex + 2);
  if (avg <= MAJOR_STEP_DOWN) return clampLevel(currentIndex - 2);

  if (avg >= THRESHOLD_UP) return clampLevel(currentIndex + 1);
  if (avg <= THRESHOLD_DOWN) return clampLevel(currentIndex - 1);

  return currentLevel;
}

export function getPerTypeAnswerHistory(
  path: Array<{ testTypeId: string; wasCorrect: boolean }>,
  testTypeId: string
): boolean[] {
  return path
    .filter((p) => p.testTypeId === testTypeId)
    .map((p) => p.wasCorrect);
}

export function getInitialLevels(startLevel: CefrLevel): PerTypeLevels {
  return {
    'focus-form': startLevel,
    'focus-meaning': startLevel,
    'form-meaning': startLevel,
    'listening': startLevel,
  };
}

interface QuestionPool {
  questions: DbQuestion[];
  seenQuestionIds: Set<number>;
  targetLevel: CefrLevel;
  requiredTestTypeId: string;
  direction?: 'up' | 'down' | 'neutral';
}

export function selectQuestion({
  questions,
  seenQuestionIds,
  targetLevel,
  requiredTestTypeId,
  direction = 'neutral',
}: QuestionPool): { question: DbQuestion; reused: boolean } | null {
  const levelIndex = cefrIndex(targetLevel);

  const findUnused = (level: CefrLevel) =>
    questions.find(
      (q) =>
        q.testTypeId === requiredTestTypeId &&
        q.cefrLevel === level &&
        !seenQuestionIds.has(q.id)
    );

  const exactMatch = findUnused(targetLevel);
  if (exactMatch) return { question: exactMatch, reused: false };

  const checkedLevels = new Set<CefrLevel>();
  for (let offset = 1; offset < CEFR_LEVELS.length; offset++) {
    const higher = clampLevel(levelIndex + offset);
    const lower = clampLevel(levelIndex - offset);

    let primary: CefrLevel;
    let secondary: CefrLevel | null = null;

    if (direction === 'up') {
      primary = higher;
      if (!checkedLevels.has(lower)) secondary = lower;
    } else if (direction === 'down') {
      primary = lower;
      if (!checkedLevels.has(higher)) secondary = higher;
    } else {
      primary = higher;
      if (!checkedLevels.has(lower) && lower !== higher) secondary = lower;
    }

    if (!checkedLevels.has(primary)) {
      checkedLevels.add(primary);
      const candidate = findUnused(primary);
      if (candidate) return { question: candidate, reused: false };
    }

    if (secondary) {
      checkedLevels.add(secondary);
      const candidate = findUnused(secondary);
      if (candidate) return { question: candidate, reused: false };
    }
  }

  const reusedCandidates = questions
    .filter((q) => q.testTypeId === requiredTestTypeId)
    .sort(
      (a, b) =>
        Math.abs(cefrIndex(a.cefrLevel as CefrLevel) - levelIndex) -
        Math.abs(cefrIndex(b.cefrLevel as CefrLevel) - levelIndex)
    );
  if (reusedCandidates.length > 0) {
    return { question: reusedCandidates[0], reused: true };
  }

  return null;
}

export function calculateRawScore(
  path: Array<{ cefrLevel: CefrLevel; wasCorrect: boolean; reused?: boolean }>
): number {
  return path.reduce((sum, item) => {
    if (!item.wasCorrect) return sum;
    const weight = CEFR_WEIGHTS[item.cefrLevel];
    const discount = item.reused ? REUSE_WEIGHT_DISCOUNT : 1;
    return sum + weight * discount;
  }, 0);
}

export function calculateMaxPossibleScore(
  path: Array<{ cefrLevel: CefrLevel; reused?: boolean }>
): number {
  return path.reduce((sum, item) => {
    const weight = CEFR_WEIGHTS[item.cefrLevel];
    const discount = item.reused ? REUSE_WEIGHT_DISCOUNT : 1;
    return sum + weight * discount;
  }, 0);
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

export function calculateConfidence(
  totalQuestions: number
): 'high' | 'medium' | 'low' {
  if (totalQuestions >= MIN_QUESTIONS_FOR_CONFIDENT) return 'high';
  if (totalQuestions >= 10) return 'medium';
  return 'low';
}