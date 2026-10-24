import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { isAiTutorEnabled } from '@/lib/ai-tutor';
import { AI_TUTOR_UNAVAILABLE_MESSAGE, warnWithSummary } from '@/lib/ai-tutor/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tests/ai-tutor-access
 *
 * คืนว่าผู้เรียนคนนี้เห็น AI Tutor หรือยัง — ประเด็นคือธงฝั่งเซิร์ฟเวอร์:
 * master switch + users.ai_tutor_access + rollout % ตาม src/lib/ai-tutor.ts
 * คำตอบเป็น boolean เหมือนเดียว ไม่เปิดเผยเงื่อนไขการตั้งค่า env ไม่ขึ้นกับ query
 * (เปลือกๆ แง ?tutor=1 ไม่มีผลอะไรแล้ว หน้าจริงไม่อ่าน query string ของธงนี้อีก)
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน AI Tutor' }, { status: 401 });
  }

  try {
    const enabled = await isAiTutorEnabled({ id: session.user.id });
    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    // ฐานข้อมูลล่ม/ยังไม่ได้รัน migration → 503 (หน้าเว็บถือว่าไม่มีสิทธิ์ → ซ่อนกรอบ AI)
    warnWithSummary('ai-tutor] ตรวจสิทธิ์ไม่สำเร็จ', error);
    return NextResponse.json({ success: false, error: AI_TUTOR_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
}
