import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, testTypes, users, userAnswers } from '@/db/schema';
import { eq, count, desc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const [questionStats] = await db
      .select({ count: count() })
      .from(questions);

    const [testTypeStats] = await db
      .select({ count: count() })
      .from(testTypes);

    const [userStats] = await db
      .select({ count: count() })
      .from(users);

    // Active questions query
    let activeQuestionStats = { count: 0 };
    try {
      [activeQuestionStats] = await db
        .select({ count: count() })
        .from(questions)
        .where(eq(questions.active, 'true'));
    } catch {
      activeQuestionStats = questionStats;
    }

    // Hardest questions: top 5 most-missed questions
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
    } catch {
      // userAnswers may be empty — non-fatal
    }

    return NextResponse.json({
      totalQuestions: questionStats?.count || 0,
      activeQuestions: activeQuestionStats?.count || 0,
      totalTests: testTypeStats?.count || 0,
      totalUsers: userStats?.count || 0,
      hardestQuestions,
    });
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
