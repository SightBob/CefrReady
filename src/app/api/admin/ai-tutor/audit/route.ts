import { NextRequest, NextResponse } from 'next/server';

import { withAdmin } from '@/lib/admin-route';
import { listAiTutorAudit } from '@/lib/ai-tutor/config';
import { AI_TUTOR_MIGRATION_MISSING_MESSAGE, warnWithSummary } from '@/lib/ai-tutor/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/ai-tutor/audit — ประวัติการเปลี่ยนค่าโดยผู้ดูแล (ล่าสุดก่อน)
 */
export async function GET(request: NextRequest) {
  const { error } = await withAdmin({ keySuffix: 'admin:ai-tutor-audit', maxRequests: 60 });
  if (error) return error;

  const limit = Number.parseInt(new URL(request.url).searchParams.get('limit') ?? '50', 10);
  let rows;
  try {
    rows = await listAiTutorAudit(Number.isFinite(limit) ? limit : 50);
  } catch (error) {
    // ตารางยังไม่มี (migration 0048 ยังไม่รัน) หรือ DB ล่ม → 503 พร้อมข้อความชัดเจน
    warnWithSummary('ai-tutor] อ่านประวัติการเปลี่ยนค่าไม่สำเร็จ', error);
    return NextResponse.json(
      { success: false, error: AI_TUTOR_MIGRATION_MISSING_MESSAGE },
      { status: 503 },
    );
  }

  return NextResponse.json({
    success: true,
    data: rows.map((row) => ({
      id: row.id,
      actorUserId: row.actorUserId,
      action: row.action,
      target: row.target,
      before: row.before,
      after: row.after,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}
