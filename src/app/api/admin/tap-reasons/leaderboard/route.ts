import { NextResponse } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { tapReasonSubmissions, users } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** จำนวนผู้ใช้สูงสุดที่แสดงในตารางอันดับ */
const MAX_ROWS = 200;

export interface TapReasonLeaderboardRow {
  rank: number;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  totalPoints: number;
  totalReasons: number;
  scoredReasons: number;
  lastScoredAt: string | null;
}

/**
 * GET /api/admin/tap-reasons/leaderboard
 * อันดับคะแนนเก็บรายคน — คะแนนรวมจากเหตุผลที่ให้คะแนนแล้ว (rewardPoints ไม่เป็น null)
 * ใครที่เขียนเหตุผลแล้วแต่ยังไม่ถูกให้คะแนน ยังอยู่ในตารางพร้อม 0 คะแนน (ดูได้จากคอลัมน์ “เหตุผลที่ให้คะแนน”)
 * ส่วนคนที่ไม่เคยเขียนเหตุผลเลยจะไม่ปรากฏ เพราะไม่มีแถวในตารางนี้
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const rows = await db
      .select({
        userId: tapReasonSubmissions.userId,
        userName: users.name,
        userEmail: users.email,
        // pg คืน SUM/COUNT ของ integer มาเป็น string — แปลงเป็น number ตอน map
        totalPoints: sql<number>`COALESCE(SUM(${tapReasonSubmissions.rewardPoints}), 0)`,
        totalReasons: sql<number>`COUNT(*)`,
        scoredReasons: sql<number>`COUNT(${tapReasonSubmissions.rewardPoints})`,
        lastScoredAt: sql<string | null>`MAX(${tapReasonSubmissions.scoredAt})`,
      })
      .from(tapReasonSubmissions)
      .innerJoin(users, eq(users.id, tapReasonSubmissions.userId))
      .groupBy(tapReasonSubmissions.userId, users.name, users.email)
      .orderBy(desc(sql`COALESCE(SUM(${tapReasonSubmissions.rewardPoints}), 0)`))
      .limit(MAX_ROWS);

    const sorted = rows.map((row) => ({
      userId: row.userId,
      userName: row.userName,
      userEmail: row.userEmail,
      totalPoints: Number(row.totalPoints ?? 0),
      totalReasons: Number(row.totalReasons ?? 0),
      scoredReasons: Number(row.scoredReasons ?? 0),
      lastScoredAt: row.lastScoredAt ? String(row.lastScoredAt) : null,
    }));

    // คะแนนเท่ากันได้อันดับเดียวกัน (อันดับถัดไปข้ามตามจำนวนที่เสมอกัน)
    let previousPoints: number | null = null;
    let previousRank = 0;
    const data: TapReasonLeaderboardRow[] = sorted.map((row, index) => {
      const rank = previousPoints !== null && row.totalPoints === previousPoints ? previousRank : index + 1;
      previousPoints = row.totalPoints;
      previousRank = rank;
      return { rank, ...row };
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[GET /api/admin/tap-reasons/leaderboard] error:', err);
    return NextResponse.json({ error: 'Failed to fetch reward leaderboard' }, { status: 500 });
  }
}
