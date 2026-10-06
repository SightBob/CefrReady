import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { tapAiSettingsSchema } from '@/lib/tap-ai';
import { getTapAiSettings, hasOpenRouterKey, saveTapAiSettings } from '@/lib/tap-ai-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    return NextResponse.json({ success: true, data: await getTapAiSettings(), keyConfigured: hasOpenRouterKey() });
  } catch {
    return NextResponse.json({ success: false, error: 'โหลดการตั้งค่า AI ไม่สำเร็จ' }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  const parsed = tapAiSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? 'การตั้งค่าไม่ถูกต้อง' }, { status: 400 });
  }
  if (parsed.data.enabled && !hasOpenRouterKey()) {
    return NextResponse.json({ success: false, error: 'ต้องตั้ง OPENROUTER_API_KEY ที่ server ก่อนเปิด AI' }, { status: 400 });
  }
  try {
    await saveTapAiSettings(parsed.data);
    return NextResponse.json({ success: true, data: parsed.data, keyConfigured: hasOpenRouterKey() });
  } catch {
    return NextResponse.json({ success: false, error: 'บันทึกการตั้งค่า AI ไม่สำเร็จ' }, { status: 503 });
  }
}
