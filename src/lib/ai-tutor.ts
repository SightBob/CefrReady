import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { users } from '@/db/schema';
import { getAiTutorConfig } from './ai-tutor/config';
import { aiTutorMasterSwitchEnabled, isAiTutorEnabledByFlags } from './ai-tutor/flags';

// re-export เพื่อให้จุดเรียกเดิม (src/lib/ai-tutor.ts) ยังใช้ได้
export {
  aiTutorInRollout,
  aiTutorMasterSwitchEnabled,
  aiTutorRolloutBucket,
  aiTutorRolloutPercent,
  isAiTutorEnabledByFlags,
} from './ai-tutor/flags';

/**
 * Feature flag AI Tutor — ฝั่งเซิร์ฟเวอร์เท่านั้น สุดท้ายผู้เรียนได้รับแค่ boolean
 * (ส่งผ่าน /api/tests/ai-tutor-access) — ห้ามคำนวณใน client และห้ามพึ่งหน้าต่าง
 * NEXT_PUBLIC_* อย่างเดียว เพราะโค้ดฝั่ง client โหลดลงเบราว์เซอร์และทุกคนอ่านได้
 *
 * ลำดับการเช็ค:
 * 1. master switch — env AI_TUTOR_ENABLED: ไม่ตั้งหรือเป็น "false" → ปิดกับทุกคนทันที
 *    (ไม่แตะ DB ด้วย)
 * 2. สิทธิ์กำหนดเฉพาะบัญชี — users.ai_tutor_access (boolean, default false)
 *    เปิดให้คนที่นั้นด้วย: npx tsx scripts/ai-tutor-access.ts grant <email>
 * 3. rollout เปอร์เซ็นต์ (ทางเลือก ปิดไว้เป็นค่าเริ่มต้น) — env AI_TUTOR_ROLLOUT_PERCENT
 *    0..100 สุ่มแบบคงที่ตาม hash ของ user id: คนเดิมได้ผลเดิมเสมอจนกว่าจะเลื่อนค่า
 *    ถ้าวันหนึ่งขยับเปอร์เซ็นต์สูงขึ้น คนที่เคยเข้ากลุ่ม (bucket < เปอร์เซ็นต์) ยังอยู่กลุ่มเดิม
 *
 * ค่าทั้งหมด (รวม master switch และ rollout) อ่านจาก getAiTutorConfig()
 * → DB ทับ env ได้ (ผู้ดูแลตั้งจากหน้า admin ได้) แต่เปิดทับ env ที่ปิดอยู่ไม่ได้
 */
export async function isAiTutorEnabled(user: { id: string } | null | undefined): Promise<boolean> {
  // master switch (env) ปิด → จบทันที ไม่แตะ DB เลย (เหมือนเดิม)
  if (!user?.id || !aiTutorMasterSwitchEnabled()) return false;

  // ค่าจาก config = DB ทับ env (สวิตช์ปิดชั่วคราวอยู่ใน DB ได้ แต่เปิดทับ env ที่ปิดไม่ได้)
  const config = await getAiTutorConfig();
  if (!config.runtimeEnabled) return false;

  // ถ้า master ไม่เปิดก็จบก่อนแล้ว — จะถึงคิวรี DB ได้ต่อเมื่อ master เปิดเท่านั้น
  const rows: { aiTutorAccess?: boolean }[] = await db
    .select({ aiTutorAccess: users.aiTutorAccess })
    .from(users)
    .where(eq(users.id, user.id));

  return isAiTutorEnabledByFlags(user.id, rows[0]?.aiTutorAccess === true, {
    runtimeEnabled: config.runtimeEnabled,
    rolloutPercent: config.rolloutPercent,
  });
}
