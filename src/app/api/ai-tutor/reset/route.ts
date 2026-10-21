import { z } from 'zod';

import { auth } from '@/lib/auth';
import { isAiTutorEnabled } from '@/lib/ai-tutor';
import { archiveThread } from '@/lib/ai-tutor/messages';
import { getQuotaSnapshot } from '@/lib/ai-tutor/quota';
import { getAiTutorConfig } from '@/lib/ai-tutor/config';
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

/** เก็บถังข้อความ + นับโควตา = คิวรี DB ไม่กี่ตัว ไม่ต้องรอโมเดล */
export const maxDuration = 15;

const bodySchema = z.object({
  questionId: z.number().int().positive(),
  /** รหัสรอบการทำข้อสอบ — เก็บถังเฉพาะรอบนี้ */
  attemptKey: z.string().trim().min(8).max(64).regex(ATTEMPT_KEY_PATTERN),
}).strict();

/** จำกัดการเริ่มคำถามใหม่ต่อนาที (10/นาที/คน) — กันยิง archive ซ้ำ */
const RESET_MINUTE_LIMIT = { keySuffix: 'ai-tutor:reset', maxRequests: 10 } as const;

/**
 * POST /api/ai-tutor/reset — เริ่มบริบทใหม่ของข้อนั้น
 *
 * ข้อความเดิมถูก "เก็บถัง" (archived) ไม่ถูกลบ และ **ไม่คืนโควตา**
 * (โควตานับจากแถวที่เรียกโมเดลจริง ไม่ว่าจะถูกเก็บถังหรือไม่)
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

  const minuteLimited = await checkUserRateLimit(userId, RESET_MINUTE_LIMIT);
  if (minuteLimited) {
    return localizedRateLimitError(minuteLimited, AI_TUTOR_RESET_RATE_LIMIT_MESSAGE);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ success: false, error: 'คำขอไม่ถูกต้อง' }, { status: 400 });
  }

  try {
    const archived = await archiveThread({
      userId,
      questionId: parsed.data.questionId,
      attemptKey: parsed.data.attemptKey,
    });
    // โควตาที่แสดง = ค่าจาก config (DB ทับ env) → ตรงกับที่บังคับจริง
    const config = await getAiTutorConfig();
    const quota = await getQuotaSnapshot({
      userId,
      questionId: parsed.data.questionId,
      limit: config.questionQuota,
    });
    return Response.json({ success: true, archived, quota });
  } catch (error) {
    // ฐานข้อมูลล่ม/ยังไม่ได้รัน migration → 503 ที่ผู้เรียนอ่านรู้เรื่อง
    warnWithSummary('ai-tutor] เริ่มคำถามใหม่ไม่สำเร็จ', error);
    return Response.json({ success: false, error: AI_TUTOR_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
}
