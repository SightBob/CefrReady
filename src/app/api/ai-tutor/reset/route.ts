import { z } from 'zod';

import { auth } from '@/lib/auth';
import { isAiTutorEnabled } from '@/lib/ai-tutor';
import { archiveThread } from '@/lib/ai-tutor/messages';
import { getQuotaSnapshot } from '@/lib/ai-tutor/quota';
import { validateOrigin } from '@/lib/api-security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** เก็บถังข้อความ + นับโควตา = คิวรี DB ไม่กี่ตัว ไม่ต้องรอโมเดล */
export const maxDuration = 15;

const bodySchema = z.object({
  questionId: z.number().int().positive(),
}).strict();

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
    return Response.json({ success: false, error: 'คุณยังไม่มีสิทธิ์ใช้งาน AI Tutor' }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ success: false, error: 'คำขอไม่ถูกต้อง' }, { status: 400 });
  }

  const archived = await archiveThread({ userId, questionId: parsed.data.questionId });
  const quota = await getQuotaSnapshot({ userId, questionId: parsed.data.questionId });

  return Response.json({ success: true, archived, quota });
}
