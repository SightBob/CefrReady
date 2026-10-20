import { z } from 'zod';

import {
  AI_TUTOR_MAX_FIRST_TOKEN_TIMEOUT_MS,
  AI_TUTOR_MAX_TIMEOUT_MS,
  AI_TUTOR_ROUTE_MAX_DURATION_S,
  maxModelPriceInPerMtok,
  maxModelPriceOutPerMtok,
} from './limits';
import { aiTutorMasterSwitchEnabled } from './flags';
import {
  AI_TUTOR_EFFORTS,
  AI_TUTOR_FORBIDDEN_KEYS,
  aiTutorSaveRequestSchema,
  aiTutorSettingsSchema,
  type AiTutorEffort,
  type AiTutorSettings,
  type AiTutorSettingsKey,
} from './settings-schema';

// schema อยู่ใน settings-schema.ts (ไม่มี dependency ฝั่ง server) → ใช้ฝั่ง client ได้
export {
  AI_TUTOR_EFFORTS,
  AI_TUTOR_FORBIDDEN_KEYS,
  aiTutorSaveRequestSchema,
  aiTutorSettingsSchema,
} from './settings-schema';
export type { AiTutorEffort, AiTutorSettings, AiTutorSettingsKey } from './settings-schema';

/**
 * ค่าตั้ง AI Tutor — ผู้ดูแลปรับได้จากหน้า admin โดยไม่ต้องแก้ env / redeploy
 *
 * ลำดับค่า: **DB ทับ env** (env เป็นค่าตั้งต้น) และค่า env ที่เป็น "สวิตช์เปิด"
 * (AI_TUTOR_ENABLED) เป็นขีดจำกัดสูงสุด — DB ปิดได้ แต่เปิดทับ env ที่ปิดอยู่ไม่ได้
 *
 * ข้อสำคัญ: ไม่มีการอ่าน/ตั้งค่า secret (OPENROUTER_API_KEY, AI_TUTOR_PROOF_SECRET,
 * AI_TUTOR_EXPORT_SALT) ผ่านระบบนี้ — อยู่ที่ env เท่านั้น
 */

/** ระดับ reasoning ที่ OpenRouter รองรับ (ตามเอกสาร reasoning tokens) */
// (นิยามอยู่ใน settings-schema.ts — ดูการ export ด้านบน)

/** ค่าที่ merge แล้ว (ใช้งานจริง) */
export type AiTutorConfig = {
  /** env เปิดอยู่หรือไม่ (ขีดจำกัดสูงสุด — DB ปิดได้ แต่เปิดทับไม่ได้) */
  envMasterEnabled: boolean;
  /** ผลสุดท้าย: เปิดใช้งานได้จริงไหม */
  runtimeEnabled: boolean;
  primaryModel: string;
  fallbackModel: string | null;
  primaryEffort: AiTutorEffort;
  fallbackEffort: AiTutorEffort;
  maxTokens: number;
  timeoutMs: number;
  firstTokenTimeoutMs: number;
  questionQuota: number;
  userDailyLimit: number;
  systemDailyLimit: number;
  rolloutPercent: number;
  promptCache: boolean;
};

export type AiTutorConfigWithSources = {
  config: AiTutorConfig;
  /** ที่มาของแต่ละค่า: 'db' = ตั้งในหน้า admin, 'env' = ค่าตั้งต้นจาก env */
  sources: Record<string, 'db' | 'env'>;
  /** ค่าตั้งต้นจาก env (สำหรับแสดงผลในหน้า admin) */
  envDefaults: AiTutorConfig;
  /** ข้อความเตือนที่เกิดตอนอ่าน DB ไม่สำเร็จ (ใช้ค่า env แทน) */
  warnings: string[];
};

/**
 * สถานะ secret ที่มีใน env — บูลีนเท่านั้น ห้ามส่งค่าจริงออกไปที่ไหน
 */
export function getAiTutorEnvStatus(): {
  openrouterKey: boolean;
  proofSecret: boolean;
  exportSalt: boolean;
  masterEnabled: boolean;
} {
  return {
    openrouterKey: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
    proofSecret: Boolean(process.env.AI_TUTOR_PROOF_SECRET?.trim()),
    exportSalt: Boolean(process.env.AI_TUTOR_EXPORT_SALT?.trim()),
    masterEnabled: aiTutorMasterSwitchEnabled(),
  };
}

// ─── ค่าตั้งต้นจาก env ───────────────────────────────────────────────────────

function envInt(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function envEffort(name: string, fallback: AiTutorEffort): AiTutorEffort {
  const raw = process.env[name]?.trim();
  if (raw && (AI_TUTOR_EFFORTS as readonly string[]).includes(raw)) return raw as AiTutorEffort;
  return fallback;
}

export function getAiTutorEnvDefaults(): AiTutorConfig {
  const envMasterEnabled = aiTutorMasterSwitchEnabled();
  const timeoutMs = Math.min(envInt('AI_TUTOR_TIMEOUT_MS', AI_TUTOR_MAX_TIMEOUT_MS), AI_TUTOR_MAX_TIMEOUT_MS);
  const firstTokenTimeoutMs = Math.min(
    envInt('AI_TUTOR_FIRST_TOKEN_TIMEOUT_MS', Math.floor(timeoutMs / 2)),
    timeoutMs,
    AI_TUTOR_MAX_FIRST_TOKEN_TIMEOUT_MS,
  );
  return {
    envMasterEnabled,
    runtimeEnabled: envMasterEnabled,
    primaryModel: process.env.AI_TUTOR_MODEL?.trim() || 'minimax/minimax-m3.1-flash:free',
    fallbackModel: process.env.AI_TUTOR_FALLBACK_MODEL?.trim() || null,
    primaryEffort: envEffort('AI_TUTOR_REASONING_EFFORT', 'low'),
    fallbackEffort: envEffort('AI_TUTOR_FALLBACK_REASONING_EFFORT', 'none'),
    maxTokens: Math.min(envInt('AI_TUTOR_MAX_TOKENS', 1200), 4000),
    timeoutMs,
    firstTokenTimeoutMs,
    questionQuota: Math.min(envInt('AI_TUTOR_QUESTION_QUOTA', 5), 20),
    userDailyLimit: Math.min(envInt('AI_TUTOR_USER_DAILY_LIMIT', 50), 1000),
    systemDailyLimit: Math.min(envInt('AI_TUTOR_SYSTEM_DAILY_LIMIT', 10_000), 100_000),
    rolloutPercent: Math.min(envInt('AI_TUTOR_ROLLOUT_PERCENT', 0), 100),
    promptCache: process.env.AI_TUTOR_PROMPT_CACHE?.trim() === '1',
  };
}

// ─── อ่านค่าจาก DB (มีแคช ~30 วิ) ───────────────────────────────────────────

const CACHE_TTL_MS = 30_000;
let cache: { at: number; value: AiTutorConfigWithSources } | null = null;

/** ล้างแคชของ instance นี้ — เรียกหลังบันทึกค่าใหม่ */
export function clearAiTutorConfigCache(): void {
  cache = null;
}

async function readSettingsFromDb(): Promise<Partial<AiTutorSettings> | null> {
  // import แบบ dynamic: โมดูลนี้ถูกใช้ในเทส/สคริปต์ที่ไม่มี DATABASE_URL
  // (src/db/index.ts โยน error ตอน import ถ้าไม่มี env) — จึงต้องกันไว้ใน try
  const { db } = await import('@/db');
  const { aiTutorSettings } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');

  const rows = await db
    .select({ key: aiTutorSettings.key, value: aiTutorSettings.value })
    .from(aiTutorSettings);
  if (rows.length === 0) return null;

  const result: Record<string, unknown> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result as Partial<AiTutorSettings>;
}

/**
 * ค่าที่ใช้งานจริง = DB ทับ env
 * - อ่าน DB ล้มเหลว หรือค่าไม่ผ่าน validate → ใช้ค่า env + log เตือน (ไม่ throw)
 * - แคชในหน่วยความจำ ~30 วินาที
 */
export async function getAiTutorConfigWithSources(
  options: { ignoreDb?: boolean } = {},
): Promise<AiTutorConfigWithSources> {
  const envDefaults = getAiTutorEnvDefaults();
  if (options.ignoreDb) {
    return { config: { ...envDefaults }, sources: {}, envDefaults, warnings: [] };
  }
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.value;
  }

  const warnings: string[] = [];
  let dbSettings: Partial<AiTutorSettings> | null = null;
  try {
    dbSettings = await readSettingsFromDb();
  } catch (error) {
    warnings.push(`อ่านค่าจาก DB ไม่สำเร็จ — ใช้ค่าจาก env แทน (${error instanceof Error ? error.message.slice(0, 120) : 'unknown error'})`);
    console.warn('[ai-tutor] อ่านค่าจาก DB ไม่สำเร็จ ใช้ค่าจาก env แทน:', error);
  }

  const sources: Record<string, 'db' | 'env'> = {};
  const merged: Record<string, unknown> = { ...envDefaults };
  if (dbSettings) {
    for (const [key, value] of Object.entries(dbSettings)) {
      if (value === undefined || value === null) continue;
      const single = aiTutorSettingsSchema.shape[key as AiTutorSettingsKey];
      if (!single) {
        warnings.push(`ข้ามค่า "${key}" เพราะไม่รู้จัก`);
        continue;
      }
      const parsed = single.safeParse(value);
      if (!parsed.success) {
        warnings.push(`ข้ามค่า "${key}" เพราะค่าใน DB ไม่ถูกต้อง`);
        continue;
      }
      merged[key] = parsed.data;
      sources[key] = 'db';
    }
  }

  const config = normalizeConfig(merged as AiTutorConfig, envDefaults);
  const value: AiTutorConfigWithSources = { config, sources, envDefaults, warnings };
  cache = { at: Date.now(), value };
  return value;
}

/** ค่าที่ใช้งานจริง (รวม DB ทับ env แล้ว) */
export async function getAiTutorConfig(options: { ignoreDb?: boolean } = {}): Promise<AiTutorConfig> {
  return (await getAiTutorConfigWithSources(options)).config;
}

/**
 * บีบค่าให้อยู่ในขอบเขตที่ระบบยอมรับ (เส้นทางอ่านตอนรัน — ไม่พัง)
 * - timeout ต้องไม่เกินเพดานของ maxDuration
 * - firstTokenTimeoutMs ต้องไม่เกิน timeoutMs
 * - runtimeEnabled เปิดทับ env ที่ปิดอยู่ไม่ได้
 */
export function normalizeConfig(raw: AiTutorConfig, envDefaults: AiTutorConfig): AiTutorConfig {
  const timeoutMs = Math.min(Math.max(raw.timeoutMs ?? AI_TUTOR_MAX_TIMEOUT_MS, 1000), AI_TUTOR_MAX_TIMEOUT_MS);
  const firstTokenTimeoutMs = Math.min(
    Math.max(raw.firstTokenTimeoutMs ?? Math.floor(timeoutMs / 2), 1000),
    timeoutMs,
    AI_TUTOR_MAX_FIRST_TOKEN_TIMEOUT_MS,
  );
  return {
    ...raw,
    envMasterEnabled: envDefaults.envMasterEnabled,
    // DB ปิดได้ แต่เปิดทับ env ที่ปิดอยู่ไม่ได้
    runtimeEnabled: envDefaults.envMasterEnabled && raw.runtimeEnabled !== false,
    timeoutMs,
    firstTokenTimeoutMs,
    maxTokens: Math.min(Math.max(raw.maxTokens ?? 1200, 100), 4000),
    questionQuota: Math.min(Math.max(raw.questionQuota ?? 5, 1), 20),
    userDailyLimit: Math.min(Math.max(raw.userDailyLimit ?? 50, 1), 1000),
    systemDailyLimit: Math.min(Math.max(raw.systemDailyLimit ?? 10_000, 1), 100_000),
    rolloutPercent: Math.min(Math.max(raw.rolloutPercent ?? 0, 0), 100),
  };
}

// ─── บันทึกค่า (ฝั่งแอดมิน) ───────────────────────────────────────────────────

export type SaveResult =
  | { ok: true; saved: AiTutorSettings; reset: string[]; warnings: string[] }
  | { ok: false; error: string };

/** รูปแบบคำขอของ PUT — ค่าที่ตั้ง + คีย์ที่ต้อง "คืนค่า env" (ลบแถวใน DB) */
const saveRequestSchema = aiTutorSaveRequestSchema;

/**
 * บันทึกค่าที่แอดมินแก้ — ตรวจสอบก่อนเขียนทุกครั้ง และ **ปฏิเสธพร้อมข้อความชัดเจน**
 * (ไม่บีบเงียบ ๆ เหมือนเส้นทางอ่านตอนรัน) + เขียน audit ค่าก่อน/หลัง + ล้างแคช
 *
 * reset: ลบค่าที่ตั้งไว้ใน DB ของคีย์นั้น ๆ → กลับไปใช้ค่าจาก env
 * (สังเกต: fallbackModel = null แปลว่า "ปิดโมเดลสำรอง" ไม่ใช่ "คืนค่า env")
 */
export async function saveAiTutorSettings(
  input: unknown,
  actorUserId: string,
): Promise<SaveResult> {
  // 1) ห้ามแตะ key ที่เป็น secret
  if (input && typeof input === 'object') {
    for (const forbidden of AI_TUTOR_FORBIDDEN_KEYS) {
      if (forbidden in (input as Record<string, unknown>)) {
        return { ok: false, error: `ไม่อนุญาตให้ตั้ง ${forbidden} ผ่านหน้า admin (ต้องตั้งเป็น env เท่านั้น)` };
      }
    }
  }

  // 2) ตรวจ schema (strict → key ที่ไม่รู้จักถูกปฏิเสธ)
  const parsed = saveRequestSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const key = issue?.path?.join('.') ?? '';
    const field = key ? ` (${key})` : '';
    if (key === 'timeoutMs' || key === 'firstTokenTimeoutMs') {
      return {
        ok: false,
        error: `${key} ต้องไม่เกิน ${AI_TUTOR_MAX_TIMEOUT_MS} มิลลิวินาที (เพดานของ maxDuration ${AI_TUTOR_ROUTE_MAX_DURATION_S} วินาที — ถ้าต้องการเพิ่มต้องแก้ค่าคงที่ในโค้ดแล้ว deploy ใหม่)${field}`,
      };
    }
    return { ok: false, error: `ค่าไม่ถูกต้อง${field}: ${issue?.message ?? 'ไม่ผ่านการตรวจสอบ'}` };
  }
  const { reset = [], ...settings } = parsed.data;

  // 3) firstTokenTimeoutMs ต้องไม่เกิน timeoutMs
  if (
    settings.timeoutMs !== undefined
    && settings.firstTokenTimeoutMs !== undefined
    && settings.firstTokenTimeoutMs > settings.timeoutMs
  ) {
    return { ok: false, error: 'firstTokenTimeoutMs ต้องไม่เกิน timeoutMs' };
  }

  // 4) ตรวจว่าโมเดลมีอยู่จริง + effort ที่เลือกรองรับ + ราคาไม่เกินเพดาน
  const warnings: string[] = [];
  const modelChecks = [
    { model: settings.primaryModel, effort: settings.primaryEffort, label: 'primary' },
    { model: settings.fallbackModel, effort: settings.fallbackEffort, label: 'fallback' },
  ];
  for (const check of modelChecks) {
    if (!check.model) continue;
    const known = await findKnownModel(check.model);
    if (known === null) {
      warnings.push(`ตรวจสอบรายชื่อโมเดล "${check.model}" ไม่ได้ (เรียก OpenRouter ไม่สำเร็จ) — บันทึกไปแล้ว แต่ควรตรวจอีกครั้ง`);
      continue;
    }
    if (known === undefined) {
      return { ok: false, error: `ไม่พบโมเดล "${check.model}" ใน OpenRouter (${check.label})` };
    }
    if (known.overPriceLimit) {
      return {
        ok: false,
        error: `โมเดล "${check.model}" ราคาเกินเพดาน (input $${known.pricing.prompt}/1M, output $${known.pricing.completion}/1M · เพดาน input $${maxModelPriceInPerMtok()}, output $${maxModelPriceOutPerMtok()})`,
      };
    }
    if (check.effort && !known.supportsEffort(check.effort)) {
      return {
        ok: false,
        error: `โมเดล "${check.model}" ไม่รองรับ reasoning effort "${check.effort}" (รองรับ: ${known.supportedEfforts.join(', ') || 'ไม่ระบุ'})`,
      };
    }
  }

  // 5) เขียนลง DB + audit + ล้างแคช
  const { db } = await import('@/db');
  const { aiTutorSettings, aiTutorAdminAudit } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');

  // ค่าที่ "ใช้งานจริง" ก่อนเปลี่ยน (รวมค่าจาก env) + ค่าเดิมใน DB
  const beforeConfig = await getAiTutorConfigWithSources();
  const beforeEffective: Record<string, unknown> = { ...beforeConfig.config };
  const beforeDb: Record<string, unknown> = { ...beforeConfig.sources };

  const afterDb: Record<string, unknown> = {};
  const keys = Object.keys(settings) as AiTutorSettingsKey[];

  for (const key of keys) {
    const value = settings[key];
    if (value === undefined) continue;
    const existing = await db
      .select({ value: aiTutorSettings.value })
      .from(aiTutorSettings)
      .where(eq(aiTutorSettings.key, key))
      .limit(1);
    beforeDb[key] = existing[0]?.value ?? null;
    afterDb[key] = value;

    await db
      .insert(aiTutorSettings)
      .values({
        key,
        value: value as never,
        updatedBy: actorUserId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: aiTutorSettings.key,
        set: { value: value as never, updatedBy: actorUserId, updatedAt: new Date() },
      });
  }

  // reset: ลบแถวใน DB ของคีย์ที่ระบุ → กลับไปใช้ค่าจาก env
  const resetKeys: string[] = [];
  for (const key of reset) {
    if (!(key in aiTutorSettingsSchema.shape)) {
      return { ok: false, error: `ไม่รู้จักคีย์ "${key}" ที่ต้องการคืนค่า env` };
    }
    await db.delete(aiTutorSettings).where(eq(aiTutorSettings.key, key));
    resetKeys.push(key);
  }

  clearAiTutorConfigCache();
  const afterConfig = await getAiTutorConfigWithSources();
  const afterEffective: Record<string, unknown> = { ...afterConfig.config };

  await db.insert(aiTutorAdminAudit).values({
    actorUserId,
    action: resetKeys.length ? 'update_settings' : 'update_settings',
    target: [...keys, ...resetKeys].join(','),
    before: { effective: beforeEffective, db: beforeDb } as never,
    after: { effective: afterEffective, db: afterDb } as never,
  });

  return { ok: true, saved: settings, reset: resetKeys, warnings };
}

/** รายการ audit ล่าสุด (สำหรับหน้า admin) */
export async function listAiTutorAudit(limit = 50) {
  const { db } = await import('@/db');
  const { aiTutorAdminAudit } = await import('@/db/schema');
  const { desc } = await import('drizzle-orm');
  const rows = await db
    .select({
      id: aiTutorAdminAudit.id,
      actorUserId: aiTutorAdminAudit.actorUserId,
      action: aiTutorAdminAudit.action,
      target: aiTutorAdminAudit.target,
      before: aiTutorAdminAudit.before,
      after: aiTutorAdminAudit.after,
      createdAt: aiTutorAdminAudit.createdAt,
    })
    .from(aiTutorAdminAudit)
    .orderBy((t) => desc(t.createdAt))
    .limit(Math.min(Math.max(limit, 1), 200));
  return rows;
}

// ─── ตรวจรายชื่อโมเดลกับ OpenRouter ───────────────────────────────────────────

/**
 * คืนโมเดลที่รู้จัก (พร้อมข้อมูล effort ที่รองรับ) · undefined = ไม่พบ · null = ตรวจไม่ได้
 * (import แบบ dynamic เพื่อไม่ให้เกิด circular dependency ระหว่าง config ↔ models)
 */
async function findKnownModel(modelId: string) {
  const { findModel } = await import('./models');
  return findModel(modelId);
}

