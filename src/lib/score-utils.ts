/**
 * Scoring utilities for REGULAR (non-adaptive) section tests.
 *
 * NOTE: The adaptive full-test feature uses its own scoring logic in
 * `src/lib/full-test/submit-attempt.ts` which incorporates CEFR weights
 * and per-blank granularity. Do not mix these two systems.
 */

interface Answer {
  questionId: number;
  selectedAnswer: string;
}

interface ArticleBlank {
  id: number;
  correctAnswer: string;
  hint?: string;
}

interface DbQuestion {
  id: number;
  testTypeId?: string;
  correctAnswer: string | null;
  explanation: string | null;
  article?: unknown;
}

interface ScoreResult {
  questionId: number;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string | null;
  explanation: string | null;
}

interface ScoreCalculation {
  results: ScoreResult[];
  correctCount: number;
  totalQuestions: number;
  score: number;
}

/**
 * Calculates score from submitted answers against DB questions.
 * For form-meaning, selectedAnswer is JSON-encoded per-blank answers
 * (e.g. {"1":"running","2":"is"}) and scoring is done per-blank.
 */
export function calculateScore(
  answers: Answer[],
  dbQuestions: DbQuestion[]
): ScoreCalculation {
  let correctCount = 0;
  let totalItems = 0;

  const results: ScoreResult[] = answers.map((answer) => {
    const question = dbQuestions.find((q) => q.id === answer.questionId);

    if (!question) {
      totalItems++;
      return {
        questionId: answer.questionId,
        isCorrect: false,
        userAnswer: answer.selectedAnswer,
        correctAnswer: null,
        explanation: null,
      };
    }

    // Form-meaning: score per-blank using article.blanks
    if (question.testTypeId === 'form-meaning' && question.article) {
      const art = question.article as { title: string; text: string; blanks: ArticleBlank[] };
      let blankCorrect = 0;
      let parsedAnswers: Record<string, string> = {};
      try { parsedAnswers = JSON.parse(answer.selectedAnswer); } catch {}

      const correctJson: Record<string, string> = {};
      art.blanks.forEach((blank) => {
        totalItems++;
        correctJson[String(blank.id)] = blank.correctAnswer;
        const userAns = parsedAnswers[String(blank.id)]?.toLowerCase().trim();
        if (userAns && userAns === blank.correctAnswer.toLowerCase().trim()) {
          blankCorrect++;
          correctCount++;
        }
      });

      return {
        questionId: answer.questionId,
        isCorrect: blankCorrect === art.blanks.length,
        userAnswer: answer.selectedAnswer,
        correctAnswer: JSON.stringify(correctJson),
        explanation: question.explanation,
      };
    }

    // MCQ types: direct string comparison
    totalItems++;
    const isCorrect = answer.selectedAnswer.toLowerCase().trim() === (question.correctAnswer ?? '').toLowerCase().trim();
    if (isCorrect) correctCount++;

    return {
      questionId: answer.questionId,
      isCorrect,
      userAnswer: answer.selectedAnswer,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
    };
  });

  const score = totalItems > 0 ? (correctCount / totalItems) * 100 : 0;

  return { results, correctCount, totalQuestions: totalItems, score };
}
