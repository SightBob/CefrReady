/**
 * สถิติการใช้งาน AI Tutor "วันนี้" (ตามเวลาไทย) สำหรับหน้า admin
 *
 * อ่านอย่างเดียว — ใช้ query เดียวกับตัวบังคับโควตาจริง (src/lib/ai-tutor/quota.ts)
 * เพื่อให้ตัวเลขที่ผู้ดูแลเห็นตรงกับสิ่งที่ระบบนับ:
 *   role='user' และ (status='ok' หรือ status='pending' ที่ยังไม่ค้างเกิน 2 นาที)
 *   → แถว failed ไม่ถูกนับ (คืนโควตาแล้ว)
 *
 * ⚠️ ยังไม่รวมตัวนับ Redis ของเพดานรวมทั้งระบบ (rate-limit) — ตัวเลขนี้คือ
 * "จำนวนครั้งที่เรียกโมเดลจริงตามฐานข้อมูล" ซึ่งเป็นแหล่งที่ใช้ตัดสินโควตาของผู้เรียน
 */

import { and, desc, eq, gte, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import { aiTutorMessages, users } from '@/db/schema';

import { bangkokDayStartUtc, STALE_PENDING_MS } from './quota';

export type AiTutorUsageTopLearner = {
  userId: string;
  email: string;
  name: string | null;
  /** จำนวนคำถามที่ถูกนับเข้าโควตาวันนี้ */
  count: number;
};

export type AiTutorUsageSnapshot = {
  /** ISO ของเที่ยงคืนตามเวลาไทย (วันนี้) */
  dayStart: string;
  /** ISO ของเที่ยงคืนถัดไป (เวลารีเซ็ตโควตา) */
  resetAt: string;
  /** จำนวนคำถามที่ถูกนับเข้าโควตาวันนี้ (ทั้งระบบ) */
  questions: number;
  /** จำนวนคำตอบของโมเดลที่สำเร็จวันนี้ */
  answers: number;
  /** จำนวนคำถามที่ล้มเหลววันนี้ (คืนโควตาแล้ว) */
  failed: number;
  /** จำนวนผู้เรียนที่ไม่ซ้ำกันและถูกนับโควตาวันนี้ */
  learners: number;
  /** คำขอที่กำลังประมวลผลอยู่ ณ ตอนนี้ (pending ไม่เกิน 2 นาที) */
  pending: number;
  /** เวลาของข้อความล่าสุดที่ถูกนับ (ISO) หรือ null ถ้ายังไม่มีวันนี้ */
  lastActivityAt: string | null;
  /** ผู้เรียนที่ใช้มากสุดวันนี้ (สูงสุด 3 คน) */
  topLearners: AiTutorUsageTopLearner[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * เงื่อนไข "แถวที่ถูกนับเข้าโควตา" — ต้องตรงกับ countSystemDailyQuestions()
 * ใน src/lib/ai-tutor/quota.ts (สำเนา SQL เดียวกัน เพื่อไม่ให้ตัวเลขสองที่ไม่ตรงกัน)
 */
function countedCondition(dayStart: Date, freshSince: Date) {
  return and(
    eq(aiTutorMessages.role, 'user'),
    or(
      eq(aiTutorMessages.status, 'ok'),
      and(
        eq(aiTutorMessages.status, 'pending'),
        gte(aiTutorMessages.createdAt, freshSince),
      ),
    ),
    gte(aiTutorMessages.createdAt, dayStart),
  );
}

/** สถิติการใช้งานของวันไทยปัจจุบัน */
export async function getAiTutorUsageSnapshot(now: Date = new Date()): Promise<AiTutorUsageSnapshot> {
  const dayStart = bangkokDayStartUtc(now);
  const resetAt = new Date(dayStart.getTime() + DAY_MS);
  const freshSince = new Date(now.getTime() - STALE_PENDING_MS);
  const counted = countedCondition(dayStart, freshSince);

  const [countedRows, answerRows, failedRows, pendingRows, topRows] = await Promise.all([
    db
      .select({
        questions: sql<number>`count(*)::int`,
        learners: sql<number>`count(distinct ${aiTutorMessages.userId})::int`,
        lastActivityAt: sql<string | Date | null>`max(${aiTutorMessages.createdAt})`,
      })
      .from(aiTutorMessages)
      .where(counted),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(aiTutorMessages)
      .where(and(
        eq(aiTutorMessages.role, 'assistant'),
        eq(aiTutorMessages.status, 'ok'),
        gte(aiTutorMessages.createdAt, dayStart),
      )),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(aiTutorMessages)
      .where(and(
        eq(aiTutorMessages.role, 'user'),
        eq(aiTutorMessages.status, 'failed'),
        gte(aiTutorMessages.createdAt, dayStart),
      )),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(aiTutorMessages)
      .where(and(
        eq(aiTutorMessages.role, 'user'),
        eq(aiTutorMessages.status, 'pending'),
        gte(aiTutorMessages.createdAt, freshSince),
        gte(aiTutorMessages.createdAt, dayStart),
      )),
    db
      .select({
        userId: aiTutorMessages.userId,
        email: users.email,
        name: users.name,
        count: sql<number>`count(*)::int`,
      })
      .from(aiTutorMessages)
      .leftJoin(users, eq(users.id, aiTutorMessages.userId))
      .where(counted)
      .groupBy(aiTutorMessages.userId, users.email, users.name)
      .orderBy(desc(sql`count(*)`))
      .limit(3),
  ]);

  const countedRow = countedRows[0];
  const lastRaw = countedRow?.lastActivityAt ?? null;
  const lastActivityAt = lastRaw ? new Date(lastRaw).toISOString() : null;

  return {
    dayStart: dayStart.toISOString(),
    resetAt: resetAt.toISOString(),
    questions: countedRow?.questions ?? 0,
    answers: answerRows[0]?.count ?? 0,
    failed: failedRows[0]?.count ?? 0,
    learners: countedRow?.learners ?? 0,
    pending: pendingRows[0]?.count ?? 0,
    lastActivityAt,
    topLearners: topRows.map((row) => ({
      userId: row.userId,
      email: row.email ?? '(ไม่พบบัญชี)',
      name: row.name ?? null,
      count: row.count,
    })),
  };
}
