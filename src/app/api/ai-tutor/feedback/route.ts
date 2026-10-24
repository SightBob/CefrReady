import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { aiTutorFeedback, aiTutorMessages } from '@/db/schema';
import { auth } from '@/lib/auth';
import { isAiTutorEnabled } from '@/lib/ai-tutor';
import { checkUserRateLimit, validateOrigin } from '@/lib/api-security';
import {
  AI_TUTOR_FEEDBACK_RATE_LIMIT_MESSAGE,
  AI_TUTOR_NO_ACCESS_MESSAGE,
  AI_TUTOR_UNAVAILABLE_MESSAGE,
  localizedRateLimitError,
  warnWithSummary,
} from '@/lib/ai-tutor/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** เก็บถัง/นับโควตา = คิวรี DB ไม่กี่ตัว */
export const maxDuration = 15;

const bodySchema = z.object({
  messageId: z.number().int().positive(),
  value: z.enum(['up', 'down']),
}).strict();

/** จำกัดการกด 👍/👎 ต่อนาที (30/นาที/คน) — กันยิง feedback ซ้ำ (ข้อมูลเสียหายน้อย แต่กินคิวรี) */
const FEEDBACK_MINUTE_LIMIT = { keySuffix: 'ai-tutor:feedback', maxRequests: 30 } as const;

/**
 * POST /api/ai-tutor/feedback — ผู้เรียนกด 👍/👎 ต่อคำตอบของโมเดล
 *
 * กฎ:
 * - ต้องล็อกอิน + ผ่าน feature flag (isAiTutorEnabled) ไม่ผ่าน = 403
 * - ข้อความต้องเป็นของผู้ใช้คนนั้นเอง และเป็น "ข้อความจากโมเดล" (role = assistant)
 *   ของเธรด (user, question) เดียวกัน → กดข้อความของคนอื่นหรือเทิร์นแรก (คำอธิบายเดิม) ไม่ได้
 * - กดซ้ำครั้งเดียวกัน → อัปเดตค่าเดิม (อยู่ใน unique (message_id, user_id))
 */
export async function POST(request: Request) {
  const originError = validateOrigin(request);
  if (originError) return originError;

  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนให้ความเห็น' }, { status: 401 });
  }
  const userId = session.user.id;
  if (!(await isAiTutorEnabled({ id: userId }))) {
    return Response.json({ success: false, error: AI_TUTOR_NO_ACCESS_MESSAGE }, { status: 403 });
  }

  const minuteLimited = await checkUserRateLimit(userId, FEEDBACK_MINUTE_LIMIT);
  if (minuteLimited) {
    return localizedRateLimitError(minuteLimited, AI_TUTOR_FEEDBACK_RATE_LIMIT_MESSAGE);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ success: false, error: 'คำขอไม่ถูกต้อง' }, { status: 400 });
  }
  const { messageId, value } = parsed.data;

  try {
    // ข้อความต้องเป็นของผู้ใช้คนนี้เอง + เป็นข้อความจากโมเดล
    const [message] = await db
      .select({
        id: aiTutorMessages.id,
        role: aiTutorMessages.role,
        userId: aiTutorMessages.userId,
      })
      .from(aiTutorMessages)
      .where(and(
        eq(aiTutorMessages.id, messageId),
        eq(aiTutorMessages.userId, userId),
        eq(aiTutorMessages.role, 'assistant'),
      ))
      .limit(1);

    if (!message) {
      return Response.json({ success: false, error: 'ไม่พบข้อความนี้ในเธรดของคุณ' }, { status: 404 });
    }

    // กดซ้ำ → อัปเดตค่าเดิม (upsert)
    await db
      .insert(aiTutorFeedback)
      .values({ messageId, userId, value })
      .onConflictDoUpdate({
        target: [aiTutorFeedback.messageId, aiTutorFeedback.userId],
        set: { value, createdAt: new Date() },
      });
  } catch (error) {
    // ฐานข้อมูลล่ม/ยังไม่ได้รัน migration → 503 ที่ผู้เรียนอ่านรู้เรื่อง
    warnWithSummary('ai-tutor] บันทึก feedback ไม่สำเร็จ', error);
    return Response.json({ success: false, error: AI_TUTOR_UNAVAILABLE_MESSAGE }, { status: 503 });
  }

  return Response.json({ success: true, messageId, value });
}
