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

export type RetentionArgs = {
  days: number;
  apply: boolean;
  blank: boolean;
};

export function parseRetentionArgs(argv: string[], env: NodeJS.ProcessEnv = process.env): RetentionArgs {
  const envDays = Number.parseInt(env.AI_TUTOR_RETENTION_DAYS ?? '', 10);
  let days = Number.isFinite(envDays) && envDays > 0 ? envDays : DEFAULT_RETENTION_DAYS;
  let apply = false;
  let blank = false;
  for (const arg of argv) {
    if (arg === '--apply') apply = true;
    else if (arg === '--blank') blank = true;
    else if (arg.startsWith('--days=')) days = Number.parseInt(arg.split('=')[1], 10) || days;
  }
  return { days, apply, blank };
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
