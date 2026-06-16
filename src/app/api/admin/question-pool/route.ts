import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, testTypes, testAttempts, questionSelectionLogs } from '@/db/schema';
import { eq, count, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';
import { unstable_cache } from 'next/cache';
import { type CefrLevel, CEFR_LEVELS } from '@/lib/full-test/constants';

const COVERAGE_THRESHOLDS: Record<string, { low: number; good: number }> = {
  'focus-form':    { low: 5, good: 10 },
  'focus-meaning': { low: 5, good: 10 },
  'form-meaning':  { low: 2, good: 4 },
  'listening':     { low: 5, good: 10 },
};

const getCachedQuestionPoolData = unstable_cache(
  async () => {
    const testTypeList = await db.select().from(testTypes);

    const coverageRaw = await db
      .select({
        testTypeId: questions.testTypeId,
        cefrLevel: questions.cefrLevel,
        count: count(),
      })
      .from(questions)
      .where(eq(questions.active, 'true'))
      .groupBy(questions.testTypeId, questions.cefrLevel);

    const testTypeMap = new Map(testTypeList.map((t) => [t.id, t.name]));

    const coverageMap = new Map<string, Record<string, number>>();
    for (const row of coverageRaw) {
      if (!coverageMap.has(row.testTypeId)) {
        coverageMap.set(row.testTypeId, {});
      }
      const levelCounts = coverageMap.get(row.testTypeId)!;
      levelCounts[row.cefrLevel] = Number(row.count);
    }

    const coverageMatrix = testTypeList.map((tt) => {
      const counts: Record<string, number> = {};
      let total = 0;
      const levelCounts = coverageMap.get(tt.id) ?? {};
      for (const level of CEFR_LEVELS) {
        counts[level] = Number(levelCounts[level] ?? 0);
        total += counts[level];
      }

      const threshold = COVERAGE_THRESHOLDS[tt.id] ?? { low: 5, good: 10 };
      const levelsAtRisk: CefrLevel[] = CEFR_LEVELS.filter(
        (level) => counts[level] < threshold.low,
      );

      return {
        testTypeId: tt.id,
        testTypeName: tt.name,
        counts: counts as Record<CefrLevel, number>,
        total,
        levelsAtRisk,
      };
    });

    const selectionStats30 = await db
      .select({
        testTypeId: questionSelectionLogs.testTypeId,
        mode: questionSelectionLogs.mode,
        count: count(),
      })
      .from(questionSelectionLogs)
      .where(sql`${questionSelectionLogs.createdAt} >= NOW() - INTERVAL '30 days'`)
      .groupBy(questionSelectionLogs.testTypeId, questionSelectionLogs.mode);

    const selectionStatsAll = await db
      .select({
        testTypeId: questionSelectionLogs.testTypeId,
        mode: questionSelectionLogs.mode,
        count: count(),
      })
      .from(questionSelectionLogs)
      .groupBy(questionSelectionLogs.testTypeId, questionSelectionLogs.mode);

    function buildSelectionBucket(
      rows: Array<{ testTypeId: string; mode: string; count: number }>,
    ) {
      const map = new Map<string, { exact: number; fallback: number; reuse: number; total: number }>();
      for (const row of rows) {
        if (!map.has(row.testTypeId)) {
          map.set(row.testTypeId, { exact: 0, fallback: 0, reuse: 0, total: 0 });
        }
        const bucket = map.get(row.testTypeId)!;
        const n = Number(row.count);
        bucket.total += n;
        if (row.mode === 'exact') bucket.exact += n;
        else if (row.mode === 'fallback') bucket.fallback += n;
        else if (row.mode === 'reuse') bucket.reuse += n;
      }
      return Array.from(map.entries()).map(([testTypeId, data]) => ({
        testTypeId,
        ...data,
      }));
    }

    const completedAttempts = await db
      .select({
        currentLevels: testAttempts.currentLevels,
      })
      .from(testAttempts)
      .where(
        sql`${testAttempts.status} = 'completed' AND ${testAttempts.testTypeId} = 'full-test' AND ${testAttempts.currentLevels} IS NOT NULL`,
      );

    const reachedMap = new Map<string, Record<string, number>>();
    for (const attempt of completedAttempts) {
      const levels = attempt.currentLevels as Record<string, string> | null;
      if (!levels) continue;
      for (const [typeId, level] of Object.entries(levels)) {
        if (!reachedMap.has(typeId)) {
          reachedMap.set(typeId, {});
        }
        const lc = reachedMap.get(typeId)!;
        lc[level] = (lc[level] ?? 0) + 1;
      }
    }

    const reachedLevelDistribution = testTypeList
      .filter((tt) =>
        ['focus-form', 'focus-meaning', 'form-meaning', 'listening'].includes(tt.id),
      )
      .map((tt) => {
        const counts: Record<string, number> = {};
        let total = 0;
        const lc = reachedMap.get(tt.id) ?? {};
        for (const level of CEFR_LEVELS) {
          counts[level] = Number(lc[level] ?? 0);
          total += counts[level];
        }
        return {
          testTypeId: tt.id,
          testTypeName: tt.name,
          counts: counts as Record<CefrLevel, number>,
          total,
        };
      });

    return {
      testTypes: testTypeList.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        icon: t.icon,
      })),
      coverageMatrix,
      selectionStats: {
        last30Days: buildSelectionBucket(selectionStats30),
        allTime: buildSelectionBucket(selectionStatsAll),
      },
      reachedLevelDistribution,
    };
  },
  ['admin-question-pool'],
  { revalidate: 60, tags: ['question-pool'] },
);

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const data = await getCachedQuestionPoolData();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[admin/question-pool] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch question pool data' },
      { status: 500 },
    );
  }
}
