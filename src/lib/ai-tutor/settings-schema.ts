import { z } from 'zod';

import { AI_TUTOR_RANGES } from './ranges';

/**
 * Schema ของค่าตั้ง AI Tutor — ไม่มี dependency ฝั่ง server
 * (ใช้ได้ทั้งใน API และหน้า admin ฝั่ง client เพื่อ validate ก่อนส่ง)
 *
 * ขอบเขตตัวเลขดึงจาก src/lib/ai-tutor/ranges.ts (แหล่งเดียวกับที่ server ตรวจตอนบันทึก)
 */

/** ระดับ reasoning ที่ OpenRouter รองรับ (ตามเอกสาร reasoning tokens) */
export const AI_TUTOR_EFFORTS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const;
export type AiTutorEffort = (typeof AI_TUTOR_EFFORTS)[number];

const range = (key: keyof typeof AI_TUTOR_RANGES) =>
  z.number().int().min(AI_TUTOR_RANGES[key].min).max(AI_TUTOR_RANGES[key].max);

/** ค่าที่เก็บใน DB ได้ (ทับค่า env) */
export const aiTutorSettingsSchema = z.object({
  /** สวิตช์ปิดชั่วคราว — มีผลเมื่อ env AI_TUTOR_ENABLED เปิดอยู่เท่านั้น */
  runtimeEnabled: z.boolean().optional(),
  primaryModel: z.string().trim().min(3).max(200).optional(),
  fallbackModel: z.string().trim().min(3).max(200).nullable().optional(),
  primaryEffort: z.enum(AI_TUTOR_EFFORTS).optional(),
  fallbackEffort: z.enum(AI_TUTOR_EFFORTS).optional(),
  maxTokens: range('maxTokens').optional(),
  timeoutMs: range('timeoutMs').optional(),
  firstTokenTimeoutMs: range('firstTokenTimeoutMs').optional(),
  questionQuota: range('questionQuota').optional(),
  userDailyLimit: range('userDailyLimit').optional(),
  systemDailyLimit: range('systemDailyLimit').optional(),
  rolloutPercent: range('rolloutPercent').optional(),
  promptCache: z.boolean().optional(),
}).strict();

export type AiTutorSettings = z.infer<typeof aiTutorSettingsSchema>;
export type AiTutorSettingsKey = keyof AiTutorSettings;

/** รูปแบบคำขอของ PUT — ค่าที่ตั้ง + คีย์ที่ต้อง "คืนค่า env" (ลบแถวใน DB) */
export const aiTutorSaveRequestSchema = aiTutorSettingsSchema.extend({
  reset: z.array(z.string().trim().min(1).max(50)).max(50).optional(),
});

export type AiTutorSaveRequest = z.infer<typeof aiTutorSaveRequestSchema>;

/** ค่าที่ห้ามตั้งผ่านระบบนี้ (secret อยู่ที่ env เท่านั้น) */
export const AI_TUTOR_FORBIDDEN_KEYS = [
  'OPENROUTER_API_KEY',
  'AI_TUTOR_PROOF_SECRET',
  'AI_TUTOR_EXPORT_SALT',
] as const;

/** คีย์ที่รีเซ็ตได้ (คืนค่า env) */
export const AI_TUTOR_RESETTABLE_KEYS = Object.keys(aiTutorSettingsSchema.shape) as AiTutorSettingsKey[];
