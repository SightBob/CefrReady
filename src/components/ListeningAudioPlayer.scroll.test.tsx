// @vitest-environment jsdom
import { StrictMode, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ListeningAudioPlayer from './ListeningAudioPlayer';

/**
 * ListeningAudioPlayer ผูก hook กับ showExplanation ซึ่งประกาศหลังจุดที่เคย
 * เรียก hook ไปหนึ่งครั้ง (commit ก่อนหน้า) — ผลคือ ReferenceError ตอน
 * หน้าสอบ listening ที่เปิด flag เป็น true เทสต์ชุดนี้จับการกลับมาของบั๊ก
 * เดียวกัน: flag เปิดต้องเรนเดอร์ผ่าน ไม่มีการ throw ในที่ไหนเลย
 *
 * ใช้ jsdom เพราะต้องรัน useEffect ตามที่ React ทำจริง ซึ่ง node environment
 * ทำไม่ได้ (docblock ด้านบน)
 */

const OPTIONS = [
  { key: 'A', value: 'ตัวเลือก ก' },
  { key: 'B', value: 'ตัวเลือก ข' },
];

interface HarnessProps {
  selectedAnswer: string | null;
  explanation: string | null;
  scrollToExplanationOnReveal?: boolean;
}

function Harness({ selectedAnswer, explanation, scrollToExplanationOnReveal }: HarnessProps) {
  return (
    <ListeningAudioPlayer
      transcript="M: สวัสดี"
      questionText="คำถามฟัง"
      options={OPTIONS}
      selectedAnswer={selectedAnswer}
      correctAnswer="A"
      explanation={explanation}
      onAnswerSelect={() => undefined}
      audioUrl={undefined}
      {...(scrollToExplanationOnReveal !== undefined ? { scrollToExplanationOnReveal } : {})}
    />
  );
}

let container: HTMLDivElement;
let root: Root;
let scrollTo: ReturnType<typeof vi.fn>;

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
// React 19 ปฏิเสธ act() นอก test environment ที่ประกาศไว้
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

async function flushFrames() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 80));
  });
}

beforeEach(() => {
  // jsdom ไม่มี layout ทุก getBoundingClientRect คืน 0 → เฉลยจะถูกมองว่า
  // "อยู่ในจอแล้ว" แล้วไม่เลื่อน ให้ปลอมว่ามันอยู่ใต้ขอบจอเสมอ
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top: 2000,
    bottom: 2400,
    left: 0,
    right: 320,
    width: 320,
    height: 400,
    x: 0,
    y: 2000,
    toJSON: () => ({}),
  } as DOMRect);

  scrollTo = vi.fn();
  vi.stubGlobal('scrollTo', scrollTo);

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ListeningAudioPlayer reveal scroll', () => {
  it('renders without throwing when the flag is on', async () => {
    // ถ้ามีการอ้างตัวแปรก่อนประกาศ (TDZ) จะพังตรงนี้
    await act(async () => {
      root.render(
        <Harness
          selectedAnswer="A"
          explanation="เฉลยของข้อนี้"
          scrollToExplanationOnReveal
        />,
      );
    });
    await flushFrames();

    expect(container.textContent).toContain('เฉลยของข้อนี้');
  });

  it('does not scroll when the flag is off', async () => {
    await act(async () => {
      root.render(<Harness selectedAnswer={null} explanation={null} scrollToExplanationOnReveal={false} />);
    });
    await act(async () => {
      root.render(<Harness selectedAnswer="A" explanation="เฉลยของข้อนี้" scrollToExplanationOnReveal={false} />);
    });
    await flushFrames();

    // เฉลยต้องแสดงจริง แต่หน้าไม่ขยับ
    expect(container.textContent).toContain('เฉลยของข้อนี้');
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls once when the explanation appears with the flag on', async () => {
    await act(async () => {
      root.render(<Harness selectedAnswer={null} explanation={null} scrollToExplanationOnReveal />);
    });
    expect(scrollTo).not.toHaveBeenCalled();

    await act(async () => {
      root.render(<Harness selectedAnswer="A" explanation="เฉลยของข้อนี้" scrollToExplanationOnReveal />);
    });
    await flushFrames();

    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('scrolls once under StrictMode when the explanation appears', async () => {
    await act(async () => {
      root.render(
        <StrictMode>
          <Harness selectedAnswer={null} explanation={null} scrollToExplanationOnReveal />
        </StrictMode>,
      );
    });
    expect(scrollTo).not.toHaveBeenCalled();

    await act(async () => {
      root.render(
        <StrictMode>
          <Harness selectedAnswer="A" explanation="เฉลยของข้อนี้" scrollToExplanationOnReveal />
        </StrictMode>,
      );
    });
    await flushFrames();

    expect(scrollTo).toHaveBeenCalledTimes(1);
  });
});
