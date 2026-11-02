import type { DbQuestion } from '@/db/schema';
import { parseStructuredAnswer } from '@/lib/score-utils';
import { calculateRawScore, calculateMaxPossibleScore, calculateConfidence, normalizeScore, normalizedScoreToCefr } from './algorithm';
import { CEFR_LEVELS, MIN_WINDOW_BEFORE_ADJUST, THRESHOLD_UP, type CefrLevel } from './constants';
import type { AttemptPathEntry } from './state';

// The final level is the highest CEFR level the learner answered with enough
// attempts and accuracy at or above THRESHOLD_UP, so it reflects the difficulty
// actually reached rather than the weighted percentage.
// When no level has enough attempts (short or aborted attempt) fall back to the
// band of the weighted score shown on the results page, so the level can never
// contradict the "x / 120" number next to it.
function deriveReachedLevel(
  expanded: Array<{ cefrLevel: CefrLevel; wasCorrect: boolean }>,
  normalizedScore: number
): CefrLevel {
  for (let i = CEFR_LEVELS.length - 1; i >= 0; i--) {
    const level = CEFR_LEVELS[i];
    const atLevel = expanded.filter((entry) => entry.cefrLevel === level);
    if (atLevel.length < MIN_WINDOW_BEFORE_ADJUST) continue;
    const correct = atLevel.filter((entry) => entry.wasCorrect).length;
    if (correct / atLevel.length >= THRESHOLD_UP) return level;
  }
  return normalizedScoreToCefr(normalizedScore);
}

export function calculateFullTestResult(path: AttemptPathEntry[], legacyQuestions: DbQuestion[] = []) {
  const expanded: Array<{ cefrLevel: AttemptPathEntry['cefrLevel']; wasCorrect: boolean; reused?: boolean }> = [];
  const perPart: Record<string, { total: number; correct: number }> = {};
  for (const entry of path) {
    const question = entry.questionSnapshot ?? legacyQuestions.find((row) => row.id === entry.questionId);
    const article = question?.article as { blanks?: Array<{ id: number; correctAnswer: string }> } | null | undefined;
    const answers = parseStructuredAnswer(entry.selectedAnswer) ?? {};
    const outcomes = entry.testTypeId === 'form-meaning' && article?.blanks?.length
      ? article.blanks.map((blank) => !!answers[String(blank.id)]?.trim() && answers[String(blank.id)].trim().toLowerCase() === blank.correctAnswer.trim().toLowerCase())
      : [entry.wasCorrect];
    const stats = perPart[entry.testTypeId] ??= { total: 0, correct: 0 };
    for (const wasCorrect of outcomes) {
      expanded.push({ cefrLevel: entry.cefrLevel, wasCorrect, reused: entry.reused });
      stats.total++;
      if (wasCorrect) stats.correct++;
    }
  }
  const correctAnswers = expanded.filter((entry) => entry.wasCorrect).length;
  const totalQuestions = expanded.length;
  const normalizedScore = normalizeScore(calculateRawScore(expanded), calculateMaxPossibleScore(expanded));
  return {
    score: totalQuestions ? Math.round(correctAnswers / totalQuestions * 10_000) / 100 : 0,
    correctAnswers, totalQuestions, normalizedScore, cefrLevel: deriveReachedLevel(expanded, normalizedScore),
    confidence: calculateConfidence(path.length), reusedCount: path.filter((entry) => entry.reused).length, perPart,
  };
}
