/**
 * สถานะของกิจกรรม Tap & Select — ระดับ "กิจกรรม" (หนึ่งข้อ) เก็บใน `tap_exercise.status`
 *
 * กติกาเดียวกับเนื้อหา Explain (ดู src/lib/explain-visibility.ts) แต่ต่างกันหนึ่งจุด:
 * ค่าที่ไม่ระบุ/ไม่รู้จักถือว่า `'published'` เพราะกิจกรรมที่สร้างไว้ก่อนมีฟีเจอร์นี้
 * (ยังไม่มีฟิลด์ status) ต้องไม่หายจากข้อสอบของผู้เรียนโดยไม่ตั้งใจ
 *
 * ผู้เรียนเห็นเฉพาะกิจกรรม `'published'` — สถานะอื่น (ฉบับร่าง/รอตรวจสอบ/ปิดชั่วคราว)
 * แอดมินเท่านั้นที่เห็นและทำได้ ทั้งในหน้าจัดชุดข้อสอบและหน้าทำข้อสอบจริงที่เปิดด้วย
 * โหมดพรีวิว (`?preview=1`) ซึ่งตรวจสิทธิ์ด้วย `isAdminRequest()` ที่เดียวกับ Explain
 */

import { CONTENT_STATUSES, type ContentStatus } from '@/lib/explain-visibility';

export type TapExerciseStatus = ContentStatus;

/** กิจกรรมที่มีฟิลด์ status — ใช้กับทั้งแถวจาก DB และ payload ของแอดมิน */
export interface TapExerciseLike {
  status?: unknown;
}

/** ค่าที่ไม่รู้จัก/ไม่ระบุ → `'published'` (กิจกรรมเดิมต้องไม่ถูกซ่อน) */
export function parseTapExerciseStatus(value: unknown): TapExerciseStatus {
  return typeof value === 'string' && (CONTENT_STATUSES as readonly string[]).includes(value)
    ? (value as TapExerciseStatus)
    : 'published';
}

/**
 * อ่านค่าสถานะจาก payload ของแอดมิน — null = ค่าที่ไม่รู้จัก (ผู้เรียกตอบ 400)
 * ไม่ส่งมา = ไม่แก้สถานะ (คืน `undefined` ให้ผู้เรียกเลือกเองว่าจะคงค่าเดิมหรือใส่ค่าเริ่มต้น)
 */
export function resolveTapExerciseStatus(value: unknown): TapExerciseStatus | null | undefined {
  if (value === undefined || value === null) return undefined;
  return typeof value === 'string' && (CONTENT_STATUSES as readonly string[]).includes(value)
    ? (value as TapExerciseStatus)
    : null;
}

/** ผู้เรียนเห็นกิจกรรมนี้ได้ไหม (สถานะอื่นนอกจาก published = แอดมินเท่านั้น) */
export function isTapExerciseVisibleToLearners(exercise: TapExerciseLike | null | undefined): boolean {
  return parseTapExerciseStatus(exercise?.status) === 'published';
}

/**
 * ตัดกิจกรรม Tap & Select ที่ยังไม่เผยแพร่ออกก่อนส่งให้ผู้เรียน
 * — ข้อชนิดอื่นผ่านเสมอ (ฟิลด์นี้มีเฉพาะกิจกรรม Tap & Select)
 */
export function filterQuestionsForLearners<T extends object>(rows: T[]): T[] {
  return rows.filter((row) => {
    const tapExercise = (row as { tapExercise?: TapExerciseLike | null }).tapExercise;
    return !tapExercise || isTapExerciseVisibleToLearners(tapExercise);
  });
}
