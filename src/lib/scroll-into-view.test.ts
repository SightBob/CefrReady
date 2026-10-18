import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion, revealScrollOffset } from './scroll-into-view';

const VIEWPORT = 800;
const BAR = 216; // ความสูงแถบล่าง fixed บนมือถือ

/** กล่องที่อยู่ตำแหน่ง top และสูง height — พื้นที่ที่มองเห็นจริงคือ 0..(800-216)=584 */
const box = (top: number, height: number) => ({ top, height });

describe('revealScrollOffset', () => {
  it('asks for no movement when the explanation already fits on screen', () => {
    expect(revealScrollOffset(box(300, 180), VIEWPORT, BAR)).toBeNull();
  });

  it('asks for no movement when nothing is covered by the bar (no inset)', () => {
    expect(revealScrollOffset(box(300, 180), VIEWPORT, 0)).toBeNull();
  });

  it('treats an explanation sitting under the fixed bar as not visible', () => {
    // 500..620 — อยู่ใน viewport (800) แต่โดนแถบที่บังตั้งแต่ 584
    expect(revealScrollOffset(box(500, 120), VIEWPORT, BAR)).not.toBeNull();
  });

  it('treats an explanation flush with the bar as fully visible', () => {
    // 460..584 — ขอบล่างพอดีชนแถบ = ยังอยู่เหนือแถบทั้งหมด
    expect(revealScrollOffset(box(460, 124), VIEWPORT, BAR)).toBeNull();
  });

  it('centres a box that fits the visible area instead of the whole viewport', () => {
    // 700..900 — ล้นแถบล่าง สูง 200 พอดีในพื้นที่ 584
    // กึ่งกลางที่ควรเห็น = (584-200)/2 = 192 → ต้องเลื่อนลง 700-192 = 508
    expect(revealScrollOffset(box(700, 200), VIEWPORT, BAR)).toBeCloseTo(508);
  });

  it('anchors the top when the box is taller than the visible area', () => {
    // สูง 900 > 584 → ยึดขอบบนของกล่องชิดบนจอ → เลื่อนลงเท่าตำแหน่งปัจจุบัน
    expect(revealScrollOffset(box(300, 900), VIEWPORT, BAR)).toBeCloseTo(300);
  });

  it('never returns a clamp-inducing centre for a box bigger than the screen', () => {
    const offset = revealScrollOffset(box(0, 2000), VIEWPORT, 0);
    // block:'center' ตรงนี้จะถูกเบราว์เซอร์ clamp ที่ขอบจอ = กระโดด
    // ต้องเป็นการยึดขอบบน (0) ไม่ใช่ค่ากึ่งกลางที่ลบออกเอง
    expect(offset).toBe(0);
  });

  it('treats a box starting above the top edge as clipped', () => {
    expect(revealScrollOffset(box(-120, 300), VIEWPORT, BAR)).not.toBeNull();
  });
});

describe('prefersReducedMotion', () => {
  // ฟังก์ชันอ่าน window.matchMedia — stub ที่ window โดยตรง
  const stubMatchMedia = (matches: boolean) =>
    vi.stubGlobal('window', { matchMedia: vi.fn(() => ({ matches })) });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports the user setting so the scroll can fall back to instant', () => {
    stubMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
    stubMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('does not throw on browsers without matchMedia', () => {
    vi.stubGlobal('window', {});
    expect(prefersReducedMotion()).toBe(false);
  });
});
