import { createHash } from 'node:crypto';

/**
 * ธงเปิดฟีเจอร์ AI Tutor — ตรรกะล้วน ๆ (ไม่แตะ DB) จึงใช้ร่วมกันได้ทั้ง API
 * และสคริปต์รายงานโดยไม่ต้องเขียนซ้ำ
 *
 * ลำดับชั้น:
 * 1. master switch — env AI_TUTOR_ENABLED (ไม่ตั้งหรือ false = ปิดทุกคน)
 * 2. สิทธิ์เฉพาะบัญชี — users.ai_tutor_access
 * 3. rollout เปอร์เซ็นต์ — env AI_TUTOR_ROLLOUT_PERCENT (สุ่มแบบคงที่ตาม hash ของ user id)
 */
export function aiTutorMasterSwitchEnabled(): boolean {
  const raw = process.env.AI_TUTOR_ENABLED?.trim().toLowerCase();
  return raw === 'true' || raw === '1';
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
 * "ผู้ใช้ที่เปิดฟีเจอร์ได้จริง" ตรงกับเงื่อนไขจริงเสมอ
 *
 * @param options.runtimeEnabled ผลรวมของ master switch (env) กับสวิตช์ปิดชั่วคราวใน DB
 *   — ถ้าไม่ส่ง = ใช้ค่าจาก env (ผู้เรียกเดิมที่อ่าน env โดยตรง)
 * @param options.rolloutPercent เปอร์เซ็นต์ rollout (ถ้าไม่ส่ง = ค่าจาก env)
 */
export function isAiTutorEnabledByFlags(
  userId: string,
  hasAccountAccess: boolean,
  options: { runtimeEnabled?: boolean; rolloutPercent?: number } = {},
): boolean {
  const runtimeEnabled = options.runtimeEnabled ?? aiTutorMasterSwitchEnabled();
  const rolloutPercent = options.rolloutPercent ?? aiTutorRolloutPercent();
  if (!userId || !runtimeEnabled) return false;
  if (hasAccountAccess) return true;
  if (rolloutPercent >= 100) return true;
  return aiTutorRolloutBucket(userId) < rolloutPercent;
}
