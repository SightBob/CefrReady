import { Redis } from '@upstash/redis';
import { z } from 'zod';
import {
  DEFAULT_TAP_REASON_REWARD_SETTINGS,
  MAX_TAP_REASON_POINTS,
  readTapReasonRewardSettings,
  type TapReasonRewardSettings,
} from './tap-reason-rewards';

/**
 * ที่เก็บ "คะแนนเหมา" ของ Tap & Select
 *
 * ใช้คีย์เฉพาะของฟีเจอร์นี้คีย์เดียว — **ไม่แตะ** `maintenance:mode`, `tests:maintenance:sections`
 * หรือ credential ใด ๆ ใน Redis
 */
const SETTINGS_KEY = 'tap-reasons:reward';

/** ค่าที่รับจากแอดมินต้องถูกต้องเป๊ะ (ต่างจากตอนอ่าน ซึ่งยอมใช้ค่าเริ่มต้น) */
export const tapReasonRewardSettingsSchema = z.object({
  autoAward: z.boolean(),
  points: z
    .number()
    .int('คะแนนต้องเป็นจำนวนเต็ม')
    .min(0, 'คะแนนต้องไม่ติดลบ')
    .max(MAX_TAP_REASON_POINTS, `คะแนนต้องไม่เกิน ${MAX_TAP_REASON_POINTS}`),
}).strict();

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('Reward settings storage is not configured');
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

/** อ่านค่าที่แอดมินตั้งไว้ (ไม่มีคีย์ = ค่าเริ่มต้น) — throw เมื่อที่เก็บใช้ไม่ได้ */
export async function getTapReasonRewardSettings(): Promise<TapReasonRewardSettings> {
  const stored = await getRedis().get<unknown>(SETTINGS_KEY);
  return readTapReasonRewardSettings(stored);
}

/**
 * อ่านค่าแบบไม่ทำให้การส่งข้อสอบพัง — คืน null เมื่ออ่านไม่ได้เลย
 * (ผู้เรียกจะไม่ให้คะแนนอัตโนมัติ ดีกว่าให้คะแนนผิดกฎที่แอดมินตั้งไว้)
 */
export async function getTapReasonRewardSettingsSafe(): Promise<TapReasonRewardSettings | null> {
  try {
    return await getTapReasonRewardSettings();
  } catch (error) {
    console.warn('[tap-reason-settings] อ่านค่าคะแนนไม่สำเร็จ — งดให้คะแนนอัตโนมัติรอบนี้:', error);
    return null;
  }
}

export async function saveTapReasonRewardSettings(settings: TapReasonRewardSettings): Promise<void> {
  await getRedis().set(SETTINGS_KEY, tapReasonRewardSettingsSchema.parse(settings));
}

export { DEFAULT_TAP_REASON_REWARD_SETTINGS };
