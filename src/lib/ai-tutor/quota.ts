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
 */
import { and, eq, gte, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import { aiTutorMessages } from '@/db/schema';

/** Asia/Bangkok = UTC+7 ตลอดปี (ไม่มี DST) → คำนวณวันเริ่มต้นได้โดยไม่ต้องมี tz database */
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** เริ่มต้นของ "วันตามเวลาไทย" ในรูปแบบ UTC (ใช้เทียบกับ created_at) */
export function bangkokDayStartUtc(now: Date = new Date()): Date {
  const bangkokNow = now.getTime() + BANGKOK_OFFSET_MS;
  const bangkokMidnight = Math.floor(bangkokNow / DAY_MS) * DAY_MS;
  return new Date(bangkokMidnight - BANGKOK_OFFSET_MS);
}

/** โควตาต่อ (ผู้เรียน, ข้อ) ต่อวัน — ค่าเริ่มต้น 5 */
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
 * เพดานรวมทั้งระบบต่อวัน (kill switch) — ค่าเริ่มต้นมีจริง ไม่ปิดทิ้งไว้เฉย ๆ
 *
 * เหตุผลที่เลือก 10,000 ครั้ง/วัน:
 * - ผู้เรียนปัจจุบัน ~1,237 บัญชี × โควตา 5 คำถาม/ข้อ/วัน ≈ 6,185 ครั้ง/วัน
 *   → 10,000 ครอบการใช้งานเต็มพอดีของฐานผู้ใช้ปัจจุบัน และยังเหลือ headroom
 * - เป็น kill switch: ถ้า rollout เปิด 100% หรือมีลูปยิงซ้ำ จะตัดได้ก่อนเสียเงินมาก
 * - ค่าใช้จ่ายสูงสุดถ้าทุกครั้งตกไปใช้โมเดลเสียเงินจริง (deepseek ~2.5k input + 600 output
 *   ≈ 31M token/วัน ≈ $1.1/วัน) — เพดานที่ยังคุมได้
 * ปรับด้วย env AI_TUTOR_SYSTEM_DAILY_LIMIT (ค่า 0 หรือผิดพลาด = ใช้ค่าเริ่มต้นนี้)
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
}): Promise<QuotaSnapshot> {
  const limit = questionQuotaLimit();
  const used = await countUsedQuestions(params);
  return { used, limit, remaining: Math.max(0, limit - used) };
}

export type ReserveResult =
  | { ok: true; messageId: number; quota: QuotaSnapshot; reused: boolean }
  | { ok: false; reason: 'quota'; quota: QuotaSnapshot };

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
}): Promise<ReserveResult> {
  const now = params.now ?? new Date();
  const limit = questionQuotaLimit();
  const lockKey = `ai-tutor:${params.userId}:${params.questionId}`;

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
    );

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
    const recentFailed = await tx
      .select({ id: aiTutorMessages.id })
      .from(aiTutorMessages)
      .where(and(
        eq(aiTutorMessages.userId, params.userId),
        eq(aiTutorMessages.questionId, params.questionId),
        eq(aiTutorMessages.role, 'user'),
        eq(aiTutorMessages.status, 'failed'),
        eq(aiTutorMessages.content, params.message),
        gte(aiTutorMessages.createdAt, new Date(now.getTime() - 10 * 60 * 1000)),
      ))
      .limit(1);

    if (recentFailed[0]) {
      const [updated] = await tx
        .update(aiTutorMessages)
        .set({ status: 'pending', createdAt: now })
        .where(eq(aiTutorMessages.id, recentFailed[0].id))
        .returning({ id: aiTutorMessages.id });
      return {
        ok: true as const,
        messageId: updated?.id ?? recentFailed[0].id,
        quota: { used, limit, remaining: Math.max(0, limit - used) },
        reused: true,
      };
    }

    const [inserted] = await tx
      .insert(aiTutorMessages)
      .values({
        userId: params.userId,
        questionId: params.questionId,
        role: 'user',
        content: params.message,
        status: 'pending',
        createdAt: now,
      })
      .returning({ id: aiTutorMessages.id });

    return {
      ok: true as const,
      messageId: inserted?.id ?? 0,
      quota: { used: used + 1, limit, remaining: Math.max(0, limit - used - 1) },
      reused: false,
    };
  });
}
