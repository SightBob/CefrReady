interface Answer {
  questionId: number;
  selectedAnswer: string;
}

interface DbQuestion {
  id: number;
  correctAnswer: string | null;
  explanation: string | null;
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
 * Extracted to avoid code duplication between demo and real-mode submissions.
 */
export function calculateScore(
  answers: Answer[],
  dbQuestions: DbQuestion[]
): ScoreCalculation {
  let correctCount = 0;

  const results: ScoreResult[] = answers.map((answer) => {
    const question = dbQuestions.find((q) => q.id === answer.questionId);

    if (!question) {
      return {
        questionId: answer.questionId,
        isCorrect: false,
        userAnswer: answer.selectedAnswer,
        correctAnswer: null,
        explanation: null,
      };
    }

    const isCorrect = answer.selectedAnswer === question.correctAnswer;
    if (isCorrect) correctCount++;

    return {
      questionId: answer.questionId,
      isCorrect,
      userAnswer: answer.selectedAnswer,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
    };
  });

  const totalQuestions = answers.length;
  const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

  return { results, correctCount, totalQuestions, score };
}
