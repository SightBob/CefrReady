// @vitest-environment jsdom
/**
 * กดปุ่ม "หากยังไม่เข้าใจ ลองถาม AI เพิ่มเติมได้เลย" → กรอบ AI Tutor เปิดพร้อม
 * ต้องเลื่อนหน้าไปที่ช่องพิมพ์ (และโฟกัส) ให้พิมพ์ได้ทันที
 *
 * คำอธิบายของข้อ (บทสนทนาแรก) อยู่เหนือช่องพิมพ์และสูงพอให้ช่องพิมพ์ตกจอ
 * (ผู้ใช้กำหนด 2026-10-25) — เลื่อนเฉพาะเมื่อช่องพิมพ์ถูกบัง ตามสัญญาของ
 * scrollIntoViewIfClipped ซึ่งเทสต์นี้จำลองด้วย getBoundingClientRect ที่อยู่ใต้ขอบจอ
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StrictMode, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import AiTutorPanel from './AiTutorPanel';

let container: HTMLDivElement;
let root: Root;
let scrollTo: ReturnType<typeof vi.fn>;
const originalRect = HTMLElement.prototype.getBoundingClientRect;

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  // ช่องพิมพ์อยู่ใต้ขอบจอ: top 900 ใน viewport สูง 800 → ต้องถูกเลื่อนขึ้นมา
  HTMLElement.prototype.getBoundingClientRect = function getRect() {
    if (this.tagName === 'TEXTAREA') {
      return {
        top: 900, bottom: 965, height: 65, left: 0, right: 320, width: 320, x: 0, y: 900,
        toJSON() {},
      } as DOMRect;
    }
    return originalRect.call(this);
  };

  scrollTo = vi.fn();
  vi.spyOn(window, 'scrollTo').mockImplementation(scrollTo as unknown as typeof window.scrollTo);
  vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
    messages: [],
    quota: { used: 0, limit: 5, remaining: 5 },
  })));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  HTMLElement.prototype.getBoundingClientRect = originalRect;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** ปล่อยให้ rAF สองชั้น (หลัง commit → หลัง paint) ทำงาน */
async function settleFrames() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 80));
  });
}

function textarea() {
  const field = container.querySelector<HTMLTextAreaElement>('textarea');
  if (!field) throw new Error('ไม่พบช่องพิมพ์');
  return field;
}

describe('AiTutorPanel — เลื่อนไปช่องพิมพ์เมื่อเปิดจากปุ่มในกล่องเฉลย', () => {
  // ต้องห่อ StrictMode เพราะ next.config เปิด reactStrictMode — ใน dev React
  // เรียก effect สองรอบ (attach → cleanup → attach) ซึ่งเคยทำให้การเลื่อนหายไป
  // ทั้งหมด (ผู้ใช้รายงาน 2026-10-25: กดแล้วไม่เลื่อน) เทสต์นี้จึงต้องจับเคสนั้น
  it('เลื่อนหน้าไปช่องพิมพ์และโฟกัสให้พิมพ์ได้ทันที (StrictMode)', async () => {
    await act(async () => {
      root.render(
        <StrictMode>
          <AiTutorPanel questionId={7} answerProof="proof-token" introMessage="คำอธิบายข้อนี้" scrollToComposerOnMount />
        </StrictMode>,
      );
    });
    await settleFrames();

    expect(scrollTo).toHaveBeenCalledTimes(1);
    const options = scrollTo.mock.calls[0][0] as ScrollToOptions;
    expect(options.top).toBeGreaterThan(0);
    expect(document.activeElement).toBe(textarea());
  });

  it('ไม่ส่ง prop (โหมด mock /dev/tutor-mock) → ไม่เลื่อนและไม่แย่งโฟกัส', async () => {
    await act(async () => {
      root.render(<AiTutorPanel />);
    });
    await settleFrames();

    expect(scrollTo).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(textarea());
  });
});
