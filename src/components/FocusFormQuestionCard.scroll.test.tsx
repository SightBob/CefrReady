// @vitest-environment jsdom
import { StrictMode, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FocusFormQuestionCard from './FocusFormQuestionCard';

/**
 * การเลื่อนไปคำอธิบายหลังกด "ตรวจคำตอบ" ต้องเกิด "ครั้งเดียว" ต่อการเฉลยปรากฏ
 *
 * เทสต์นี้ต้องใช้ DOM จริง เพราะต้องรัน useEffect/ref callback ตามที่ React
 * ทำงานจริง (รวมถึง StrictMode ที่เรียก lifecycle ซ้ำ) ซึ่ง node environment
 * ทำไม่ได้ — ไฟล์นี้จึงประกาศ @vitest-environment jsdom
 */

const OPTIONS = [
  { key: 'A', value: 'ตัวเลือก ก' },
  { key: 'B', value: 'ตัวเลือก ข' },
];

interface HarnessProps {
  explanation: string | null;
  selectedAnswer?: string | null;
  correctAnswer?: string | null;
}

function Harness({ explanation, selectedAnswer = 'A', correctAnswer = 'A' }: HarnessProps) {
  return (
    <FocusFormQuestionCard
      scrollToExplanationOnReveal
      questionText="ข้อความโจทย์"
      options={OPTIONS}
      selectedAnswer={selectedAnswer}
      correctAnswer={correctAnswer}
      explanation={explanation}
      onAnswerSelect={() => undefined}
      disabled
    />
  );
}

let container: HTMLDivElement;
let root: Root;
let scrollTo: ReturnType<typeof vi.fn>;

// React 19 ปฏิเสธ act() นอก test environment ที่ประกาศไว้ ไม่ตั้งค่านี้
// เทสต์จะรันแต่ผลไม่น่าเชื่อถือ
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/**
 * ปล่อยให้ requestAnimationFrame ซ้อนสองชั้นทำงานจนครบ
 *
 * เดิมใช้ setTimeout(80) ซึ่งเป็นการเดาเวลา — ตอนรันเทสต์ขนานหลายไฟล์เฟรมอาจ
 * ช้ากว่า 80ms แล้วสถานะยังไม่ถึง เทสต์จึงวูบ (flaky) การรอเฟรมจริงแทน
 * ผลลัพธ์เดียวกันเสมอไม่ว่าเครื่องจะหนักแค่ไหน — ชั้นที่ 3 กันเผื่อมีงาน
 * ที่ต่อท้าย (microtask/timeout) ค้างอยู่อีกชั้น
 */
const nextFrame = () =>
  new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

async function flushFrames() {
  await nextFrame();
  await nextFrame();
  await act(async () => {
    await nextFrame();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  // jsdom ไม่มี layout ทุก getBoundingClientRect คืน 0 → เฉลยจะถูกมองว่า
  // "อยู่ในจอแล้ว" และไม่เลื่อน ให้ปลอมว่ามันอยู่ใต้ขอบจอเสมอ
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

describe('reveal scroll fires exactly once per explanation', () => {
  it('scrolls once when the explanation appears under StrictMode', async () => {
    await act(async () => {
      root.render(
        <StrictMode>
          <Harness explanation={null} />
        </StrictMode>,
      );
    });
    expect(scrollTo).not.toHaveBeenCalled();

    await act(async () => {
      root.render(
        <StrictMode>
          <Harness explanation="เฉลยของข้อนี้" />
        </StrictMode>,
      );
    });
    await flushFrames();

    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('scrolls once when the explanation appears without StrictMode', async () => {
    await act(async () => {
      root.render(<Harness explanation={null} />);
    });
    await act(async () => {
      root.render(<Harness explanation="เฉลยของข้อนี้" />);
    });
    await flushFrames();

    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  // หน้า review เรนเดอร์พร้อมเฉลยมาเลย ต้องไม่กระโดดตอนเปิดหน้า
  it('does not scroll when the explanation is already there on first mount', async () => {
    await act(async () => {
      root.render(
        <StrictMode>
          <Harness explanation="เฉลยที่มาพร้อมหน้า" />
        </StrictMode>,
      );
    });
    await flushFrames();

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('does not scroll again on a plain re-render with the same explanation', async () => {
    await act(async () => {
      root.render(<Harness explanation={null} />);
    });
    await act(async () => {
      root.render(<Harness explanation="เฉลยของข้อนี้" />);
    });
    await flushFrames();
    expect(scrollTo).toHaveBeenCalledTimes(1);

    // re-render อีกครั้ง เฉลยยังเป็นตัวเดิม → ต้องไม่เลื่อนซ้ำ
    await act(async () => {
      root.render(<Harness explanation="เฉลยของข้อนี้" />);
    });
    await flushFrames();

    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  // handleAnswer ล้างผลตรวจเดิม → showExplanation กลับเป็น false
  // แล้วกดตรวจใหม่ → ขึ้น true อีกครั้ง ต้องเลื่อนใหม่
  it('scrolls again when the learner changes the answer and re-checks', async () => {
    await act(async () => {
      root.render(<Harness explanation={null} />);
    });
    await act(async () => {
      root.render(<Harness explanation="เฉลยเดิม" />);
    });
    await flushFrames();
    expect(scrollTo).toHaveBeenCalledTimes(1);

    // เปลี่ยนคำตอบ = ผลตรวจเดิมถูกล้าง เฉลยหาย
    await act(async () => {
      root.render(<Harness explanation={null} />);
    });
    await flushFrames();
    expect(scrollTo).toHaveBeenCalledTimes(1);

    // กดตรวจอีกครั้ง
    await act(async () => {
      root.render(<Harness explanation="เฉลยใหม่หลังเปลี่ยนคำตอบ" />);
    });
    await flushFrames();

    expect(scrollTo).toHaveBeenCalledTimes(2);
  });

  // ออกจากหน้าทันทีหลังเฉลยโผล่ ก่อนที่ rAF จะครบสองชั้น
  it('cancels the pending scroll when unmounted mid-flight without throwing', async () => {
    await act(async () => {
      root.render(<Harness explanation={null} />);
    });
    await act(async () => {
      root.render(<Harness explanation="เฉลยของข้อนี้" />);
    });

    // ยังไม่ flush เฟรม ปิดหน้าไปเลย
    await act(async () => {
      root.unmount();
    });
    await flushFrames();

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
