/**
 * เลื่อนเฉลย/คำอธิบายเข้ากลางจอ แต่เฉพาะเมื่อผู้เรียนมองไม่เห็นมันครบทั้งก้อน
 *
 * ตอนเลือกคำตอบ → กดตรวจ → เฉลยโผล่ เฉลยยาวพอที่จะล้นจอบนมือถือ แต่ถ้าเฉลย
 * สั้นและอยู่ในจออยู่แล้ว การเลื่อนจะสะดุดโดยไม่มีเหตุผล (ไม่มีอะไรขยับ
 * แต่หน้ากระโดด) จึงต้องวัดก่อนเลื่อนทุกครั้ง
 */

/** คืน true เมื่อทั้งบนและล่างของ el อยู่ใน viewport (ไม่มีส่วนไหนล้นจอ) */
export function isFullyVisible(el: HTMLElement, viewportHeight: number): boolean {
  const rect = el.getBoundingClientRect();
  return rect.top >= 0 && rect.bottom <= viewportHeight;
}

/**
 * เลื่อน el เข้ากลางจอแบบ smooth เฉพาะเมื่อยังมองไม่เห็นครบ
 * @param viewportHeight ความสูง viewport — ส่งเข้ามาเพื่อให้เทสต์ได้โดยไม่ต้องมี DOM
 */
export function scrollIntoViewIfClipped(
  el: HTMLElement | null | undefined,
  viewportHeight: number,
  block: ScrollLogicalPosition = 'center',
): void {
  if (!el) return;
  if (isFullyVisible(el, viewportHeight)) return;
  el.scrollIntoView({ behavior: 'smooth', block });
}
