/**
 * เพดานเวลาของ route /api/ai-tutor — ผูกกับ maxDuration ที่ Next.js อ่านตอน build
 *
 * ทำไมต้องเป็นค่าคงที่: Next.js อ่าน `export const maxDuration` จาก **build output**
 * ด้วย static analysis (ดูเอกสาร nextjs.org/docs/app/api-reference/file-conventions/
 * route-segment-config) → ค่าที่คำนวณจาก env จะถูกตรึงตอน build และอาจไม่ตรง
 * กับตอนรันจริง จึงต้องเป็นค่าคงที่ที่แก้ในโค้ด + deploy ใหม่
 *
 * สูตรเพดาน timeout ที่ตั้งได้:
 *   หลัก + สำรอง + เผื่อ = maxDuration
 *   → timeout ต่อโมเดล = floor((maxDuration - slack) / 2)
 */
export const AI_TUTOR_ROUTE_MAX_DURATION_S = 75;

/** เวลาเผื่อสำหรับงานหลังโมเดล (บันทึกลง DB, ส่ง event) */
export const AI_TUTOR_ROUTE_SLACK_S = 15;

/** เพดาน timeout ต่อ 1 ครั้งเรียก (หลักหรือสำรอง) = 30 วินาที */
export const AI_TUTOR_MAX_TIMEOUT_S = Math.floor(
  (AI_TUTOR_ROUTE_MAX_DURATION_S - AI_TUTOR_ROUTE_SLACK_S) / 2,
);

export const AI_TUTOR_MAX_TIMEOUT_MS = AI_TUTOR_MAX_TIMEOUT_S * 1000;

/** เพดานเวลารอ "เนื้อหาชิ้นแรก" ต้องไม่เกิน timeout ของครั้งเรียก */
export const AI_TUTOR_MAX_FIRST_TOKEN_TIMEOUT_MS = AI_TUTOR_MAX_TIMEOUT_MS;

const MIN_TIMEOUT_MS = 1_000;

/** อ่านค่า timeout จาก env แล้วบีบให้อยู่ในเพดาน */
export function resolveAiTutorTimeoutMs(raw: string | undefined = process.env.AI_TUTOR_TIMEOUT_MS): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return AI_TUTOR_MAX_TIMEOUT_MS;
  return Math.min(Math.max(parsed, MIN_TIMEOUT_MS), AI_TUTOR_MAX_TIMEOUT_MS);
}

/**
 * อ่านค่า first-token timeout จาก env แล้วบีบให้ไม่เกิน timeout ของครั้งเรียก
 * (ถ้าไม่ได้ตั้ง = ครึ่งหนึ่งของ timeout แต่ไม่เกินเพดาน)
 */
export function resolveAiTutorFirstTokenTimeoutMs(
  raw: string | undefined = process.env.AI_TUTOR_FIRST_TOKEN_TIMEOUT_MS,
  timeoutMs: number = resolveAiTutorTimeoutMs(),
): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  const fallback = Math.min(Math.floor(timeoutMs / 2), AI_TUTOR_MAX_FIRST_TOKEN_TIMEOUT_MS);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.max(parsed, MIN_TIMEOUT_MS), timeoutMs, AI_TUTOR_MAX_FIRST_TOKEN_TIMEOUT_MS);
}

/** ข้อความอธิบายสำหรับหน้า admin — ต้องแก้โค้ด+deploy ใหม่ถ้าจะเพิ่มเพดาน */
export const AI_TUTOR_TIMEOUT_LIMIT_NOTE =
  `เพดานเวลารอของ route /api/ai-tutor ถูกกำหนดจาก maxDuration (${AI_TUTOR_ROUTE_MAX_DURATION_S} วินาที) `
  + `ซึ่ง Next.js อ่านจาก build output — การตั้ง timeout สูงกว่านี้ต้องแก้ค่าคงที่ในโค้ด (src/lib/ai-tutor/limits.ts)`
  + ' และ export const maxDuration ในไฟล์ route แล้ว deploy ใหม่';

// ─── เพดานราคาโมเดล (ฝั่ง server บังคับจริง ไม่ใช่แค่ตรวจใน UI) ─────────────
// ค่าเริ่มต้น: input $1 / output $3 ต่อ 1M token
//   · ผ่าน: โมเดลฟรี (0), deepseek-v4.1-flash ($0.035/$0.011), gpt-4o-mini ($0.15/$0.6)
//   · ตัด: โมเดลแพง (gpt-4o, o1 …) เพราะโควตา 50 คำถาม/ผู้เรียน/วัน
//   ตั้งเป็น 0 = อนุญาตเฉพาะโมเดลฟรี (ราคา 0) · ไม่ตั้ง = ค่าเริ่มต้นข้างบน
export const DEFAULT_MAX_MODEL_PRICE_IN_PER_MTOK = 1;
export const DEFAULT_MAX_MODEL_PRICE_OUT_PER_MTOK = 3;

export function maxModelPriceInPerMtok(): number {
  const raw = Number.parseFloat(process.env.AI_TUTOR_MAX_MODEL_PRICE_IN_PER_MTOK ?? '');
  if (!Number.isFinite(raw) || raw < 0) return DEFAULT_MAX_MODEL_PRICE_IN_PER_MTOK;
  return raw;
}

export function maxModelPriceOutPerMtok(): number {
  const raw = Number.parseFloat(process.env.AI_TUTOR_MAX_MODEL_PRICE_OUT_PER_MTOK ?? '');
  if (!Number.isFinite(raw) || raw < 0) return DEFAULT_MAX_MODEL_PRICE_OUT_PER_MTOK;
  return raw;
}

/** โมเดลราคาเกินเพดานไหม (ราคาเป็น USD ต่อ 1M token) */
export function isModelPriceOverLimit(pricing: { prompt: number; completion: number }): boolean {
  return pricing.prompt > maxModelPriceInPerMtok() || pricing.completion > maxModelPriceOutPerMtok();
}
