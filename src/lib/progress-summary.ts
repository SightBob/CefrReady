interface ProgressRow {
  testTypeId: string;
  averageScore: string | number | null;
  testsTaken: number | null;
}

interface AttemptRow {
  id: number;
  testTypeId: string;
  testTypeName: string | null;
  score: string | number | null;
  totalQuestions: number | null;
  correctAnswers: number | null;
  completedAt: Date | string | null;
}

export interface ProgressSummary {
  overall: { testsTaken: number; averageScore: number };
  byCategory: Array<{
    testTypeId: string;
    averageScore: number;
    testsTaken: number;
  }>;
  recentAttempts: Array<{
    id: number;
    testTypeId: string;
    testTypeName: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    completedAt: string;
  }>;
}

function finiteNumber(value: string | number | null): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatProgressSummary(
  progressRows: ProgressRow[],
  attemptRows: AttemptRow[]
): ProgressSummary {
  let totalTests = 0;
  let weightedScore = 0;

  const byCategory = progressRows.map((row) => {
    const testsTaken = row.testsTaken ?? 0;
    const averageScore = finiteNumber(row.averageScore);
    totalTests += testsTaken;
    weightedScore += averageScore * testsTaken;
    return { testTypeId: row.testTypeId, averageScore, testsTaken };
  });

  return {
    overall: {
      testsTaken: totalTests,
      averageScore: totalTests > 0 ? Math.round(weightedScore / totalTests) : 0,
    },
    byCategory,
    recentAttempts: attemptRows.map((attempt) => ({
      id: attempt.id,
      testTypeId: attempt.testTypeId,
      testTypeName: attempt.testTypeName || attempt.testTypeId,
      score: finiteNumber(attempt.score),
      totalQuestions: attempt.totalQuestions ?? 0,
      correctAnswers: attempt.correctAnswers ?? 0,
      completedAt:
        attempt.completedAt instanceof Date
          ? attempt.completedAt.toISOString()
          : attempt.completedAt ?? '',
    })),
  };
}
