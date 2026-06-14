import type { questions } from '@/db/schema';
import { type CefrLevel, CEFR_LEVELS, cefrIndex, clampLevel } from './constants';

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

  // Question 3+: weighted average of last 3-5
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
  for (let offset = 1; offset < CEFR_LEVELS.length; offset++) {
    const higher = clampLevel(levelIndex + offset);
    candidate = findUnused(higher);
    if (candidate) return candidate;

    const lower = clampLevel(levelIndex - offset);
    candidate = findUnused(lower);
    if (candidate) return candidate;
  }

  // 3. Reuse any previously seen question for this part type
  candidate = questions.find(
    (q) => q.testTypeId === requiredTestTypeId
  );
  if (candidate) return candidate;

  // 4. Nothing available
  return null;
}
