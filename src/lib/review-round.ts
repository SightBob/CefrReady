/**
 * Review Round — pure helpers for the wrong-answer retry mechanic.
 *
 * Flow: user answers all N questions (main phase) → questions answered
 * incorrectly form a shuffled review queue (review phase, 1 retry each).
 * Official score counts FIRST ATTEMPT ONLY; retries are recorded for
 * display and analytics without touching score/CEFR math.
 */

export interface ReviewQuestionLike {
  correctAnswer?: string | null;
}

/** Indices of questions that were ANSWERED but WRONG. Unanswered ≠ wrong. */
export function buildWrongSet(
  questions: ReviewQuestionLike[],
  answers: Array<string | null>
): number[] {
  return questions
    .map((q, i) => ({ q, i }))
    .filter(({ q, i }) => answers[i] !== null && answers[i] !== '' &&
      normalizeChoice(answers[i]) !== normalizeChoice(q.correctAnswer))
    .map(({ i }) => i);
}

/**
 * Fisher-Yates shuffle — returns a new array.
 * Extracted from the quiz page's inline shuffle so the review queue
 * uses identical behavior.
 */
export function shuffleQueue<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export type RetryOutcome = 'recovered' | 'still-wrong';

/** Compare a retry answer against the correct answer. */
export function computeRetryOutcome(
  firstAnswer: string,
  retryAnswer: string,
  correctAnswer: string | null | undefined
): RetryOutcome {
  return normalizeChoice(retryAnswer) === normalizeChoice(correctAnswer)
    ? 'recovered'
    : 'still-wrong';
}

/** Normalize option keys ('A' vs 'a') before comparing choices. */
function normalizeChoice(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase();
}