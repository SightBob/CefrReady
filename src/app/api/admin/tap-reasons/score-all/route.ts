import { NextResponse } from 'next/server';
import { asc, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { tapReasonSubmissions } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';
import { getTapReasonRewardSettings } from '@/lib/tap-reason-settings';

export const dynamic = 'force-dynamic';

/** จำนวนแถวสูงสุดต่อการกดหนึ่งครั้ง — กันการเขียนทั้งตารางในคำขอเดียว */
const MAX_BACKFILL_ROWS = 500;

/**
 * POST /api/admin/tap-reasons/score-all
 * ให้คะแนนเหมาย้อนหลังกับเหตุผลที่ยังค้างอยู่ (rewardPoints IS NULL) ตามคะแนนที่ตั้งไว้
 * จำกัดต่อครั้ง: ถ้ายังเหลือ ให้ผู้เรียกกดซ้ำ (ตอบ remaining = true)
 */
export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  let points: number;
  try {
    const settings = await getTapReasonRewardSettings();
    if (!settings.autoAward) {
      return NextResponse.json(
        { success: false, error: 'เปิดให้คะแนนอัตโนมัติก่อน จึงจะให้คะแนนย้อนหลังได้' },
        { status: 400 }
      );
    }
    points = settings.points;
  } catch {
    return NextResponse.json({ success: false, error: 'อ่านค่าคะแนนที่ตั้งไว้ไม่สำเร็จ' }, { status: 503 });
  }

  try {
    const targets = await db
      .select({ id: tapReasonSubmissions.id })
      .from(tapReasonSubmissions)
      .where(isNull(tapReasonSubmissions.rewardPoints))
      .orderBy(asc(tapReasonSubmissions.createdAt))
      .limit(MAX_BACKFILL_ROWS);

    if (targets.length === 0) {
      return NextResponse.json({ success: true, data: { scored: 0, points, remaining: false } });
    }

    const ids = targets.map((row) => row.id);
    await db
      .update(tapReasonSubmissions)
      .set({ rewardPoints: points, scoredAt: new Date() })
      .where(inArray(tapReasonSubmissions.id, ids));

    return NextResponse.json({
      success: true,
      data: { scored: ids.length, points, remaining: ids.length === MAX_BACKFILL_ROWS },
    });
  } catch (err) {
    console.error('[POST /api/admin/tap-reasons/score-all] error:', err);
    return NextResponse.json({ error: 'Failed to backfill reward points' }, { status: 500 });
  }
}
