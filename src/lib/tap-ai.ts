import { z } from 'zod';

export const MAX_TAP_REASON_LENGTH = 1500;

export const tapAiSettingsSchema = z.object({
  enabled: z.boolean(),
  model: z.string().trim().max(200).refine(value => value === '' || /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.:-]+$/.test(value), 'ใช้ model ID จาก OpenRouter'),
  feedbackInstructions: z.string().trim().max(2000),
  maxTokens: z.number().int().min(300).max(2000),
}).strict().refine(value => !value.enabled || Boolean(value.model), 'กรุณาระบุโมเดลก่อนเปิด AI');

export type TapAiSettings = z.infer<typeof tapAiSettingsSchema>;
export const DEFAULT_TAP_AI_SETTINGS: TapAiSettings = {
  enabled: false,
  model: '',
  feedbackInstructions: 'อธิบายสั้น กระชับ เป็นมิตร และยกตัวอย่างภาษาอังกฤษพร้อมคำอธิบายภาษาไทยเมื่อช่วยให้เข้าใจได้ดีขึ้น',
  maxTokens: 1000,
};

export const tapAiFeedbackSchema = z.object({
  understanding: z.enum(['correct', 'partial', 'incorrect', 'unclear']),
  feedback: z.string().trim().min(1).max(6000),
}).strict();

export type TapAiFeedback = z.infer<typeof tapAiFeedbackSchema>;
export type TapReasonResult = {
  isCorrect: boolean;
  ai: TapAiFeedback | null;
  message?: string;
};

export const UNDERSTANDING_LABELS = {
  correct: 'เข้าใจถูกต้อง',
  partial: 'เข้าใจถูกบางส่วน',
  incorrect: 'ยังเข้าใจคลาดเคลื่อน',
  unclear: 'เหตุผลยังไม่ชัดเจนพอ',
} as const;
