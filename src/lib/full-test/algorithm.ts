import { type CefrLevel, cefrIndex, clampLevel } from './constants';

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
