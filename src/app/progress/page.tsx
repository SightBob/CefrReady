import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { userProgress, testAttempts, testTypes } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import ProgressContent from './ProgressContent';

export const metadata: Metadata = {
  title: 'Your Progress | CEFR Ready',
  description: 'ดูความก้าวหน้าและสถิติการเรียนภาษาอังกฤษ CEFR ของคุณ',
};

export default async function ProgressPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  // Fetch progress data server-side
  const [progressByType, recentAttempts, allTestTypes] = await Promise.all([
    db.select().from(userProgress).where(eq(userProgress.userId, session.user.id)),
    db
      .select({
        id: testAttempts.id,
        testTypeId: testAttempts.testTypeId,
        score: testAttempts.score,
        totalQuestions: testAttempts.totalQuestions,
        correctAnswers: testAttempts.correctAnswers,
        completedAt: testAttempts.completedAt,
      })
      .from(testAttempts)
      .where(eq(testAttempts.userId, session.user.id))
      .orderBy(desc(testAttempts.completedAt))
      .limit(10),
    db.select().from(testTypes),
  ]);

  // Build test type name map
  const testTypeMap = new Map<string, { name: string; icon: string }>();
  allTestTypes.forEach((tt) => {
    testTypeMap.set(tt.id, { name: tt.name, icon: tt.icon || '' });
  });

  // Calculate overall statistics
  let totalTests = 0;
  let totalScore = 0;
  const byCategory = progressByType.map((p) => {
    const testsTaken = p.testsTaken || 0;
    const avgScore =
      typeof p.averageScore === 'string'
        ? parseFloat(p.averageScore)
        : p.averageScore || 0;
    totalTests += testsTaken;
    totalScore += avgScore * testsTaken;
    return { testTypeId: p.testTypeId, averageScore: avgScore, testsTaken };
  });

  const overallAverage = totalTests > 0 ? Math.round(totalScore / totalTests) : 0;

  const formattedAttempts = recentAttempts.map((attempt) => ({
    id: attempt.id,
    testTypeId: attempt.testTypeId,
    testTypeName: testTypeMap.get(attempt.testTypeId)?.name || attempt.testTypeId,
    score:
      typeof attempt.score === 'string'
        ? parseFloat(attempt.score)
        : attempt.score || 0,
    totalQuestions: attempt.totalQuestions || 0,
    correctAnswers: attempt.correctAnswers || 0,
    completedAt: attempt.completedAt ? String(attempt.completedAt) : '',
  }));

  const progressData = {
    overall: { testsTaken: totalTests, averageScore: overallAverage },
    byCategory,
    recentAttempts: formattedAttempts,
  };

  return <ProgressContent progress={progressData} />;
}
