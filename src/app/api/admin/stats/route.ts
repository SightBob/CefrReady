import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, testTypes, users, userAnswers } from '@/db/schema';
import { eq, count, desc, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';
import { unstable_cache } from 'next/cache';

const getCachedStats = unstable_cache(
  async () => {
    // One scan for both question counts, with at most three concurrent DB
    // queries (matching the configured pool); no auth or cache policy change.
    const [[questionStats], [testTypeStats], [userStats]] = await Promise.all([
      db.select({
        count: count(),
        activeCount: sql<number>`count(*) filter (where ${questions.active} = 'true')::int`,
      }).from(questions),
      db.select({ count: count() }).from(testTypes),
      db.select({ count: count() }).from(users),
    ]);

    let hardestQuestions: Array<{ questionId: number; questionText: string; wrongCount: number }> = [];
    try {
      const rows = await db
        .select({
          questionId: userAnswers.questionId,
          questionText: questions.questionText,
          wrongCount: count(userAnswers.id),
        })
        .from(userAnswers)
        .innerJoin(questions, eq(userAnswers.questionId, questions.id))
        .where(eq(userAnswers.isCorrect, false))
        .groupBy(userAnswers.questionId, questions.questionText)
        .orderBy(desc(count(userAnswers.id)))
        .limit(5);
      hardestQuestions = rows.map(r => ({
        questionId: r.questionId,
        questionText: r.questionText,
        wrongCount: Number(r.wrongCount),
      }));
    } catch (error) {
      console.warn('[admin-stats] Hardest questions query failed (userAnswers may be empty):', error);
    }

    return {
      totalQuestions: questionStats?.count || 0,
      activeQuestions: Number(questionStats?.activeCount) || 0,
      totalTests: testTypeStats?.count || 0,
      totalUsers: userStats?.count || 0,
      hardestQuestions,
    };
  },
  ['admin-stats'],
  { revalidate: 60, tags: ['stats'] }
);

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const stats = await getCachedStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({
      totalQuestions: 0,
      activeQuestions: 0,
      totalTests: 0,
      totalUsers: 0,
      hardestQuestions: [],
    });
  }
}
