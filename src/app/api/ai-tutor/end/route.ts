import { z } from 'zod';

import { auth } from '@/lib/auth';
import { isAiTutorEnabled } from '@/lib/ai-tutor';
import { archiveAttempt } from '@/lib/ai-tutor/messages';
import { checkUserRateLimit, validateOrigin } from '@/lib/api-security';
import {
  AI_TUTOR_NO_ACCESS_MESSAGE,
  AI_TUTOR_RESET_RATE_LIMIT_MESSAGE,
  AI_TUTOR_UNAVAILABLE_MESSAGE,
  localizedRateLimitError,
  warnWithSummary,
} from '@/lib/ai-tutor/errors';
import { ATTEMPT_KEY_PATTERN } from '@/lib/ai-tutor/attempt-key';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** เก็บถังข้อความ + ปิดรอบ = คิวรี DB ไม่กี่ตัว ไม่ต้องรอโมเดล */
export const maxDuration = 15;

const bodySchema = z.object({
  /** รหัสรอบการทำข้อสอบ — ปิดทั้งรอบ (ทุกข้อที่ถามในรอบนี้) */
  attemptKey: z.string().trim().min(8).max(64).regex(ATTEMPT_KEY_PATTERN),
}).strict();

/**
 * จำกัดการปิดรอบต่อนาที (30/นาที/คน)
 * - ปิดรอบเกิดได้หลายครั้งต่อชุด (ออกจากหน้า → กลับเข้ามา → ออกอีก)
 * - เผื่อ dev mode ที่ React เรียก effect ซ้ำ (StrictMode)
 */
const END_MINUTE_LIMIT = { keySuffix: 'ai-tutor:end', maxRequests: 30 } as const;

/**
 * POST /api/ai-tutor/end — จบรอบการทำข้อสอบ → รีเซ็ตประวัติการคุยกับ AI
 *
 * ข้อความทั้งหมดของรอบนั้นถูก "เก็บถัง" (archived) ทั้งรอบ ไม่ลบ และ **ไม่คืนโควตา**
 * (โควตานับจากแถวที่เรียกโมเดลจริง ไม่ว่าจะถูกเก็บถังหรือไม่)
 *
 * ฝั่ง client จะหมุนรหัสรอบ (attemptKey) ควบคู่กัน → ครั้งหน้าที่กลับมาเข้าชุดเดิม
 * จะได้แชทใหม่ทันที แม้การเก็บถังบนเซิร์ฟเวอร์จะไม่ทัน
 */
export async function POST(request: Request) {
  const originError = validateOrigin(request);
  if (originError) return originError;

  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน AI Tutor' }, { status: 401 });
  }
  const userId = session.user.id;
  if (!(await isAiTutorEnabled({ id: userId }))) {
    return Response.json({ success: false, error: AI_TUTOR_NO_ACCESS_MESSAGE }, { status: 403 });
  }

  const minuteLimited = await checkUserRateLimit(userId, END_MINUTE_LIMIT);
  if (minuteLimited) {
    return localizedRateLimitError(minuteLimited, AI_TUTOR_RESET_RATE_LIMIT_MESSAGE);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ success: false, error: 'คำขอไม่ถูกต้อง' }, { status: 400 });
  }

  try {
    // จำกัดขอบเขตด้วย userId เสมอ → ผู้เรียนปิดรอบของตัวเองได้เท่านั้น
    const archived = await archiveAttempt({ userId, attemptKey: parsed.data.attemptKey });
    return Response.json({ success: true, archived });
  } catch (error) {
    // ฐานข้อมูลล่ม/ยังไม่ได้รัน migration → 503 ที่ผู้เรียนอ่านรู้เรื่อง
    warnWithSummary('ai-tutor] ปิดรอบบทสนทนาไม่สำเร็จ', error);
    return Response.json({ success: false, error: AI_TUTOR_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
}
