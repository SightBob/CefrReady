import { NextRequest, NextResponse } from 'next/server';

import { withAdmin } from '@/lib/admin-route';
import { listAiTutorAudit } from '@/lib/ai-tutor/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/ai-tutor/audit — ประวัติการเปลี่ยนค่าโดยผู้ดูแล (ล่าสุดก่อน)
 */
export async function GET(request: NextRequest) {
  const { error } = await withAdmin({ keySuffix: 'admin:ai-tutor-audit', maxRequests: 60 });
  if (error) return error;

  const limit = Number.parseInt(new URL(request.url).searchParams.get('limit') ?? '50', 10);
  const rows = await listAiTutorAudit(Number.isFinite(limit) ? limit : 50);

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
