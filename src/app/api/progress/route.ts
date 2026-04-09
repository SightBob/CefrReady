import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userProgress, testAttempts, testTypes } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get overall progress by test type
    const progressByType = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, user.id));

    // Get recent test attempts (last 10)
    const recentAttempts = await db
      .select({
        id: testAttempts.id,
        testTypeId: testAttempts.testTypeId,
        score: testAttempts.score,
        totalQuestions: testAttempts.totalQuestions,
        correctAnswers: testAttempts.correctAnswers,
        completedAt: testAttempts.completedAt,
      })
      .from(testAttempts)
      .where(eq(testAttempts.userId, user.id))
      .orderBy(desc(testAttempts.completedAt))
      .limit(10);

    // Get test type details - use id as key since testTypeId references id
    const testTypeMap = new Map<string, { name: string; icon: string }>();
    const allTestTypes = await db.select().from(testTypes);
    allTestTypes.forEach((tt) => {
      testTypeMap.set(tt.id, { name: tt.name, icon: tt.icon || '' });
    });

    // Calculate overall statistics
    let totalTests = 0;
    let totalScore = 0;
    const byCategory = progressByType.map((p) => {
      const testsTaken = p.testsTaken || 0;
      const avgScore = typeof p.averageScore === 'string' ? parseFloat(p.averageScore) : (p.averageScore || 0);
      totalTests += testsTaken;
      totalScore += (avgScore * testsTaken);
      return {
        testTypeId: p.testTypeId,
        averageScore: avgScore,
        testsTaken,
      };
    });

    const overallAverage = totalTests > 0 ? Math.round(totalScore / totalTests) : 0;

    // Format attempts with test type info
    const formattedAttempts = recentAttempts.map((attempt) => ({
      id: attempt.id,
      testTypeId: attempt.testTypeId,
      testTypeName: testTypeMap.get(attempt.testTypeId)?.name || attempt.testTypeId,
      score: typeof attempt.score === 'string' ? parseFloat(attempt.score) : (attempt.score || 0),
      totalQuestions: attempt.totalQuestions || 0,
      correctAnswers: attempt.correctAnswers || 0,
      completedAt: attempt.completedAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        overall: {
          testsTaken: totalTests,
          averageScore: overallAverage,
        },
        byCategory,
        recentAttempts: formattedAttempts,
      },
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
