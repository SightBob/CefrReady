/**
 * SECURITY: strip answer-bearing fields from question payloads before they
 * leave the server pre-submission. Prevents answer-key harvesting via
 * DevTools/network scraping (report findings C2/C3).
 *
 * Answers may only reach the client from post-submit review endpoints that
 * verify attempt ownership (e.g. /api/tests/attempts/[attemptId]).
 */

interface BlanksArticle {
  blanks?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

/** Returns a copy of the article with each blank's correctAnswer removed. */
export function sanitizeArticleForClient<T>(article: T): T {
  if (!article || typeof article !== 'object') return article;
  const art = article as BlanksArticle;
  if (!Array.isArray(art.blanks)) return article;
  return {
    ...art,
    blanks: art.blanks.map(({ correctAnswer: _omitted, ...rest }) => rest),
  } as T;
}

type SanitizedTapExercise<T> = T extends { items: Array<infer Item> }
  ? Omit<T, 'items'> & { items: Array<Omit<Item, 'correct'>> }
  : T extends null | undefined
    ? T
    : T;

interface QuestionWithAnswers {
  correctAnswer?: unknown;
  explanation?: unknown;
  article?: unknown;
  tapExercise?: unknown;
  [key: string]: unknown;
}

/** Returns a copy of a question without answer keys before the test is submitted. */
export function sanitizeQuestionForClient<Q extends QuestionWithAnswers>(question: Q) {
  const { correctAnswer: _ca, explanation: _ex, article, tapExercise, ...rest } = question;
  return {
    ...rest,
    article: sanitizeArticleForClient(article),
    tapExercise: sanitizeTapExerciseForClient(tapExercise),
  };
}

/** Strip each Tap & Select item's answer key before exposing it to test takers. */
export function sanitizeTapExerciseForClient<T>(tapExercise: T): SanitizedTapExercise<T> {
  if (!tapExercise || typeof tapExercise !== 'object') return tapExercise as SanitizedTapExercise<T>;
  const exercise = tapExercise as { items?: unknown; [key: string]: unknown };
  if (!Array.isArray(exercise.items)) return tapExercise as SanitizedTapExercise<T>;
  return {
    ...exercise,
    items: exercise.items.map((item) => {
      if (!item || typeof item !== 'object') return item;
      const { correct: _correct, ...rest } = item as Record<string, unknown>;
      return rest;
    }),
  } as SanitizedTapExercise<T>;
}
