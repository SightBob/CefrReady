/**
 * เลื่อนเฉลย/คำอธิบายเข้ากลางจอ แบบ smooth แต่เฉพาะเมื่อผู้เรียนมองไม่เห็นครบ
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
 *
 * ฝั่งบนไม่ต้องหักอะไร — หน้าสอบไม่ render header ของเว็บเลย (ChromeShell
 * ซ่อน header ไว้ เพราะหน้าสอบวาด chrome เอง) จึงไม่มีอะไรบังหัวคำอธิบาย
 */
export const BOTTOM_BAR_SELECTOR = '[data-quiz-bottom-bar]';

/** วัดความสูงแถบล่างที่บังจอ — คืน 0 ถ้าไม่มี (หน้าที่ไม่ใช่หน้าสอบ) */
export function measureBottomBarInset(): number {
  const bar = document.querySelector<HTMLElement>(BOTTOM_BAR_SELECTOR);
  if (!bar) return 0;
  const { height } = bar.getBoundingClientRect();
  return height > 0 ? height : 0;
}

/** ผู้ใช้สั่งลดการเคลื่อนไหวไว้ — ต้องเคารพ ไม่งั้นการเลื่อนจะกลายเป็นกระโดด */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * คำนวณระยะเลื่อน (offset จากตำแหน่ง scroll ปัจจุบัน) หรือ null เมื่อไม่ต้องเลื่อน
 *
 * ไม่ใช้ element.scrollIntoView() เพราะมันจัดกึ่งกลางกลาง *viewport* ไม่ใช่กลาง
 * พื้นที่ที่มองเห็นจริง (ต้องหักแถบล่าง) และถ้ากล่องสูงกว่าพื้นที่ที่มองเห็น
 * การ center จะถูก clamp ที่ขอบจอ ซึ่งเป็นการกระโดดไปปักทันที ไม่ใช่เลื่อนนิ่ม ๆ
 *
 * @param rect ตำแหน่งของกล่องคำอธิบาย (ส่งเข้ามาเพื่อให้เทสต์ได้โดยไม่ต้องมี DOM)
 */
export function revealScrollOffset(
  rect: { top: number; height: number },
  viewportHeight: number,
  bottomInset = 0,
): number | null {
  const visibleBottom = viewportHeight - bottomInset;
  const rectBottom = rect.top + rect.height;

  // มองเห็นครบทั้งก้อนแล้ว — เลื่อนไปก็ไม่มีอะไรขยับ อย่าทำให้หน้าสะดุด
  if (rect.top >= 0 && rectBottom <= visibleBottom) return null;

  const available = visibleBottom;
  if (rect.height <= available) {
    // สูงพอที่จะเห็นครบ → จัดกึ่งกลางในพื้นที่ที่มองเห็นจริง
    return rect.top + rect.height / 2 - available / 2;
  }
  // สูงเกินพื้นที่ที่มองเห็น → ยึดขอบบนขึ้นไปชิดบนจอ เพื่อให้เห็นตั้งแต่ต้น
  return rect.top;
}

/**
 * เลื่อนกล่องคำอธิบายเข้าพื้นที่ที่มองเห็น — เฉพาะเมื่อยังมองไม่เห็นครบ
 */
export function scrollIntoViewIfClipped(
  el: HTMLElement | null | undefined,
  viewportHeight: number,
  bottomInset = 0,
): void {
  if (!el) return;
  const offset = revealScrollOffset(el.getBoundingClientRect(), viewportHeight, bottomInset);
  if (offset === null) return;
  window.scrollTo({
    top: Math.max(0, window.scrollY + offset),
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  });
}
