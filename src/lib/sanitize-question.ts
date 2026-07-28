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

interface QuestionWithAnswers {
  correctAnswer?: unknown;
  explanation?: unknown;
  article?: unknown;
  [key: string]: unknown;
}

/** Returns a copy of the question without correctAnswer/explanation and with
 *  cloze answers stripped from article.blanks. */
export function sanitizeQuestionForClient<Q extends QuestionWithAnswers>(question: Q) {
  const { correctAnswer: _ca, explanation: _ex, article, ...rest } = question;
  return {
    ...rest,
    article: sanitizeArticleForClient(article),
  };
}
