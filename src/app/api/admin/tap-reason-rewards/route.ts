import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import {
  getTapReasonRewardSettings,
  saveTapReasonRewardSettings,
  tapReasonRewardSettingsSchema,
} from '@/lib/tap-reason-settings';

export const dynamic = 'force-dynamic';

/** GET /api/admin/tap-reason-rewards — คะแนนเหมาที่ตั้งไว้ (ไม่มีคีย์ = ค่าเริ่มต้น 50) */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    return NextResponse.json({ success: true, data: await getTapReasonRewardSettings() });
  } catch {
    return NextResponse.json({ success: false, error: 'โหลดการตั้งค่าคะแนนไม่สำเร็จ' }, { status: 503 });
  }
}

/** PUT /api/admin/tap-reason-rewards — บันทึกคะแนนเหมา (autoAward + points) */
export async function PUT(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = tapReasonRewardSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'การตั้งค่าไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  try {
    await saveTapReasonRewardSettings(parsed.data);
    return NextResponse.json({ success: true, data: parsed.data });
  } catch {
    return NextResponse.json({ success: false, error: 'บันทึกการตั้งค่าคะแนนไม่สำเร็จ' }, { status: 503 });
  }
}
