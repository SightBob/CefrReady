import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import {
  getSectionMaintenanceMap,
  setSectionMaintenance,
  isTestSectionId,
} from '@/lib/test-section-maintenance';

/**
 * Admin-only toggle ปิดปรับปรุงรายพาร์ทข้อสอบ (แยกจาก maintenance mode ทั้งเว็บ)
 *
 * GET  → { sections: { focus-form: boolean, ... } }
 * POST → body { sectionId, enabled } — สลับพาร์ทเดียว
 */

const bodySchema = z.object({
  sectionId: z.string(),
  enabled: z.boolean(),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    return NextResponse.json({ sections: await getSectionMaintenanceMap() });
  } catch (err) {
    console.error('[api/admin/test-sections-maintenance] GET failed:', err);
    return NextResponse.json({ success: false, error: 'Failed to read section maintenance state' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'sectionId และ enabled ต้องถูกต้อง' }, { status: 400 });
    }
    const { sectionId, enabled } = parsed.data;
    if (!isTestSectionId(sectionId)) {
      return NextResponse.json({ success: false, error: 'ไม่รู้จักพาร์ทข้อสอบนี้' }, { status: 400 });
    }

    const sections = await setSectionMaintenance(sectionId, enabled);
    return NextResponse.json({ success: true, sections });
  } catch (err) {
    console.error('[api/admin/test-sections-maintenance] POST failed:', err);
    return NextResponse.json({ success: false, error: 'Failed to update section maintenance' }, { status: 500 });
  }
}
