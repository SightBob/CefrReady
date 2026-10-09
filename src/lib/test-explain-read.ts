/**
 * จำสถานะ "ผู้เรียนเพิ่งอ่านเนื้อหาอธิบายระดับชุดแล้ว" (แชร์ระหว่างหน้า /explain
 * กับหน้าสอบ) — ใช้กันเนื้อหาเดียวกันโชว์ซ้ำ 2 รอบติดกัน
 *
 * - หน้า /explain (ผ่าน TestSetExplainView — client) เรียก markSetExplainRead()
 *   ทันทีที่ mount
 * - หน้าสอบ (client) เรียก wasSetExplainRead() → เทียบแล้ว clearSetExplainRead()
 *   เพื่อให้การเข้าชุดครั้งถัดไปยังเด้งเนื้อหาให้ตามปกติ
 *
 * เก็บเฉพาะ flag ไม่มีข้อมูลผู้ใช้ · sessionStorage หมดอายุเมื่อปิดแท็บเอง
 */

const KEY_PREFIX = 'cefr_set_explain_read_';

function key(sectionId: string, setId: number | string): string {
  return `${KEY_PREFIX}${sectionId}-${setId}`;
}

/** หน้า /explain เรียกตอน mount — บอกหน้าสอบว่าไม่ต้องเด้งเนื้อหาเดียวกันซ้ำ */
export function markSetExplainRead(sectionId: string, setId: number | string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key(sectionId, setId), '1');
  } catch {
    // sessionStorage อาจถูกปิด (private mode) — กรณีนี้แค่ไม่มีการข้าม ไม่ใช่บั๊ก
  }
}

/** หน้าสอบเรียก — true = ผู้เรียนเพิ่งอ่านเนื้อหาระดับชุด ให้ข้ามการเด้ง */
export function wasSetExplainRead(sectionId: string, setId: number | string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(key(sectionId, setId)) === '1';
  } catch {
    return false;
  }
}

/** หน้าสอบเรียกหลังเทียบแล้ว — รีเซ็ตให้การเข้าชุดครั้งถัดไปเด้งเนื้อหาตามปกติ */
export function clearSetExplainRead(sectionId: string, setId: number | string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(key(sectionId, setId));
  } catch {
    // เงียบ ๆ ตามด้านบน
  }
}
