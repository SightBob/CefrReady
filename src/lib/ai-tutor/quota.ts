/**
 * โควตา AI Tutor — นับที่ระดับ (ผู้เรียน, ข้อ) ต่อวันตามเวลาไทย (Asia/Bangkok)
 *
 * ทำไมต้องนับเอง: ตัวนับ "ถามแล้ว/เหลือ" ต้องมาจาก server เสมอ (client เชื่อไม่ได้)
 * และต้องกัน race — ผู้เรียนกดส่งพร้อมกันหลายครั้งต้องไม่เกินโควตา
 *
 * กัน race ด้วยแนวเดียวกับ src/app/api/tests/submit/route.ts:
 *   pg_advisory_xact_lock(hashtextextended(key)) ในทรานแซกชันเดียวกับการนับ+จอง
 *   แล้ว insert แถว status='pending' ที่นับเข้าโควตาทันที ก่อนเรียกโมเดล
 *   สำเร็จ → mark 'ok' · ล้มเหลวก่อนมีเนื้อหา → mark 'failed' (ไม่นับ = คืนโควตา)
 *
 * ค่าโควตาที่ใช้งานจริงมาจาก getAiTutorConfig() (DB ทับ env) — ฟังก์ชันด้านล่าง
 * เป็น "ค่าตั้งต้นจาก env" ที่ใช้เป็น fallback และโดยสคริปต์ที่อ่าน env โดยตรง
 */
import { and, eq, gte, isNull, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import { aiTutorMessages } from '@/db/schema';
import { insertAiTutorMessage } from './messages';

/** Asia/Bangkok = UTC+7 ตลอดปี (ไม่มี DST) → คำนวณวันเริ่มต้นได้โดยไม่ต้องมี tz database */
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** เริ่มต้นของ "วันตามเวลาไทย" ในรูปแบบ UTC (ใช้เทียบกับ created_at) */
export function bangkokDayStartUtc(now: Date = new Date()): Date {
  const bangkokNow = now.getTime() + BANGKOK_OFFSET_MS;
  const bangkokMidnight = Math.floor(bangkokNow / DAY_MS) * DAY_MS;
  return new Date(bangkokMidnight - BANGKOK_OFFSET_MS);
}

/**
 * โควตาต่อ (ผู้เรียน, ข้อ) ต่อวัน — ค่าเริ่มต้น 5
 *
 * ⚠️ ค่านี้อ่านจาก env เท่านั้น (AI_TUTOR_QUESTION_QUOTA) — ใช้เป็น fallback
 * เส้นทางที่บังคับโควตาจริงต้องส่ง `limit` มาจาก getAiTutorConfig() (DB ทับ env)
 * ไม่งั้นค่าที่ผู้ดูแลตั้งในหน้า admin จะไม่มีผลกับโควตาจริง
 */
export function questionQuotaLimit(): number {
  const raw = Number.parseInt(process.env.AI_TUTOR_QUESTION_QUOTA ?? '', 10);
  if (!Number.isFinite(raw) || raw <= 0) return 5;
  return raw;
}

/** เพดานซ่อนต่อผู้เรียนต่อวัน (ค่าเริ่มต้น 50) — 0 = ไม่จำกัด */
export function userDailyLimit(): number {
  const raw = Number.parseInt(process.env.AI_TUTOR_USER_DAILY_LIMIT ?? '', 10);
  if (!Number.isFinite(raw) || raw <= 0) return 50;
  return raw;
}

/**
 * เพดานรวมทั้งระบบต่อวัน — ค่าเริ่มต้นมีจริง ไม่ปิดทิ้งไว้เฉย ๆ
 *
 * เหตุผลที่เลือก 10,000 ครั้ง/วัน:
 * - ผู้เรียนปัจจุบัน ~1,237 บัญชี × โควตา 5 คำถาม/ข้อ/วัน ≈ 6,185 ครั้ง/วัน
 *   → 10,000 ครอบการใช้งานเต็มพอดีของฐานผู้ใช้ปัจจุบัน และยังเหลือ headroom
 * - เป็นเพดานต้นทุน: ถ้า rollout เปิด 100% หรือมีลูปยิงซ้ำ จะตัดได้ก่อนเสียเงินมาก
 * - ค่าใช้จ่ายสูงสุดถ้าทุกครั้งตกไปใช้โมเดลเสียเงินจริง (deepseek ~2.5k input + 600 output
 *   ≈ 31M token/วัน ≈ $1.1/วัน) — เพดานที่ยังคุมได้
 *
 * ⚠️ ค่า 0 หรือค่าผิดพลาด = ใช้ค่าเริ่มต้นนี้ (10,000) **ไม่ใช่** "ปิดทุกคน"
 * วิธีปิดฉุกเฉินที่ถูกต้อง = สวิตช์ชั่วคราวในหน้า /admin/ai-tutor หรือ env AI_TUTOR_ENABLED=false
 * (ช่วงค่าที่อนุญาตของค่านี้: 1–20000 — ดู src/lib/ai-tutor/ranges.ts)
 *
 * ปรับด้วย env AI_TUTOR_SYSTEM_DAILY_LIMIT
 */
export const DEFAULT_SYSTEM_DAILY_LIMIT = 10_000;

export function systemDailyLimit(): number {
  const raw = Number.parseInt(process.env.AI_TUTOR_SYSTEM_DAILY_LIMIT ?? '', 10);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_SYSTEM_DAILY_LIMIT;
  return raw;
}

/**
 * แถวสถานะ pending ที่ค้างเกิน 2 นาที (เช่น เซิร์ฟเวอร์ตายกลาง stream) ไม่นับเข้าโควตา
 * — นับเฉพาะที่ยัง "มีชีวิต" อยู่จริง
 */
export const STALE_PENDING_MS = 2 * 60 * 1000;

/** จำนวนครั้งที่เรียกโมเดลจริงของ (ผู้เรียน, ข้อ) ตั้งแต่เริ่มวันไทย — แถว failed ไม่นับ (คืนโควตา) */
export async function countUsedQuestions(params: {
  userId: string;
  questionId: number;
  now?: Date;
  executor?: Pick<typeof db, 'select'>;
}): Promise<number> {
  const executor = params.executor ?? db;
  const now = params.now ?? new Date();
  const rows = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(aiTutorMessages)
    .where(and(
      eq(aiTutorMessages.userId, params.userId),
      eq(aiTutorMessages.questionId, params.questionId),
      eq(aiTutorMessages.role, 'user'),
      // นับแถวที่สำเร็จ หรือที่ยังรอคำตอบอยู่และไม่ค้างเกิน 2 นาที
      or(
        eq(aiTutorMessages.status, 'ok'),
        and(
          eq(aiTutorMessages.status, 'pending'),
          gte(aiTutorMessages.createdAt, new Date(now.getTime() - STALE_PENDING_MS)),
        ),
      ),
      gte(aiTutorMessages.createdAt, bangkokDayStartUtc(now)),
    ));
  return rows[0]?.count ?? 0;
}

export type QuotaSnapshot = {
  used: number;
  limit: number;
  remaining: number;
};

export async function getQuotaSnapshot(params: {
  userId: string;
  questionId: number;
  now?: Date;
  /** โควตาต่อข้อ/วัน — ส่งค่าจาก getAiTutorConfig() (DB ทับ env); ไม่ส่ง = ใช้ค่า env */
  limit?: number;
}): Promise<QuotaSnapshot> {
  const limit = params.limit ?? questionQuotaLimit();
  const used = await countUsedQuestions(params);
  return { used, limit, remaining: Math.max(0, limit - used) };
}

/**
 * จำนวนครั้งที่ผู้เรียนถาม AI วันนี้ — ทุกข้อรวมกัน (ไม่ใช่ต่อข้อ)
 *
 * นับแถวเดียวกับ countUsedQuestions (แถว role='user' ที่สำเร็จ หรือค้างไม่เกิน 2 นาที
 * แถว failed ไม่นับ = คืนโควตา) แต่ไม่กรองด้วย question_id
 */
export async function countUserDailyQuestions(params: {
  userId: string;
  now?: Date;
  executor?: Pick<typeof db, 'select'>;
}): Promise<number> {
  const executor = params.executor ?? db;
  const now = params.now ?? new Date();
  const rows = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(aiTutorMessages)
    .where(and(
      eq(aiTutorMessages.userId, params.userId),
      eq(aiTutorMessages.role, 'user'),
      or(
        eq(aiTutorMessages.status, 'ok'),
        and(
          eq(aiTutorMessages.status, 'pending'),
          gte(aiTutorMessages.createdAt, new Date(now.getTime() - STALE_PENDING_MS)),
        ),
      ),
      gte(aiTutorMessages.createdAt, bangkokDayStartUtc(now)),
    ));
  return rows[0]?.count ?? 0;
}

/**
 * โควตารวมทั้งวันของผู้เรียน (เพดานรายวัน = userDailyLimit)
 *
 * ใช้แสดงฝั่ง client ("ถามแล้ว N คำถาม / เหลือโควตา M ครั้ง") ให้ตรงกับเพดานที่ผู้ดูแลตั้ง
 */
export async function getDailyQuotaSnapshot(params: {
  userId: string;
  limit: number;
  now?: Date;
}): Promise<QuotaSnapshot> {
  const used = await countUserDailyQuestions({ userId: params.userId, now: params.now });
  return { used, limit: params.limit, remaining: Math.max(0, params.limit - used) };
}

/**
 * จำนวนคำถาม AI ทั้งระบบวันนี้ (ทุกผู้เรียน) — ใช้เป็น **เพดานต้นทุนแบบ SQL**
 *
 * ทำไมต้องมี: ตัวนับฝั่ง Redis (rateLimit) เป็น fail-open เมื่อ Upstash ล่ม
 * (ดู src/lib/rate-limit.ts:43-47) → ถ้า Redis ล่ม เพดานรวมทั้งระบบจะหลุด
 * → ต้องมี SQL เป็นตาข่ายที่สองก่อนเรียกโมเดล
 *
 * นับแถวเดียวกับ countUsedQuestions (role='user', สำเร็จ หรือค้างไม่เกิน 2 นาที)
 * แต่ไม่กรอง user_id → นับทั้งระบบในวันเวลาไทย
 */
export async function countSystemDailyQuestions(params: {
  now?: Date;
  executor?: Pick<typeof db, 'select'>;
} = {}): Promise<number> {
  const executor = params.executor ?? db;
  const now = params.now ?? new Date();
  const rows = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(aiTutorMessages)
    .where(and(
      eq(aiTutorMessages.role, 'user'),
      or(
        eq(aiTutorMessages.status, 'ok'),
        and(
          eq(aiTutorMessages.status, 'pending'),
          gte(aiTutorMessages.createdAt, new Date(now.getTime() - STALE_PENDING_MS)),
        ),
      ),
      gte(aiTutorMessages.createdAt, bangkokDayStartUtc(now)),
    ));
  return rows[0]?.count ?? 0;
}

export type ReserveResult =
  | { ok: true; messageId: number; quota: QuotaSnapshot; reused: boolean }
  | { ok: false; reason: 'quota' | 'daily_quota'; quota: QuotaSnapshot };

/**
 * จองโควตา 1 ครั้ง (นับ + แทรกแถว pending) แบบ atomic
 *
 * - ล็อก (user, question) ด้วย pg_advisory_xact_lock → กดพร้อมกันไม่เกินโควตา
 * - ถ้ามีแถว failed ของข้อความเดิมเมื่อไม่นานมาก (ปุ่ม "ลองใหม่") → ใช้แถวเดิม
 *   แทนการสร้างใหม่ → ไม่เสียโควตา
 */
export async function reserveQuestion(params: {
  userId: string;
  questionId: number;
  message: string;
  now?: Date;
  /** เพดานโควตาต่อข้อ — ค่าจาก config (DB ทับ env); ไม่ส่ง = ใช้ค่าตั้งต้นจาก env */
  limit?: number;
  /**
   * เพดานรายวันของผู้เรียน (ทุกข้อรวมกัน) — ค่าจาก config (DB ทับ env)
   *
   * ตัวบังคับจริงเป็น **SQL** (ไม่ใช่ Redis) → นับด้วย countUserDailyQuestions()
   * ซึ่งเป็นฟังก์ชันเดียวกับที่ใช้แสดงตัวเลขให้ผู้เรียน (แหล่งเดียวกัน)
   *
   * **บังคับต้องส่ง** (type-level) → typecheck จับ caller ที่ลืมส่ง
   * (ถ้าไม่ส่ง = ไม่มีเพดานรายวัน = ผู้เรียนถามได้ไม่จำกัด)
   */
  dailyLimit: number;
  /**
   * รหัสรอบการทำข้อสอบ — ผูกแถวกับรอบ (แต่ **โควตาไม่ผูกกับรอบ**
   * นับต่อ (user, question) ต่อวันเหมือนเดิม ไม่งั้นผู้เรียนจะเปลี่ยนรอบเพื่อเลี่ยงโควตาได้)
   * ต้องส่งมาเสมอ (type-level) → ปุ่ม "ลองใหม่" จะไม่ไปใช้แถวของรอบอื่น
   */
  attemptKey: string;
}): Promise<ReserveResult> {
  const now = params.now ?? new Date();
  const limit = params.limit ?? questionQuotaLimit();
  const lockKey = `ai-tutor:${params.userId}:${params.questionId}`;
  // ล็อกระดับผู้เรียนก่อน (กัน race ของเพดานรายวันระหว่างคนละข้อ) → แล้วค่อยล็อกระดับข้อ
  // ลำดับการล็อกต้องเหมือนกันทุกครั้งเพื่อไม่ให้เกิด deadlock
  const dailyLockKey = `ai-tutor-daily:${params.userId}`;

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${dailyLockKey}, 0))`,
    );
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
    );

    // ─── เพดานรายวันของผู้เรียน (SQL — แหล่งเดียวกับตัวเลขที่แสดง) ───
    const dailyUsed = await countUserDailyQuestions({
      userId: params.userId,
      now,
      executor: tx as never,
    });
    if (dailyUsed >= params.dailyLimit) {
      return {
        ok: false as const,
        reason: 'daily_quota' as const,
        quota: { used: dailyUsed, limit: params.dailyLimit, remaining: 0 },
      };
    }

    const usedRows = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(aiTutorMessages)
      .where(and(
        eq(aiTutorMessages.userId, params.userId),
        eq(aiTutorMessages.questionId, params.questionId),
        eq(aiTutorMessages.role, 'user'),
        // แถว pending ที่ค้างเกิน 2 นาที (เซิร์ฟเวอร์ตายกลาง stream) ไม่นับ
        or(
          eq(aiTutorMessages.status, 'ok'),
          and(
            eq(aiTutorMessages.status, 'pending'),
            gte(aiTutorMessages.createdAt, new Date(now.getTime() - STALE_PENDING_MS)),
          ),
        ),
        gte(aiTutorMessages.createdAt, bangkokDayStartUtc(now)),
      ));
    const used = usedRows[0]?.count ?? 0;

    if (used >= limit) {
      return {
        ok: false as const,
        reason: 'quota' as const,
        quota: { used, limit, remaining: Math.max(0, limit - used) },
      };
    }

    // ปุ่ม "ลองใหม่" — ใช้แถว failed เดิมของข้อความเดียวกัน (ภายใน 10 นาที) เพื่อไม่เสียโควตา
    // ต้องเป็นแถวของรอบเดียวกันด้วย (ไม่งั้นรอบใหม่จะไปใช้แถวของรอบเก่า)
    const recentFailed = await tx
      .select({ id: aiTutorMessages.id })
      .from(aiTutorMessages)
      .where(and(
        eq(aiTutorMessages.userId, params.userId),
        eq(aiTutorMessages.questionId, params.questionId),
        eq(aiTutorMessages.role, 'user'),
        eq(aiTutorMessages.status, 'failed'),
        eq(aiTutorMessages.content, params.message),
        eq(aiTutorMessages.attemptKey, params.attemptKey),
        gte(aiTutorMessages.createdAt, new Date(now.getTime() - 10 * 60 * 1000)),
      ))
      .limit(1);

    if (recentFailed[0]) {
      // คืน archived=false ด้วย: แถว failed อาจถูกเก็บถังด้วยปุ่ม reset ไปก่อนหน้า
      // (reset เก็บถังไม่คืนโควตา) ถ้าไม่คืน แถวจะยังค้าง archived=true
      // → ข้อความของผู้เรียนไม่โผล่ในเธรด แม้เรียกโมเดลจริง
      const [updated] = await tx
        .update(aiTutorMessages)
        .set({ status: 'pending', createdAt: now, archived: false })
        .where(eq(aiTutorMessages.id, recentFailed[0].id))
        .returning({ id: aiTutorMessages.id });
      return {
        ok: true as const,
        messageId: updated?.id ?? recentFailed[0].id,
        quota: { used, limit, remaining: Math.max(0, limit - used) },
        reused: true,
      };
    }

    // insert ผ่านตัวช่วยกลาง → บังคับ questionId เป็นเลขเสมอ (ไม่มีแถว NULL โดยบังเอิญ)
    const insertedId = await insertAiTutorMessage(
      {
        userId: params.userId,
        questionId: params.questionId,
        role: 'user',
        content: params.message,
        status: 'pending',
        createdAt: now,
        attemptKey: params.attemptKey ?? null,
      },
      tx as never,
    );

    return {
      ok: true as const,
      messageId: insertedId,
      quota: { used: used + 1, limit, remaining: Math.max(0, limit - used - 1) },
      reused: false,
    };
  });
}
