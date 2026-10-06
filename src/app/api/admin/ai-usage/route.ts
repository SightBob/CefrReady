import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { aiUsageLogs, users } from '@/db/schema';
import { and, count, desc, eq, gte, sql, sum } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

const WINDOWS = { all: null, '7d': 7, '30d': 30 } as const;
type WindowKey = keyof typeof WINDOWS;

const windowSchema = new Set<WindowKey>(['all', '7d', '30d']);

const getCachedUsage = unstable_cache(
  async (window: Exclude<WindowKey, 'all'> | 'all') => {
    const days = WINDOWS[window];
    const since = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;
    const periodFilter = since ? gte(aiUsageLogs.createdAt, since) : undefined;

    const summaryRows = await db
      .select({
        totalRequests: count(),
        promptTokens: sum(aiUsageLogs.promptTokens),
        completionTokens: sum(aiUsageLogs.completionTokens),
        totalTokens: sum(aiUsageLogs.totalTokens),
        errorCount: sql<number>`count(*) filter (where ${aiUsageLogs.status} = 'error')::int`,
        latencyAvgMs: sql<number>`coalesce(round(avg(${aiUsageLogs.latencyMs}))::int, 0)`,
      })
      .from(aiUsageLogs)
      .where(periodFilter);

    const summary = summaryRows[0] ?? {
      totalRequests: 0, promptTokens: '0', completionTokens: '0', totalTokens: '0', errorCount: 0, latencyAvgMs: 0,
    };

    const perUserRows = await db
      .select({
        userId: aiUsageLogs.userId,
        userName: users.name,
        userEmail: users.email,
        requests: count(),
        promptTokens: sum(aiUsageLogs.promptTokens),
        completionTokens: sum(aiUsageLogs.completionTokens),
        totalTokens: sum(aiUsageLogs.totalTokens),
        lastUsedAt: sql<string | null>`max(${aiUsageLogs.createdAt})::text`,
      })
      .from(aiUsageLogs)
      .leftJoin(users, eq(users.id, aiUsageLogs.userId))
      .where(periodFilter)
      .groupBy(aiUsageLogs.userId, users.name, users.email)
      .orderBy(desc(sum(aiUsageLogs.totalTokens)))
      .limit(200);

    return {
      window,
      summary: {
        totalRequests: Number(summary.totalRequests) || 0,
        promptTokens: Number(summary.promptTokens) || 0,
        completionTokens: Number(summary.completionTokens) || 0,
        totalTokens: Number(summary.totalTokens) || 0,
        errorCount: Number(summary.errorCount) || 0,
        latencyAvgMs: Number(summary.latencyAvgMs) || 0,
      },
      perUser: perUserRows.map(row => ({
        userId: row.userId,
        userName: row.userName,
        userEmail: row.userEmail,
        requests: Number(row.requests) || 0,
        promptTokens: Number(row.promptTokens) || 0,
        completionTokens: Number(row.completionTokens) || 0,
        totalTokens: Number(row.totalTokens) || 0,
        lastUsedAt: row.lastUsedAt,
      })),
    };
  },
  ['admin-ai-usage'],
  { revalidate: 60, tags: ['ai-usage'] },
);

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  const windowParam = request.nextUrl.searchParams.get('window') ?? 'all';
  const window: WindowKey = windowSchema.has(windowParam as WindowKey) ? (windowParam as WindowKey) : 'all';
  try {
    const data = await getCachedUsage(window);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[admin-ai-usage] query failed:', err);
    return NextResponse.json({ success: false, error: 'โหลดข้อมูลการใช้ AI ไม่สำเร็จ' }, { status: 503 });
  }
}
