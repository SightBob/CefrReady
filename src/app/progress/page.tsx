import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { userProgress, testAttempts, testTypes } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import ProgressContent from './ProgressContent';

export const metadata: Metadata = {
  title: 'ความก้าวหน้าของคุณ',
  description: 'ดูความก้าวหน้าและสถิติการเรียนภาษาอังกฤษ CEFR ของคุณ',
  alternates: { canonical: 'https://cefr-ready.site/progress' },
  openGraph: {
    title: 'ความก้าวหน้าของคุณ | CEFR Ready',
    description: 'ดูความก้าวหน้าและสถิติการเรียนภาษาอังกฤษ CEFR ของคุณ',
    url: 'https://cefr-ready.site/progress',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ความก้าวหน้าของคุณ | CEFR Ready',
    description: 'ดูความก้าวหน้าและสถิติการเรียนภาษาอังกฤษ CEFR ของคุณ',
  },
};

import TestsLoginPrompt from '../tests/TestsLoginPrompt';
import { ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';

export default async function ProgressPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4">
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Your Progress</h1>
          <p className="text-slate-600 mt-2">Track your improvement and view test history</p>
        </div>
        
        <TestsLoginPrompt />
        
        <div className="mt-8 opacity-50 pointer-events-none relative blur-sm">
           <div className="h-64 bg-slate-100 rounded-2xl border border-slate-200"></div>
        </div>
      </div>
    );
  }

  // Fetch progress data server-side
  const [progressByType, recentAttempts, allTestTypes, overallAgg] = await Promise.all([
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
      .where(and(eq(testAttempts.userId, session.user.id), eq(testAttempts.status, 'completed')))
      .orderBy(desc(testAttempts.completedAt))
      .limit(10),
    db.select().from(testTypes),
    db
      .select({
        totalTests: sql<number>`COALESCE(SUM(${userProgress.testsTaken}), 0)`,
        overallAverage: sql<number>`COALESCE(
          ROUND(
            SUM(${userProgress.averageScore}::numeric * ${userProgress.testsTaken})
            / NULLIF(SUM(${userProgress.testsTaken}), 0)
          ), 0
        )`,
      })
      .from(userProgress)
      .where(eq(userProgress.userId, session.user.id)),
  ]);

  // Build test type name map
  const testTypeMap = new Map<string, { name: string; icon: string }>();
  allTestTypes.forEach((tt) => {
    testTypeMap.set(tt.id, { name: tt.name, icon: tt.icon || '' });
  });

  // Build per-category breakdown (still needs rows; overall is computed by SQL)
  const byCategory = progressByType.map((p) => {
    const testsTaken = p.testsTaken || 0;
    const avgScore =
      typeof p.averageScore === 'string'
        ? parseFloat(p.averageScore)
        : p.averageScore || 0;
    return { testTypeId: p.testTypeId, averageScore: avgScore, testsTaken };
  });

  const totalTests = Number(overallAgg?.[0]?.totalTests ?? 0);
  const overallAverage = Number(overallAgg?.[0]?.overallAverage ?? 0);

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
