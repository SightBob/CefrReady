/**
 * ตำแหน่งข้อที่ผู้เรียนค้างอยู่ของชุดข้อสอบ — เก็บใน sessionStorage
 * เพื่อให้ **refresh แล้วกลับมาที่ข้อเดิม** (ผู้ใช้กำหนด 2026-10-25)
 *
 * - หน้าสอบอ่านค่าตอน mount / เปลี่ยนชุด → เริ่มที่ข้อที่ค้างไว้
 * - เขียนทุกครั้งที่ผู้เรียนเปลี่ยนข้อ
 * - หนึ่งแท็บต่อหนึ่งชุด · ไม่มีข้อมูลผู้ใช้ · หายเองเมื่อปิดแท็บ
 *
 * ค่าที่มีอยู่ยังใช้เป็นสัญญาณว่า "ชุดนี้เริ่มทำแล้ว" → หน้าสอบจะไม่เด้งไปหน้า
 * /explain ซ้ำ (การ refresh จึงอยู่ที่ข้อเดิมเสมอ ไม่กระโดดออกจากหน้า)
 */

const KEY_PREFIX = 'cefr_set_progress_';

function key(sectionId: string, setId: number | string): string {
  return `${KEY_PREFIX}${sectionId}-${setId}`;
}

/** ข้อที่ค้างไว้ของชุดนี้ — null = ยังไม่เคยเริ่มชุดนี้ */
export function loadTestProgress(sectionId: string, setId: number | string): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key(sectionId, setId));
    if (raw === null) return null;
    const index = Number.parseInt(raw, 10);
    return Number.isInteger(index) && index >= 0 ? index : null;
  } catch {
    // sessionStorage อาจถูกปิด (private mode) — ทำงานต่อได้ แค่ไม่จำตำแหน่ง
    return null;
  }
}

/**
 * บันทึกตำแหน่งล่าสุด — คืน false เมื่อเก็บไม่ได้
 * (ผู้เรียกใช้ค่านี้ตัดสินใจว่าจะเด้งหน้า /explain ได้หรือไม่ เพราะถ้าเก็บไม่ได้
 * การเด้งจะกลายเป็นลูปไม่จบ)
 */
export function saveTestProgress(
  sectionId: string,
  setId: number | string,
  index: number,
): boolean {
  if (typeof window === 'undefined') return false;
  if (!Number.isInteger(index) || index < 0) return false;
  try {
    window.sessionStorage.setItem(key(sectionId, setId), String(index));
    return true;
  } catch {
    return false;
  }
}
