import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  users, testAttempts, testTypes, userProgress,
  userAnswers, questions, questionReports,
} from '@/db/schema';
import { count, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';
import { estimateCefrLevel } from '@/lib/cefr-estimator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    // --- Overview stats ---
    const [[totalUsers], [totalAttempts], testTypeList] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(testAttempts),
      db.select().from(testTypes),
    ]);

    // --- Average score overall ---
    const [overallAvg] = await db
      .select({
        avg: sql<number>`ROUND(AVG(CAST(${testAttempts.score} AS NUMERIC)), 1)`,
      })
      .from(testAttempts);

    // --- Attempts per test type ---
    const attemptsByType = await db
      .select({
        testTypeId: testAttempts.testTypeId,
        attempts: count(),
        avgScore: sql<number>`ROUND(AVG(CAST(${testAttempts.score} AS NUMERIC)), 1)`,
      })
      .from(testAttempts)
      .groupBy(testAttempts.testTypeId);

    // --- Attempts per day (last 30 days) ---
    const attemptsOverTime = await db
      .select({
        date: sql<string>`DATE(${testAttempts.completedAt})`,
        attempts: count(),
        avgScore: sql<number>`ROUND(AVG(CAST(${testAttempts.score} AS NUMERIC)), 1)`,
      })
      .from(testAttempts)
      .where(sql`${testAttempts.completedAt} >= NOW() - INTERVAL '30 days'`)
      .groupBy(sql`DATE(${testAttempts.completedAt})`)
      .orderBy(sql`DATE(${testAttempts.completedAt})`);

    // --- Score distribution (buckets: <50, 50-69, 70-89, 90-100) ---
    const scoreDistribution = await db
      .select({
        bucket: sql<string>`
          CASE
            WHEN CAST(${testAttempts.score} AS NUMERIC) < 50 THEN 'Below 50%'
            WHEN CAST(${testAttempts.score} AS NUMERIC) < 70 THEN '50–69%'
            WHEN CAST(${testAttempts.score} AS NUMERIC) < 90 THEN '70–89%'
            ELSE '90–100%'
          END
        `,
        count: count(),
      })
      .from(testAttempts)
      .where(sql`${testAttempts.score} IS NOT NULL`)
      .groupBy(sql`
        CASE
          WHEN CAST(${testAttempts.score} AS NUMERIC) < 50 THEN 'Below 50%'
          WHEN CAST(${testAttempts.score} AS NUMERIC) < 70 THEN '50–69%'
          WHEN CAST(${testAttempts.score} AS NUMERIC) < 90 THEN '70–89%'
          ELSE '90–100%'
        END
      `);

    // --- Top performers (users with highest avg score, min 3 attempts) ---
    const topPerformers = await db
      .select({
        userId: testAttempts.userId,
        attempts: count(),
        avgScore: sql<number>`ROUND(AVG(CAST(${testAttempts.score} AS NUMERIC)), 1)`,
      })
      .from(testAttempts)
      .groupBy(testAttempts.userId)
      .having(sql`COUNT(*) >= 3`)
      .orderBy(sql`AVG(CAST(${testAttempts.score} AS NUMERIC)) DESC`)
      .limit(5);

    // Hydrate top performers with user info
    const userIds = topPerformers.map((p) => p.userId);
    const topUsers =
      userIds.length > 0
        ? await db
            .select({ id: users.id, name: users.name, email: users.email, image: users.image })
            .from(users)
            .where(sql`${users.id} = ANY(ARRAY[${sql.join(userIds.map((id) => sql`${id}`), sql`, `)}]::text[])`)
        : [];

    const userMap = new Map(topUsers.map((u) => [u.id, u]));
    const topPerformersHydrated = topPerformers.map((p) => ({
      ...p,
      user: userMap.get(p.userId) ?? null,
    }));

    // Add test type names to attemptsByType
    const testTypeMap = new Map(testTypeList.map((t) => [t.id, t.name]));
    const attemptsByTypeNamed = attemptsByType.map((a) => ({
      ...a,
      testTypeName: testTypeMap.get(a.testTypeId) ?? a.testTypeId,
    }));

    // ─── New analytics queries (run in parallel where possible) ───────────────

    // 1. Question Analytics — correct rate by test type
    const correctRateByType = await db
      .select({
        testTypeId: questions.testTypeId,
        totalAnswers: count(),
        correctAnswers: sql<number>`SUM(CASE WHEN ${userAnswers.isCorrect} THEN 1 ELSE 0 END)`,
      })
      .from(userAnswers)
      .innerJoin(questions, sql`${userAnswers.questionId} = ${questions.id}`)
      .groupBy(questions.testTypeId);

    const correctRateByTypeNamed = correctRateByType.map((r) => ({
      ...r,
      testTypeName: testTypeMap.get(r.testTypeId) ?? r.testTypeId,
      correctRate: r.totalAnswers > 0
        ? Math.round((Number(r.correctAnswers) / r.totalAnswers) * 1000) / 10
        : 0,
    }));

    // 2. Hardest questions — top 5 questions with most wrong answers
    const hardestQuestionsRaw = await db
      .select({
        questionId: userAnswers.questionId,
        questionText: questions.questionText,
        testTypeId: questions.testTypeId,
        totalAnswers: count(),
        correctAnswers: sql<number>`SUM(CASE WHEN ${userAnswers.isCorrect} THEN 1 ELSE 0 END)`,
      })
      .from(userAnswers)
      .innerJoin(questions, sql`${userAnswers.questionId} = ${questions.id}`)
      .groupBy(userAnswers.questionId, questions.questionText, questions.testTypeId)
      .orderBy(sql`SUM(CASE WHEN NOT ${userAnswers.isCorrect} THEN 1 ELSE 0 END) DESC`)
      .limit(5);

    const hardestQuestions = hardestQuestionsRaw.map((q) => {
      const total = Number(q.totalAnswers);
      const wrong = total - Number(q.correctAnswers);
      return {
        questionId: q.questionId,
        questionText: q.questionText,
        testTypeId: q.testTypeId,
        testTypeName: testTypeMap.get(q.testTypeId) ?? q.testTypeId,
        wrongCount: wrong,
        correctRate: total > 0
          ? Math.round((Number(q.correctAnswers) / total) * 1000) / 10
          : 0,
      };
    });

    // 4. User retention — new users this month, active users, avg sessions
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

    const [userRetention] = await db
      .select({
        newUsersThisMonth: count(),
      })
      .from(users)
      .where(sql`${users.createdAt} >= ${firstOfMonth}::date`);

    const [activeUsers] = await db
      .select({
        activeUserCount: sql<number>`
          COUNT(DISTINCT ${testAttempts.userId})
        `,
        totalSessions: count(),
      })
      .from(testAttempts)
      .where(sql`${testAttempts.completedAt} >= NOW() - INTERVAL '30 days'`);

    // Total registered users (for active %)
    const [[totalRegUsers]] = await Promise.all([
      db.select({ count: count() }).from(users),
    ]);

    const avgSessionsPerActiveUser = activeUsers && Number(activeUsers.activeUserCount) > 0
      ? Math.round((Number(activeUsers.totalSessions) / Number(activeUsers.activeUserCount)) * 10) / 10
      : 0;

    // 5. Question reports summary
    const reportSummary = await db
      .select({
        status: questionReports.status,
        count: count(),
      })
      .from(questionReports)
      .groupBy(questionReports.status);

    const reportTrend = await db
      .select({
        week: sql<string>`TO_CHAR(${questionReports.createdAt}, 'YYYY-IW')`,
        count: count(),
      })
      .from(questionReports)
      .where(sql`${questionReports.createdAt} >= NOW() - INTERVAL '30 days'`)
      .groupBy(sql`TO_CHAR(${questionReports.createdAt}, 'YYYY-IW')`)
      .orderBy(sql`TO_CHAR(${questionReports.createdAt}, 'YYYY-IW')`);

    const reportsByStatus = {
      pending: 0,
      in_progress: 0,
      resolved: 0,
    };
    for (const r of reportSummary) {
      if (r.status === 'pending') reportsByStatus.pending = Number(r.count);
      else if (r.status === 'in_progress') reportsByStatus.in_progress = Number(r.count);
      else if (r.status === 'resolved') reportsByStatus.resolved = Number(r.count);
    }

    // 6. CEFR level distribution — estimate from avg scores per user
    const userAvgScores = await db
      .select({
        userId: testAttempts.userId,
        avgScore: sql<number>`ROUND(AVG(CAST(${testAttempts.score} AS NUMERIC)), 1)`,
      })
      .from(testAttempts)
      .groupBy(testAttempts.userId);

    const cefrDist: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
    for (const u of userAvgScores) {
      const level = estimateCefrLevel(Number(u.avgScore));
      cefrDist[level] = (cefrDist[level] ?? 0) + 1;
    }

    // 7. Full Mock Exam analytics
    const fullTestAttempts = await db
      .select({
        id: testAttempts.id,
        userId: testAttempts.userId,
        score: testAttempts.score,
        status: testAttempts.status,
        totalQuestions: testAttempts.totalQuestions,
        correctAnswers: testAttempts.correctAnswers,
        timeRemainingSeconds: testAttempts.timeRemainingSeconds,
        adaptivePath: testAttempts.adaptivePath,
        currentLevels: testAttempts.currentLevels,
        startedAt: testAttempts.startedAt,
        completedAt: testAttempts.completedAt,
      })
      .from(testAttempts)
      .where(sql`${testAttempts.testTypeId} = 'full-test'`)
      .orderBy(sql`${testAttempts.id} DESC`);

    const totalFullTests = fullTestAttempts.length;
    const completedFullTests = fullTestAttempts.filter((a) => a.status === 'completed');
    const inProgressFullTests = fullTestAttempts.filter((a) => a.status === 'in_progress').length;
    const completedCount = completedFullTests.length;
    const cancelledCount = totalFullTests - completedCount - inProgressFullTests;

    const completionRate = totalFullTests > 0 ? Math.round((completedCount / totalFullTests) * 1000) / 10 : 0;

    const fullTestScores = completedFullTests
      .map((a) => parseFloat(a.score ?? '0'))
      .filter((s) => s > 0);
    const fullTestAvgScore = fullTestScores.length > 0
      ? Math.round((fullTestScores.reduce((s, v) => s + v, 0) / fullTestScores.length) * 10) / 10
      : 0;

    const fullTestTimesSecs = completedFullTests
      .filter((a) => a.timeRemainingSeconds != null)
      .map((a) => 3600 - (a.timeRemainingSeconds ?? 0));
    const avgTimeSecs = fullTestTimesSecs.length > 0
      ? Math.round(fullTestTimesSecs.reduce((s, v) => s + v, 0) / fullTestTimesSecs.length)
      : 0;

    const PART_LABELS: Record<string, string> = {
      'focus-form': 'Grammar',
      'focus-meaning': 'Vocabulary',
      'form-meaning': 'Cloze',
      'listening': 'Listening',
    };

    const perPartTotals: Record<string, { total: number; correct: number }> = {};
    for (const attempt of completedFullTests) {
      const path = (attempt.adaptivePath ?? []) as Array<{
        questionId: number; testTypeId: string; wasCorrect: boolean;
      }>;
      for (const entry of path) {
        const key = entry.testTypeId;
        if (!perPartTotals[key]) perPartTotals[key] = { total: 0, correct: 0 };
        perPartTotals[key].total++;
        if (entry.wasCorrect) perPartTotals[key].correct++;
      }
    }

    const fullTestPerPart = Object.entries(perPartTotals).map(([type, data]) => ({
      testTypeId: type,
      label: PART_LABELS[type] ?? type,
      total: data.total,
      correct: data.correct,
      rate: data.total > 0 ? Math.round((data.correct / data.total) * 1000) / 10 : 0,
    }));

    const fullTestCefrDist: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
    for (const score of fullTestScores) {
      const level = estimateCefrLevel(score);
      fullTestCefrDist[level] = (fullTestCefrDist[level] ?? 0) + 1;
    }

    const recentFullTests = completedFullTests.slice(0, 10).map((a) => {
      const sc = parseFloat(a.score ?? '0');
      return {
        id: a.id,
        score: sc,
        cefrLevel: estimateCefrLevel(sc),
        totalQuestions: a.totalQuestions ?? 0,
        correctAnswers: a.correctAnswers ?? 0,
        completedAt: a.completedAt ? new Date(a.completedAt).toISOString() : null,
      };
    });

    const recentFullTestUserIds = Array.from(new Set(completedFullTests.slice(0, 10).map((a) => a.userId)));
    const recentFullTestUsers = recentFullTestUserIds.length > 0
      ? await db
          .select({ id: users.id, name: users.name, email: users.email, image: users.image })
          .from(users)
          .where(sql`${users.id} = ANY(ARRAY[${sql.join(recentFullTestUserIds.map((id) => sql`${id}`), sql`, `)}]::text[])`)
      : [];
    const recentUserMap = new Map(recentFullTestUsers.map((u) => [u.id, u]));

    const fullTestAnalytics = {
      totalAttempts: totalFullTests,
      completedCount,
      inProgressCount: inProgressFullTests,
      cancelledCount,
      completionRate,
      avgScore: fullTestAvgScore,
      avgTimeSecs,
      perPart: fullTestPerPart,
      cefrDistribution: Object.entries(fullTestCefrDist).map(([level, count]) => ({ level, count })),
      recentAttempts: recentFullTests.slice(0, 10).map((a) => {
        const attempt = completedFullTests.find((c) => c.id === a.id);
        return {
          ...a,
          user: attempt ? (recentUserMap.get(attempt.userId) ?? null) : null,
        };
      }),
    };

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalUsers: totalUsers?.count ?? 0,
          totalAttempts: totalAttempts?.count ?? 0,
          overallAvgScore: overallAvg?.avg ?? 0,
        },
        attemptsByType: attemptsByTypeNamed,
        attemptsOverTime,
        scoreDistribution,
        topPerformers: topPerformersHydrated,
        // New sections
        questionAnalytics: {
          correctRateByType: correctRateByTypeNamed,
          hardestQuestions,
        },
        userRetention: {
          newUsersThisMonth: Number(userRetention?.newUsersThisMonth ?? 0),
          activeUsersLast30d: Number(activeUsers?.activeUserCount ?? 0),
          avgSessionsPerActiveUser,
          totalRegisteredUsers: totalRegUsers?.count ?? 0,
        },
        questionReports: {
          byStatus: reportsByStatus,
          trend: reportTrend,
        },
        cefrDistribution: Object.entries(cefrDist).map(([level, count]) => ({
          level,
          count,
        })),
        fullTestAnalytics,
      },
    });
  } catch (err) {
    console.error('[admin/reports] Error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch reports' }, { status: 500 });
  }
}
