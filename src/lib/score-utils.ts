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
  tapExercise?: {
    title: string;
    hint?: string;
    items: { prompt: string; choiceA: string; choiceB: string; correct: 0 | 1 }[];
  } | null;
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
/** JSON answers must be a string record, never null, an array or numeric values. */
export function parseStructuredAnswer(value: string): Record<string, string> | null {
  if (value.trim() === '') return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    if (Object.values(parsed).some((entry) => typeof entry !== 'string')) return null;
    return parsed as Record<string, string>;
  } catch {
    return null;
  }
}

export function calculateScore(
  answers: Answer[],
  dbQuestions: DbQuestion[]
): ScoreCalculation {
  let correctCount = 0;
  let totalItems = 0;

  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.selectedAnswer]));
  if (answerMap.size !== answers.length) throw new Error('Duplicate question IDs');
  if (answers.some((answer) => !dbQuestions.some((question) => question.id === answer.questionId))) {
    throw new Error('Unknown question IDs');
  }
  // The server's question list is authoritative, including unanswered questions.
  const results: ScoreResult[] = dbQuestions.map((question) => {
    const answer = { questionId: question.id, selectedAnswer: answerMap.get(question.id) ?? '' };

    // Tap & Select: selectedAnswer is JSON keyed by item index; each item counts independently.
    if (question.tapExercise?.items?.length) {
      const parsedAnswers = parseStructuredAnswer(answer.selectedAnswer) ?? {};
      let itemCorrect = 0;
      const correctJson: Record<string, string> = {};
      question.tapExercise.items.forEach((item, index) => {
        totalItems++;
        const correctKey = item.correct === 0 ? 'A' : 'B';
        correctJson[String(index)] = correctKey;
        if ((parsedAnswers[String(index)] ?? '').trim().toUpperCase() === correctKey) {
          correctCount++;
          itemCorrect++;
        }
      });
      return {
        questionId: answer.questionId,
        isCorrect: itemCorrect === question.tapExercise.items.length,
        userAnswer: answer.selectedAnswer,
        correctAnswer: JSON.stringify(correctJson),
        explanation: question.explanation,
      };
    }

    // Form-meaning: score per-blank using article.blanks
    if (question.testTypeId === 'form-meaning' && question.article) {
      const art = question.article as { title: string; text: string; blanks: ArticleBlank[] };
      let blankCorrect = 0;
      const parsedAnswers = parseStructuredAnswer(answer.selectedAnswer) ?? {};

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
    const isCorrect = !!question.correctAnswer?.trim() && answer.selectedAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
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
