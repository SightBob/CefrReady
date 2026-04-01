import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, testTypes, users } from '@/db/schema';
import { eq, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const [questionStats] = await db
      .select({ count: count() })
      .from(questions);

    const [activeQuestionStats] = await db
      .select({ count: count() })
      .from(questions)
      .where(eq(questions.isActive, true));

    const [testTypeStats] = await db
      .select({ count: count() })
      .from(testTypes);

    const [userStats] = await db
      .select({ count: count() })
      .from(users);

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
