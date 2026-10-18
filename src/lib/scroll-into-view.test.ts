import { describe, expect, it, vi } from 'vitest';
import { isFullyVisible, scrollIntoViewIfClipped } from './scroll-into-view';

/** ทำ fake element ที่รายงานตำแหน่งตามที่กำหนด — ไม่ต้องมี DOM จริง */
function fakeElement(top: number, bottom: number) {
  const scrollIntoView = vi.fn();
  const el = {
    getBoundingClientRect: () => ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top }),
    scrollIntoView,
  };
  return { el: el as unknown as HTMLElement, scrollIntoView };
}

const VIEWPORT = 800;

describe('scrollIntoViewIfClipped', () => {
  it('does nothing when there is no element to scroll to', () => {
    expect(() => scrollIntoViewIfClipped(null, VIEWPORT)).not.toThrow();
    expect(() => scrollIntoViewIfClipped(undefined, VIEWPORT)).not.toThrow();
  });

  // กรณีปกติบนเดสก์ท็อป — เฉลยสั้นและอยู่ในจออยู่แล้ว ต้องไม่ขยับหน้า
  it('leaves the page still when the explanation already fits on screen', () => {
    const { el, scrollIntoView } = fakeElement(300, 480);
    scrollIntoViewIfClipped(el, VIEWPORT);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('scrolls when the explanation runs past the bottom of the screen', () => {
    const { el, scrollIntoView } = fakeElement(600, 1400);
    scrollIntoViewIfClipped(el, VIEWPORT);
    expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({ behavior: 'smooth', block: 'center' });
  });

  it('scrolls when the explanation starts above the top of the screen', () => {
    const { el, scrollIntoView } = fakeElement(-120, 260);
    scrollIntoViewIfClipped(el, VIEWPORT);
    expect(scrollIntoView).toHaveBeenCalledOnce();
  });

  // เฉลยยาวกว่าจอ — มองไม่เห็นครบแน่นอน ต้องเลื่อนเสมอ
  it('scrolls when the explanation is taller than the whole screen', () => {
    const { el, scrollIntoView } = fakeElement(-500, 2000);
    scrollIntoViewIfClipped(el, VIEWPORT);
    expect(scrollIntoView).toHaveBeenCalledOnce();
  });

  // เลขมิลลิเมตร: พอดีขอบล่างของจอ = เห็นครบ ไม่ต้องขยับ
  it('treats an explanation flush with the bottom edge as fully visible', () => {
    const { el, scrollIntoView } = fakeElement(500, VIEWPORT);
    scrollIntoViewIfClipped(el, VIEWPORT);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('honours a different block position when asked', () => {
    const { el, scrollIntoView } = fakeElement(900, 1200);
    scrollIntoViewIfClipped(el, VIEWPORT, 'start');
    expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({ behavior: 'smooth', block: 'start' });
  });

  // กล่องสูงกว่าจอ = จัดกึ่งกลางไม่ได้ เบราว์เซอร์จะ clamp ที่ขอบจอ
  // ซึ่งดูเหมือนกระโดดทันที ต้องดันขอบบนขึ้นไปชิดขอบบนจอแทน
  it('anchors to the top when the explanation is taller than the screen', () => {
    const { el, scrollIntoView } = fakeElement(-500, 2000);
    scrollIntoViewIfClipped(el, VIEWPORT);
    expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({ behavior: 'smooth', block: 'start' });
  });

  it('keeps centring a box that fits the screen even when it is clipped', () => {
    const { el, scrollIntoView } = fakeElement(700, 1000); // สูง 300 < 800
    scrollIntoViewIfClipped(el, VIEWPORT);
    expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({ behavior: 'smooth', block: 'center' });
  });
});

describe('isFullyVisible', () => {
  it('is false whenever any part sits outside the viewport', () => {
    expect(isFullyVisible(fakeElement(-1, 100).el, VIEWPORT)).toBe(false);
    expect(isFullyVisible(fakeElement(700, 801).el, VIEWPORT)).toBe(false);
  });

  it('is true only when both edges sit inside', () => {
    expect(isFullyVisible(fakeElement(0, VIEWPORT).el, VIEWPORT)).toBe(true);
    expect(isFullyVisible(fakeElement(100, 700).el, VIEWPORT)).toBe(true);
  });
});
