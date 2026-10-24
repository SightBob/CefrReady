import { NextResponse } from 'next/server';

import { withAdmin } from '@/lib/admin-route';
import { getAiTutorConfig } from '@/lib/ai-tutor/config';
import { AI_TUTOR_MIGRATION_MISSING_MESSAGE, warnWithSummary } from '@/lib/ai-tutor/errors';
import { getAiTutorUsageSnapshot } from '@/lib/ai-tutor/usage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/ai-tutor/usage — สถิติการใช้งานวันนี้ (เวลาไทย) เทียบเพดานที่ใช้งานจริง
 *
 * ใช้ในหน้า /admin/ai-tutor (การ์ด "การใช้วันนี้") ซึ่งเรียกซ้ำทุก ~30 วินาที
 * → จำกัด 120 ครั้ง/นาทีต่อแอดมิน และตอบด้วย no-store (ห้าม cache)
 *
 * เพดานที่ส่งกลับมาเป็นค่าที่มีผลจริง (DB ทับ env) → ตัวเลขบนหน้าจอตรงกับที่ระบบบังคับ
 */
export async function GET() {
  const { error } = await withAdmin({ keySuffix: 'admin:ai-tutor-usage', maxRequests: 120 });
  if (error) return error;

  try {
    const [snapshot, config] = await Promise.all([getAiTutorUsageSnapshot(), getAiTutorConfig()]);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...snapshot,
          limits: {
            systemDailyLimit: config.systemDailyLimit,
            userDailyLimit: config.userDailyLimit,
            questionQuota: config.questionQuota,
          },
          runtimeEnabled: config.runtimeEnabled,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    // ตารางยังไม่มี (migration ยังไม่รัน) หรือ DB ล่ม → 503 พร้อมข้อความที่ผู้ดูแลเข้าใจ
    warnWithSummary('ai-tutor] อ่านสถิติการใช้งานไม่สำเร็จ', error);
    return NextResponse.json(
      { success: false, error: AI_TUTOR_MIGRATION_MISSING_MESSAGE },
      { status: 503 },
    );
  }
}
