import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, testAttempts, testTypes, userProgress } from '@/db/schema';
import { count, avg, sql, desc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

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
      },
    });
  } catch (err) {
    console.error('[admin/reports] Error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch reports' }, { status: 500 });
  }
}
