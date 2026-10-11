import type { DbQuestion } from '@/db/schema';
import { parseStructuredAnswer } from '@/lib/score-utils';
import { calculateRawScore, calculateMaxPossibleScore, calculateConfidence, normalizeScore, normalizedScoreToCefr } from './algorithm';
import type { AttemptPathEntry } from './state';

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
    correctAnswers, totalQuestions, normalizedScore, cefrLevel: normalizedScoreToCefr(normalizedScore),
    confidence: calculateConfidence(path.length), reusedCount: path.filter((entry) => entry.reused).length, perPart,
  };
}
