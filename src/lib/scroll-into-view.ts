/**
 * เลื่อนเฉลย/คำอธิบายเข้ากลางจอ แต่เฉพาะเมื่อผู้เรียนมองไม่เห็นมันครบทั้งก้อน
 *
 * ตอนเลือกคำตอบ → กดตรวจ → เฉลยโผล่ เฉลยยาวพอที่จะล้นจอบนมือถือ แต่ถ้าเฉลย
 * สั้นและอยู่ในจออยู่แล้ว การเลื่อนจะสะดุดโดยไม่มีเหตุผล (ไม่มีอะไรขยับ
 * แต่หน้ากระโดด) จึงต้องวัดก่อนเลื่อนทุกครั้ง
 */

/**
 * หน้าสอบมีแถบล่างแบบ fixed สูงราว 216px บนมือถือ (TestLayout เว้นที่ให้ด้วย
 * pb-[13.5rem]) ซึ่งบังเนื้อหาท้ายจอไว้ ถ้าเทียบกับ window.innerHeight
 * ตรง ๆ เฉลยที่ตกในช่องนั้นจะถูกตัดสินว่า "เห็นครบ" แล้วไม่เลื่อน ทั้งที่ผู้เรียน
 * มองไม่เห็น ต้องหักแถบนี้ออกจากพื้นที่ที่มองเห็นได้จริง
 */
export const BOTTOM_BAR_SELECTOR = '[data-quiz-bottom-bar]';

/**
 * @param viewportHeight ความสูง viewport — ส่งเข้ามาเพื่อให้เทสต์ได้โดยไม่ต้องมี DOM
 */
export function isFullyVisible(el: HTMLElement, viewportHeight: number, bottomInset = 0): boolean {
  const rect = el.getBoundingClientRect();
  return rect.top >= 0 && rect.bottom <= viewportHeight - bottomInset;
}

/** วัดความสูงแถบล่างที่บังจอ — คืน 0 ถ้าไม่มี (หน้าที่ไม่ใช่หน้าสอบ) */
export function measureBottomBarInset(): number {
  const bar = document.querySelector<HTMLElement>(BOTTOM_BAR_SELECTOR);
  if (!bar) return 0;
  const { height } = bar.getBoundingClientRect();
  return height > 0 ? height : 0;
}

/**
 * เลื่อน el เข้ากลางจอแบบ smooth เฉพาะเมื่อยังมองไม่เห็นครบ
 *
 * กล่องที่สูงกว่าจอ จะไม่ใช้ center — การจัดให้กึ่งกลางตกอยู่กลางจอคือ
 * ตำแหน่งที่เลื่อนไปไม่ถึง เบราว์เซอร์จึงเลื่อนจนสุดขอบจอแล้ว clamp
 * ผลคือกระโดดไปปักทันที ไม่ใช่เลื่อนนิ่ม ๆ (ตรงกับอาการ "เด้งไปเลย")
 * กรณีนี้ต้องจัดขอบบนของกล่องให้ติดขอบบนจอแทน
 */
export function scrollIntoViewIfClipped(
  el: HTMLElement | null | undefined,
  viewportHeight: number,
  block: ScrollLogicalPosition = 'center',
  bottomInset = 0,
): void {
  if (!el) return;
  if (isFullyVisible(el, viewportHeight, bottomInset)) return;
  const tooTallToCenter = el.getBoundingClientRect().height > viewportHeight - bottomInset;
  el.scrollIntoView({
    behavior: 'smooth',
    block: tooTallToCenter ? 'start' : block,
  });
}
