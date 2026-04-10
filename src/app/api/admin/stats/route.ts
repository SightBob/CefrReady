import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, testTypes, users } from '@/db/schema';
import { eq, count } from 'drizzle-orm';
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

    // Active questions query - handle case where column might not exist yet
    let activeQuestionStats = { count: 0 };
    try {
      [activeQuestionStats] = await db
        .select({ count: count() })
        .from(questions)
        .where(eq(questions.active, 'true'));
    } catch (e) {
      // Column doesn't exist yet, use total as fallback
      activeQuestionStats = questionStats;
    }

    return NextResponse.json({
      totalQuestions: questionStats?.count || 0,
      activeQuestions: activeQuestionStats?.count || 0,
      totalTests: testTypeStats?.count || 0,
      totalUsers: userStats?.count || 0,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({
      totalQuestions: 0,
      activeQuestions: 0,
      totalTests: 0,
      totalUsers: 0,
    });
  }
}
