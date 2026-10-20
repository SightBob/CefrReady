/**
 * ช่วงค่าที่ตั้งได้ของ AI Tutor — แหล่งความจริงเดียว (single source of truth)
 *
 * ใช้ร่วมกัน 3 ที่:
 * 1. server ตอนบันทึกค่า (PUT /api/admin/ai-tutor/config) → ปฏิเสธค่านอกช่วงพร้อมข้อความ
 * 2. server ตอนอ่านค่าใช้งานจริง → บีบ (clamp) ค่าให้อยู่ในช่วงเสมอ กันระบบพัง
 * 3. หน้า admin (UI) → input type=number + min/max/step + ช่วงที่อนุญาตข้างช่อง
 *    + ปิดปุ่มบันทึกเมื่อค่านอกช่วง
 *
 * ทำไมต้องมี: เดิมแต่ละชั้นใช้ขอบเขตต่างกัน (zod ใน settings-schema, ค่า env, ไม่มีขอบเขต
 * ตอนอ่านค่าจริง) → ตั้งค่าผิดแล้วระบบพังเงียบ ๆ
 *
 * หมายเหตุเรื่อง systemDailyLimit = 0:
 * ค่า 0 **ไม่ได้**หมายถึง "ปิดทุกคน" — โค้ดเดิมแปลงค่าที่ <= 0 กลับไปเป็นค่าเริ่มต้น (10,000)
 * ดังนั้น 0 จึงไม่ใช่ค่าที่ถูกต้อง (ขอบเขตต่ำสุด = 1)
 * วิธีปิดฉุกเฉินที่ถูกต้อง = สวิตช์ชั่วคราวในหน้านี้ หรือ env AI_TUTOR_ENABLED=false
 */

import { AI_TUTOR_MAX_TIMEOUT_MS } from './limits';

export type AiTutorRangeKey =
  | 'questionQuota'
  | 'userDailyLimit'
  | 'systemDailyLimit'
  | 'rolloutPercent'
  | 'maxTokens'
  | 'timeoutMs'
  | 'firstTokenTimeoutMs';

export type AiTutorRange = {
  min: number;
  max: number;
  step: number;
  /** คำอธิบายสั้นสำหรับผู้ดูแล */
  hint: string;
};

/**
 * ขอบเขตของแต่ละค่า
 * - questionQuota: 1–10 · เกิน 10 ต่อข้อ/วัน = แพงเกินจำเป็นสำหรับการเรียนรู้
 * - userDailyLimit: 1–100 · ต้อง >= questionQuota (ไม่งั้นเพดานรายวันจะเล็กกว่าโควตาต่อข้อ = เข้าใจยาก)
 * - systemDailyLimit: 1–20000 · เพดานรวมทั้งระบบ (kill switch ระดับโควตา ไม่ใช่สวิตช์ปิด)
 * - rolloutPercent: 0–100 (จำนวนเต็ม)
 * - maxTokens: 200–2000 (คำตอบไทย ~120 คำ ≈ 600 token + reasoning)
 * - timeoutMs: 5000–เพดานจาก limits.ts (ผูกกับ maxDuration ของ route)
 * - firstTokenTimeoutMs: 2000–เพดานจาก limits.ts (ต้อง <= timeoutMs)
 */
export const AI_TUTOR_RANGES: Record<AiTutorRangeKey, AiTutorRange> = {
  questionQuota: {
    min: 1,
    max: 10,
    step: 1,
    hint: 'จำนวนคำถามที่ถาม AI ได้ต่อข้อหนึ่งในหนึ่งวัน (ตามเวลาไทย) · 1–10',
  },
  userDailyLimit: {
    min: 1,
    max: 100,
    step: 1,
    hint: 'จำนวนคำถามรวมของผู้เรียนหนึ่งคนต่อวัน (ซ่อนจากผู้เรียน) · 1–100 (ต้องไม่น้อยกว่าโควตาต่อข้อ)',
  },
  systemDailyLimit: {
    min: 1,
    max: 20_000,
    step: 1,
    hint: 'จำนวนคำถามรวมทั้งระบบต่อวัน (เพดานต้นทุน) · 1–20000 · ค่า 0 ไม่ได้หมายถึงปิด ให้ใช้สวิตช์ชั่วคราวแทน',
  },
  rolloutPercent: {
    min: 0,
    max: 100,
    step: 1,
    hint: 'เปอร์เซ็นต์ของผู้เรียนที่ได้ใช้ฟีเจอร์แบบสุ่มแบบคงที่ (คนเดิมได้กลุ่มเดิม) · 0–100',
  },
  maxTokens: {
    min: 200,
    max: 2000,
    step: 100,
    hint: 'รวม reasoning + คำตอบ · 200–2000',
  },
  timeoutMs: {
    min: 5_000,
    max: AI_TUTOR_MAX_TIMEOUT_MS,
    step: 500,
    hint: 'เวลารอสูงสุดต่อครั้ง (หลัก/สำรอง) — ต้องไม่เกินเพดานของ maxDuration · 5000–'
      + `${AI_TUTOR_MAX_TIMEOUT_MS}`,
  },
  firstTokenTimeoutMs: {
    min: 2_000,
    max: AI_TUTOR_MAX_TIMEOUT_MS,
    step: 500,
    hint: 'เวลารอเนื้อหาชิ้นแรก (ถ้าเกินจะสลับไปใช้โมเดลสำรอง) · 2000–'
      + `${AI_TUTOR_MAX_TIMEOUT_MS} (ต้องไม่เกินเวลารอสูงสุด)`,
  },
};

/** คีย์ที่มีช่วงค่าตัวเลข (ใช้ตรวจ/บีบค่าอัตโนมัติ) */
export const AI_TUTOR_RANGE_KEYS = Object.keys(AI_TUTOR_RANGES) as AiTutorRangeKey[];

export function isAiTutorRangeKey(key: string): key is AiTutorRangeKey {
  return Object.prototype.hasOwnProperty.call(AI_TUTOR_RANGES, key);
}

/** ข้อความแสดงช่วงสำหรับผู้ใช้/ผู้ดูแล */
export function describeRange(key: AiTutorRangeKey): string {
  const range = AI_TUTOR_RANGES[key];
  return `${range.min}–${range.max}`;
}

/**
 * ตรวจค่าตัวเลขว่าอยู่ในช่วงไหม
 * @returns null = ถูกต้อง / string = ข้อความข้อผิดพลาด
 */
export function checkRange(key: AiTutorRangeKey, value: unknown): string | null {
  const range = AI_TUTOR_RANGES[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return `${range.hint} (ค่าต้องเป็นตัวเลข)`;
  }
  if (!Number.isInteger(value)) {
    return `${range.hint} (ต้องเป็นจำนวนเต็ม)`;
  }
  if (value < range.min || value > range.max) {
    return `${range.hint} (ค่าที่ใส่: ${value})`;
  }
  return null;
}

/** บีบค่าให้อยู่ในช่วง (ใช้ตอนอ่านค่าใช้งานจริง — กันค่าที่เพี้ยน/เก่าพังระบบ) */
export function clampToRange(key: AiTutorRangeKey, value: number): number {
  const range = AI_TUTOR_RANGES[key];
  if (!Number.isFinite(value)) return range.min;
  const rounded = Math.round(value);
  return Math.min(range.max, Math.max(range.min, rounded));
}

/**
 * ตรวจความสัมพันธ์ระหว่างค่า (ข้ามช่วงเดี่ยวไม่ได้)
 * @returns null = ถูกต้อง / string = ข้อความข้อผิดพลาด
 */
export function checkCrossFieldRules(values: Partial<Record<AiTutorRangeKey, number>>): string | null {
  const { questionQuota, userDailyLimit, timeoutMs, firstTokenTimeoutMs } = values;

  if (
    typeof questionQuota === 'number' &&
    typeof userDailyLimit === 'number' &&
    userDailyLimit < questionQuota
  ) {
    return `เพดานต่อผู้เรียน (${userDailyLimit}) ต้องไม่น้อยกว่าโควตาต่อข้อ (${questionQuota})`;
  }

  if (
    typeof timeoutMs === 'number' &&
    typeof firstTokenTimeoutMs === 'number' &&
    firstTokenTimeoutMs > timeoutMs
  ) {
    return `เวลารอเนื้อหาชิ้นแรก (${firstTokenTimeoutMs} มิลลิวินาที) ต้องไม่เกินเวลารอสูงสุด (${timeoutMs} มิลลิวินาที)`;
  }

  return null;
}
