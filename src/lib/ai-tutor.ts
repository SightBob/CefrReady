import { createHash } from 'node:crypto';

import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { users } from '@/db/schema';
/**
 * Feature flag AI Tutor — ฝั่งเซิร์ฟเวอร์เท่านั้น สุดท้ายผู้เรียนได้รับแค่ boolean
 * (ส่งผ่าน /api/tests/ai-tutor-access) — ห้ามคำนวณใน client และห้ามพึ่งพา
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
 */
export function aiTutorMasterSwitchEnabled(): boolean {
  const raw = process.env.AI_TUTOR_ENABLED?.trim().toLowerCase();
  return raw === '1' || raw === 'true';
}

/** กลุ่ม (bucket) ถาวร 0..99 ของผู้ใช้ — ต่อกันเองตาม hash ของ user id */
export function aiTutorRolloutBucket(userId: string): number {
  const hex = createHash('sha256').update(`ai-tutor:${userId}`).digest('hex');
  return parseInt(hex.slice(0, 12), 16) % 100;
}

/** เปอร์เซ็นต์ rollout (0..100) — 0 = ปิด */
export function aiTutorRolloutPercent(): number {
  const raw = Number.parseFloat(process.env.AI_TUTOR_ROLLOUT_PERCENT ?? '');
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(100, raw);
}

/** ผู้ใช้อยู่ในกลุ่ม rollout หรือไม่ (ใช้ฟังก์ชัน bucket เดียวกับ isAiTutorEnabled) */
export function aiTutorInRollout(userId: string): boolean {
  const percent = aiTutorRolloutPercent();
  if (percent >= 100) return true;
  return aiTutorRolloutBucket(userId) < percent;
}

/**
 * ตรรกะ "คนนี้เปิดฟีเจอร์ไหม" จากธงทั้งสองชั้น (ไม่แตะ DB)
 * ใช้ร่วมกันระหว่าง API (isAiTutorEnabled) กับสคริปต์รายงาน เพื่อให้ตัวเลข
 * "ผู้ใช้ที่มีสิทธิ์" ตรงกับเงื่อนไขจริงเสมอ
 */
export function isAiTutorEnabledByFlags(userId: string, hasAccountAccess: boolean): boolean {
  if (!userId || !aiTutorMasterSwitchEnabled()) return false;
  if (hasAccountAccess) return true;
  return aiTutorInRollout(userId);
}

export async function isAiTutorEnabled(user: { id: string } | null | undefined): Promise<boolean> {
  if (!user?.id || !aiTutorMasterSwitchEnabled()) return false;

  // ถ้า master ไม่เปิดก็จบก่อนแล้ว — จะถึงคิวรี DB ได้ต่อเมื่อ master เปิดเท่านั้น
  const rows: { aiTutorAccess?: boolean }[] = await db
    .select({ aiTutorAccess: users.aiTutorAccess })
    .from(users)
    .where(eq(users.id, user.id));

  return isAiTutorEnabledByFlags(user.id, rows[0]?.aiTutorAccess === true);
}
