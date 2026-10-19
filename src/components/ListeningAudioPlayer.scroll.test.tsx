// @vitest-environment jsdom
import { StrictMode, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
  hideFeedback?: boolean;
  correctAnswer?: string | null;
}

function Harness({
  selectedAnswer,
  explanation,
  scrollToExplanationOnReveal,
  hideFeedback,
  correctAnswer = 'A',
}: HarnessProps) {
  return (
    <ListeningAudioPlayer
      transcript="M: สวัสดีครับ"
      questionText="คำถามฟัง"
      options={OPTIONS}
      selectedAnswer={selectedAnswer}
      correctAnswer={correctAnswer}
      explanation={explanation}
      onAnswerSelect={() => undefined}
      audioUrl={undefined}
      {...(scrollToExplanationOnReveal !== undefined ? { scrollToExplanationOnReveal } : {})}
      {...(hideFeedback !== undefined ? { hideFeedback } : {})}
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

/**
 * รอให้ requestAnimationFrame ซ้อนสองชั้นของ hook ทำงานครบ
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

describe('ListeningAudioPlayer reveal flow', () => {
  // Flow ที่ผู้ใช้กำหนด (2026-10-19): เลือกคำตอบ = ยังไม่เฉลย · กดตรวจคำตอบ
  // = เฉลยพร้อม transcript
  //
  // การ์ดนี้เปิด transcript ทันทีที่ selectedAnswer ไม่เป็น null เพราะ
  // transcript คือที่มาของคำตอบ ผู้เรียนจึงต้องคุมมันด้วย hideFeedback จนกว่า
  // จะกดตรวจคำตอบ — เทสต์ชุดนี้จำลองหน้าสอบส่ง hideFeedback ตามผลตรวจ
  // (หน้าสอบส่ง correctAnswer={revealedCorrectKey} ซึ่ง null จนกว่าจะตรวจ)

  it('keeps the transcript hidden while the learner has only selected an answer', async () => {
    // ยังไม่ตรวจ → หน้าส่ง hideFeedback=true
    await act(async () => {
      root.render(
        <Harness selectedAnswer="A" explanation={null} correctAnswer={null} hideFeedback />,
      );
    });

    // transcript คือที่มาของคำตอบ ต้องไม่โผล่ก่อนกดตรวจคำตอบ
    expect(container.textContent).not.toContain('Audio Transcript');
  });

  it('does not colour the options as wrong before the answer is checked', async () => {
    await act(async () => {
      root.render(
        <Harness selectedAnswer="A" explanation={null} correctAnswer={null} hideFeedback />,
      );
    });

    // ก่อนตรวจ = ยังไม่รู้ผล ตัวเลือกต้องเป็นสีเทาปกติ ไม่ใช่แดง "ผิด"
    expect(container.innerHTML).not.toContain('bg-[#fef2f2]');
    expect(container.innerHTML).toContain('bg-white ring-[#e2e8f0]');
  });

  it('still lets the learner change their choice before checking', async () => {
    const picked: string[] = [];
    await act(async () => {
      root.render(
        <StrictMode>
          <ListeningAudioPlayer
            transcript="M: สวัสดีครับ"
            questionText="คำถามฟัง"
            options={OPTIONS}
            selectedAnswer="A"
            correctAnswer={null}
            explanation={null}
            hideFeedback
            onAnswerSelect={(key) => picked.push(key)}
          />
        </StrictMode>,
      );
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const optionB = buttons.find((b) => b.textContent?.includes('ตัวเลือก ข'));

    await act(async () => {
      optionB?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // เลือกแล้วยังต้องกดตัวเลือกอื่นได้ ไม่ถูกล็อกทันที
    expect(picked).toEqual(['B']);
  });

  it('marks the chosen option as pending, the same as the other skills, before checking', async () => {
    // สถานะ "เลือกแล้วยังไม่ตรวจ" ต้องเหมือน part อื่น: การ์ดเทา #EEEEEE
    // + badge เทาเข้ม #848484 (ผู้ใช้กำหนด 2026-10-14 ให้ตรงกับ Tap & Select)
    await act(async () => {
      root.render(
        <Harness selectedAnswer="A" explanation={null} correctAnswer={null} hideFeedback />,
      );
    });

    expect(container.innerHTML).toContain('bg-[#EEEEEE]');
    expect(container.innerHTML).toContain('bg-[#848484]');
  });

  it('reveals the transcript and the verdict only after the check', async () => {
    // ตรวจแล้ว → หน้าส่ง hideFeedback=false พร้อมผลตรวจจากเซิร์ฟเวอร์
    await act(async () => {
      root.render(
        <Harness
          selectedAnswer="A"
          explanation="เฉลยของข้อนี้"
          correctAnswer="A"
          hideFeedback={false}
        />,
      );
    });

    expect(container.textContent).toContain('Audio Transcript');
    expect(container.textContent).toContain('เฉลยของข้อนี้');
    expect(container.innerHTML).toContain('bg-[#ecfdf5]');
  });
});

describe('exam pages must gate the listening reveal on the check', () => {
  // เทสต์ด้านบนพิสูจน์ว่า "การ์ดทำงานถูกเมื่อหน้าส่ง hideFeedback"
  // ชุดนี้พิสูจน์ว่าหน้าจริงส่งจริง ไม่ใช่แค่การ์ดที่ทำได้
  const PAGES = [
    'src/app/tests/[sectionId]/[setId]/page.tsx',
    'src/app/demo/exam/page.tsx',
  ] as const;

  it.each(PAGES)('%s gates the reveal on the check', (file) => {
    const source = readFileSync(resolve(file), 'utf8');
    // ต้องเป็น "ยังไม่ตรวจ → ซ่อน" และหน้าที่มีโหมดพรีวิวต้องยกเว้นไว้
    expect(source).toMatch(
      /hideFeedback=\{![\w]+(?:\([^)]*\))?(?:\s*&&\s*!previewMode)?\}/,
    );
  });
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
