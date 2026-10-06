import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userProgress } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
import { getRateLimitIdentifier, rateLimit, rateLimitResponse } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      {
        status: 401,
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  }

  const identifier = `${getRateLimitIdentifier(request)}:progress-summary:${user.id}`;
  const rl = await rateLimit(identifier, { windowMs: 60_000, maxRequests: 30 });
  if (rl.limited) return rateLimitResponse(rl.retryAfterMs);

  try {
    const rows = await db
      .select({
        testsTaken: userProgress.testsTaken,
        averageScore: userProgress.averageScore,
      })
      .from(userProgress)
      .where(eq(userProgress.userId, user.id));

    const totals = rows.reduce(
      (acc, row) => {
        const testsTaken = row.testsTaken ?? 0;
        const averageScore = Number(row.averageScore) || 0;
        acc.testsTaken += testsTaken;
        acc.weightedScore += averageScore * testsTaken;
        return acc;
      },
      { testsTaken: 0, weightedScore: 0 }
    );

    const averageScore =
      totals.testsTaken > 0
        ? Math.round(totals.weightedScore / totals.testsTaken)
        : 0;

    return NextResponse.json(
      {
        success: true,
        data: {
          testsTaken: totals.testsTaken,
          averageScore,
        },
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('Error fetching progress summary:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch progress summary' },
      {
        status: 500,
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  }
}
