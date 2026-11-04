/**
 * Draft ของชุดข้อสอบ — เก็บใน `test_attempts.draft_state` (ฝั่งเซิร์ฟเวอร์)
 *
 * ทำไมต้องมี: `src/lib/test-progress.ts` เก็บความคืบหน้าใน sessionStorage ซึ่ง
 * **แยกตามแท็บ** → เปิดแท็บใหม่/เปลี่ยนเครื่องแล้วคำตอบที่ตรวจแล้วหายหมด
 * (อาการจริง: แท็บเดิมอยู่ข้อ 11, แท็บใหม่เริ่มข้อ 1)
 *
 * กติกาความปลอดภัย:
 * - ทุกค่าที่รับจาก client ถูก sanitize ซ้ำ (ดู test-draft-payload.ts)
 * - ผูกกับ (user, testTypeId, testSetId) เสมอ — ห้ามให้ client ระบุ id ของแถวเอง
 * - ใช้ status='in_progress' เป็นตัวแยก "รอบที่กำลังทำ" ออกจากผลสอบจริง
 *   (ทุกหน้าสถิติกรอง status='completed' อยู่แล้ว)
 */
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { testAttempts } from '@/db/schema';
import { sanitizeDraft, type TestDraft } from './test-draft-payload';

export type { DraftAnswerCheck, TestDraft } from './test-draft-payload';
export { sanitizeDraft } from './test-draft-payload';

export type TestDraftScope = {
  userId: string;
  sectionId: string;
  setId: number;
};

/** draft ที่ค้างอยู่ของ (ผู้ใช้, พาร์ท, ชุด) — null = ไม่มี */
export async function readDraft(scope: TestDraftScope): Promise<TestDraft | null> {
  const [row] = await db
    .select({ draftState: testAttempts.draftState })
    .from(testAttempts)
    .where(and(
      eq(testAttempts.userId, scope.userId),
      eq(testAttempts.testTypeId, scope.sectionId),
      eq(testAttempts.testSetId, scope.setId),
      eq(testAttempts.status, 'in_progress'),
      sql`${testAttempts.draftState} IS NOT NULL`,
    ))
    .orderBy(sql`${testAttempts.updatedAt} desc`)
    .limit(1);

  if (!row) return null;
  return sanitizeDraft(row.draftState);
}

/**
 * บันทึก draft — สร้างแถว in_progress ถ้ายังไม่มี, อัปเดตแถวเดิมถ้ามี
 * คืน false เมื่อเขียนไม่สำเร็จ (ผู้เรียกไม่ต้องล้มทั้ง request)
 */
export async function writeDraft(scope: TestDraftScope, draft: TestDraft): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: testAttempts.id })
      .from(testAttempts)
      .where(and(
        eq(testAttempts.userId, scope.userId),
        eq(testAttempts.testTypeId, scope.sectionId),
        eq(testAttempts.testSetId, scope.setId),
        eq(testAttempts.status, 'in_progress'),
      ))
      .limit(1);

    if (existing) {
      await tx
        .update(testAttempts)
        .set({ draftState: draft, lastActivityAt: new Date(), updatedAt: new Date() })
        .where(eq(testAttempts.id, existing.id));
      return true;
    }

    // ยังไม่มีรอบที่กำลังทำ → สร้างแถวใหม่ (ยังไม่มี score/คำตอบ เพราะยังไม่ส่ง)
    await tx.insert(testAttempts).values({
      userId: scope.userId,
      testTypeId: scope.sectionId,
      testSetId: scope.setId,
      status: 'in_progress',
      draftState: draft,
      lastActivityAt: new Date(),
      currentLevels: {},
      adaptivePath: [],
    });
    return true;
  }).catch((error) => {
    console.error('[test-draft] write failed:', error);
    return false;
  });
}

/** ล้าง draft (ผู้เรียนกดเริ่มชุดใหม่/ยกเลิก) — ไม่ลบแถว แค่ปิดรอบ */
export async function clearDraft(scope: TestDraftScope): Promise<void> {
  await db
    .update(testAttempts)
    .set({ status: 'cancelled', draftState: null, updatedAt: new Date() })
    .where(and(
      eq(testAttempts.userId, scope.userId),
      eq(testAttempts.testTypeId, scope.sectionId),
      eq(testAttempts.testSetId, scope.setId),
      eq(testAttempts.status, 'in_progress'),
    ));
}

/**
 * เรียกหลัง submit สำเร็จ — ปิดทุก draft ที่ค้างของชุดนี้ของผู้ใช้
 * (best-effort: ถ้าพลาดก็แค่มีแถว in_progress ค้าง ซึ่งไม่โผล่ในสถิติ)
 *
 * หมายเหตุ: ห้ามลบแถว — เปลี่ยนสถานะเท่านั้น (ประวัติ/grading ของผู้เรียนห้ามแตะ)
 */
export async function closeDraftAfterSubmit(
  userId: string,
  sectionId: string,
  setId: number | null,
): Promise<void> {
  const conditions = [
    eq(testAttempts.userId, userId),
    eq(testAttempts.testTypeId, sectionId),
    eq(testAttempts.status, 'in_progress'),
  ];
  if (setId !== null) conditions.push(eq(testAttempts.testSetId, setId));
  await db
    .update(testAttempts)
    .set({ status: 'cancelled', draftState: null, updatedAt: new Date() })
    .where(and(...conditions));
}
