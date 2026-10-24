import { and, eq, lt, sql } from 'drizzle-orm';

import { db } from '@/db';
import { aiTutorFeedback, aiTutorMessages } from '@/db/schema';

/**
 * นโยบายเก็บข้อมูล AI Tutor (ต่อยอดจาก scripts/ai-tutor-retention.ts)
 *
 * - โหมดปกติคือ dry-run: นับและรายงานเท่านั้น ไม่ลบอะไร
 * - ลบจริงต้องใส่ --apply (และ --blank = เว้นว่าง content แทนการลบแถว)
 */
export const DEFAULT_RETENTION_DAYS = 180;

/**
 * จำนวนวันขั้นต่ำที่ยอมให้ลบ (กันลบข้อมูลผิดช่วงด้วยค่าพิมพ์ผิด)
 * เช่น "--days 3O" (ตัว O) หรือ "--days 0" → ต้อง error ไม่ใช่ fallback เงียบ ๆ
 */
export const MIN_RETENTION_DAYS = 30;

export type RetentionArgs =
  | {
      ok: true;
      days: number;
      apply: boolean;
      blank: boolean;
      /** host ที่ผู้ใช้ยืนยัน (ต้องตรงกับ host ของ DATABASE_URL ก่อนเขียนจริง) */
      confirmHost: string | null;
    }
  | { ok: false; error: string };

/**
 * ตรวจค่า --days: ต้องเป็นจำนวนเต็มบวกตาม /^\d+$/ และไม่น้อยกว่า MIN_RETENTION_DAYS
 * ค่าผิด → คืน error (ผู้เรียกต้องออกด้วย exit 1 ไม่ใช่ใช้ค่าเริ่มต้มเงียบ ๆ)
 */
function parseDaysValue(raw: string, source: string): { ok: true; days: number } | { ok: false; error: string } {
  const value = raw.trim();
  if (!/^\d+$/.test(value)) {
    return {
      ok: false,
      error: `${source} ต้องเป็นจำนวนเต็มบวก (เช่น 30, 90) — ได้รับ "${raw}"`,
    };
  }
  const days = Number.parseInt(value, 10);
  if (days < MIN_RETENTION_DAYS) {
    return {
      ok: false,
      error: `${source} ต้องไม่น้อยกว่า ${MIN_RETENTION_DAYS} วัน — ได้รับ ${days}`,
    };
  }
  return { ok: true, days };
}

export function parseRetentionArgs(argv: string[], env: NodeJS.ProcessEnv = process.env): RetentionArgs {
  // ค่าเริ่มต้นจาก env (ถ้าตั้งไว้) — ต้องผ่านการตรวจเหมือนกัน
  let days = DEFAULT_RETENTION_DAYS;
  const envDaysRaw = (env.AI_TUTOR_RETENTION_DAYS ?? '').trim();
  if (envDaysRaw) {
    const parsedEnv = parseDaysValue(envDaysRaw, 'AI_TUTOR_RETENTION_DAYS');
    if (!parsedEnv.ok) return { ok: false, error: parsedEnv.error };
    days = parsedEnv.days;
  }

  let apply = false;
  let blank = false;
  let confirmHost: string | null = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') apply = true;
    else if (arg === '--blank') blank = true;
    else if (arg === '--confirm-host') {
      index += 1;
      confirmHost = argv[index] ?? null;
    } else if (arg.startsWith('--confirm-host=')) {
      confirmHost = arg.slice('--confirm-host='.length);
    } else if (arg === '--days') {
      // รูปแบบ "--days 30" (ค่าเป็นอาร์กิวเมนต์ถัดไป)
      index += 1;
      const parsed = parseDaysValue(argv[index] ?? '', '--days');
      if (!parsed.ok) return { ok: false, error: parsed.error };
      days = parsed.days;
    } else if (arg.startsWith('--days=')) {
      // รูปแบบ "--days=30"
      const parsed = parseDaysValue(arg.slice('--days='.length), '--days');
      if (!parsed.ok) return { ok: false, error: parsed.error };
      days = parsed.days;
    }
  }
  return { ok: true, days, apply, blank, confirmHost };
}

export function retentionCutoff(days: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export type RetentionTargets = {
  messages: number;
  feedback: number;
};

/** นับเฉพาะจำนวน — ไม่เขียนอะไรลง DB (dry-run ปลอดภัยเสมอ) */
export async function countRetentionTargets(
  cutoff: Date,
  executor: typeof db = db,
): Promise<RetentionTargets> {
  const [messages] = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(aiTutorMessages)
    .where(lt(aiTutorMessages.createdAt, cutoff));
  const [feedback] = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(aiTutorFeedback)
    .where(sql`message_id in (select id from ai_tutor_messages where created_at < ${cutoff})`);
  return { messages: messages?.count ?? 0, feedback: feedback?.count ?? 0 };
}

/** ลบจริง — ใช้เมื่อผู้ใช้สั่ง --apply เท่านั้น */
export async function applyRetention(cutoff: Date, blank: boolean): Promise<RetentionTargets> {
  const targets = await countRetentionTargets(cutoff);
  if (blank) {
    await db
      .update(aiTutorMessages)
      .set({ content: '' })
      .where(lt(aiTutorMessages.createdAt, cutoff));
    return targets;
  }
  await db.transaction(async (tx) => {
    await tx.delete(aiTutorFeedback).where(
      sql`message_id in (select id from ai_tutor_messages where created_at < ${cutoff})`,
    );
    await tx.delete(aiTutorMessages).where(lt(aiTutorMessages.createdAt, cutoff));
  });
  return targets;
}

/** helper สำหรับทดสอบ/เรียกจากนอก */
export const retentionWhere = { and, eq };
