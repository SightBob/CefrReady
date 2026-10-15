import { Redis } from '@upstash/redis';
import { DEFAULT_TAP_AI_SETTINGS, tapAiSettingsSchema, type TapAiSettings } from './tap-ai';

const SETTINGS_KEY = 'ai:tap-select:settings';

// Upstash REST client เป็น stateless HTTP wrapper — สร้างครั้งเดียวพอ (แบบเดียวกับ rate-limit.ts)
let redis: Redis | null = null;

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('AI settings storage is not configured');
  }
  redis ??= new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return redis;
}

export async function getTapAiSettings(): Promise<TapAiSettings> {
  const stored = await getRedis().get<unknown>(SETTINGS_KEY);
  return stored === null ? { ...DEFAULT_TAP_AI_SETTINGS } : tapAiSettingsSchema.parse(stored);
}

export async function saveTapAiSettings(settings: TapAiSettings): Promise<void> {
  await getRedis().set(SETTINGS_KEY, tapAiSettingsSchema.parse(settings));
}

export function hasOpenRouterKey(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}
