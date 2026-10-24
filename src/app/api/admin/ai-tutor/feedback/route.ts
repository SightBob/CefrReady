import { NextRequest, NextResponse } from 'next/server';

import { withAdmin } from '@/lib/admin-route';
import { getAiTutorFeedbackSummary } from '@/lib/ai-tutor/admin-feedback';
import { AI_TUTOR_MIGRATION_MISSING_MESSAGE, warnWithSummary } from '@/lib/ai-tutor/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** ช่วงเวลาที่เลือกได้: 1..365 วัน (ค่าเริ่มต้น 30) — ค่าผิดใช้ค่าเริ่มต้น ไม่ error */
function parseDays(raw: string | null): number {
  const value = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(value) || value < 1) return 30;
  return Math.min(365, value);
}

/**
 * GET /api/admin/ai-tutor/feedback — 👍/👎 ของผู้เรียน (อ่านอย่างเดียว)
 *
 * ใช้ในหน้า /admin/ai-tutor แท็บ "ความพึงพอใจ" — โหลดเมื่อกดเท่านั้น
 * จึงจำกัด 60 ครั้ง/นาทีต่อแอดมิน และตอบ no-store (ห้าม cache)
 */
export async function GET(request: NextRequest) {
  const { error } = await withAdmin({ keySuffix: 'admin:ai-tutor-feedback', maxRequests: 60 });
  if (error) return error;

  const days = parseDays(new URL(request.url).searchParams.get('days'));

  try {
    const summary = await getAiTutorFeedbackSummary(days);
    return NextResponse.json(
      {
        success: true,
        data: {
          ...summary,
          downvoted: summary.downvoted.map((row) => ({
            ...row,
            votedAt: row.votedAt.toISOString(),
          })),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    // ตารางยังไม่มี (migration ยังไม่รัน) หรือ DB ล่ม → 503 พร้อมข้อความที่ผู้ดูแลเข้าใจ
    warnWithSummary('ai-tutor] อ่านผล 👍/👎 ไม่สำเร็จ', error);
    return NextResponse.json(
      { success: false, error: AI_TUTOR_MIGRATION_MISSING_MESSAGE },
      { status: 503 },
    );
  }
}
