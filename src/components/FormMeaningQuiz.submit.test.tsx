// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * บั๊ก: ส่งข้อสอบ Form & Meaning ไม่ได้ (ขึ้น "เกิดข้อผิดพลาด กรุณาลองใหม่")
 *
 * สาเหตุ: /api/test-sets/[id] ถอดเฉลยออกจาก payload ของผู้เรียนแล้ว
 * (stripAnswers → blanks[].correctAnswer ถูกลบ) แต่ FormMeaningQuiz ยังไปอ่าน
 * `blank.correctAnswer.toLowerCase()` เพื่อนับคะแนนฝั่ง client → ได้ undefined
 * → TypeError: Cannot read properties of undefined (reading 'toLowerCase')
 * → โยน error ก่อนยิง API → ผู้เรียนเห็น toast "เกิดข้อผิดพลาด กรุณาลองใหม่"
 * และไม่มี attempt ถูกบันทึก
 *
 * เทสต์นี้ล็อกพฤติกรรมที่ถูก: payload ที่ไม่มีเฉลย (ตามที่เซิร์ฟเวอร์ส่งจริง)
 * → ต้องยิง /api/tests/submit ได้ และไม่มี toast error
 *
 * เพิ่มเติม (2026-11-02): ปุ่ม "ตรวจคำตอบ" ของ Form & Meaning คือการ "ส่งข้อสอบ"
 * ทั้งชุด — เดิมกดได้ทั้งที่ยังไม่ได้กรอกสักช่อง ทำให้เกิด attempt 0 คะแนนเปล่า ๆ
 * (พบ attempt จริง 12463 ตอน QA) → ปุ่มต้องถูกปิดจนกว่าจะกรอกอย่างน้อย 1 ช่อง
 * และ handleSubmit ต้องกันไว้อีกชั้น
 */

const toastError = vi.fn();
const apiFetchMock = vi.fn();

vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => toastError(...args) },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/tests/form-meaning/29',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/api-fetch', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

// ตัด TestLayout / ConfirmModal ออก — ให้เทสโฟกัสที่ logic ของ FormMeaningQuiz
// (ปุ่มหลัก disabled/ใบ้ + การยิง submit) แต่ยังคง semantics ของปุ่มจริง
vi.mock('@/components/TestLayout', () => ({
  default: ({
    onSubmit,
    primaryAction,
  }: {
    onSubmit: () => void;
    primaryAction?: { label: string; onClick: () => void; disabled?: boolean; hint?: string };
  }) => (
    <>
      <button
        type="button"
        disabled={primaryAction?.disabled}
        onClick={primaryAction?.onClick ?? onSubmit}
      >
        {primaryAction?.label ?? 'ส่งข้อสอบ'}
      </button>
      {/* ทางลัดสำหรับยิง action เดิมโดยไม่สน disabled — ใช้ทดสอบ guard ใน handleSubmit */}
      <button type="button" onClick={primaryAction?.onClick ?? onSubmit}>
        ส่งข้อสอบ
      </button>
      {primaryAction?.hint && <p>{primaryAction.hint}</p>}
    </>
  ),
}));

vi.mock('@/components/ConfirmModal', () => ({
  default: ({ isOpen, onConfirm }: { isOpen: boolean; onConfirm: () => void }) =>
    isOpen ? (
      <button type="button" onClick={onConfirm}>ยืนยันส่ง</button>
    ) : null,
}));

import FormMeaningQuiz from './FormMeaningQuiz';
import type { Blank } from '@/types/test';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  toastError.mockClear();
  apiFetchMock.mockReset();
  apiFetchMock.mockResolvedValue({
    json: async () => ({ success: true, data: { correctAnswers: 0, totalQuestions: 2 } }),
  });

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

/** payload ของ /api/test-sets/[id] ตามที่เซิร์ฟเวอร์ส่งจริง (เฉลยถูกถอดออก) */
const sanitizedQuestions = [
  {
    id: 1984,
    questionText: 'อ่านบทความแล้วเติมคำให้ถูกต้อง',
    article: {
      title: 'A Short Note',
      text: 'The meeting {{1}} at nine and it {{2}} on time.',
      // เฉลยถูกถอดออกตาม stripAnswers → blanks ไม่มี correctAnswer
      blanks: [{ id: 1 }, { id: 2 }] as unknown as Blank[],
    },
  },
];

async function renderQuiz() {
  await act(async () => {
    root.render(
      <FormMeaningQuiz
        questions={sanitizedQuestions}
        sectionId="form-meaning"
        setId={29}
        setName="Form & Meaning - Set 2"
        onFinish={() => {}}
      />,
    );
  });
}

async function clickButton(label: string) {
  const button = Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(label),
  );
  expect(button, `ไม่เจอปุ่ม "${label}"`).toBeTruthy();
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

/**
 * เตรียมคำตอบที่กรอกไว้ล่วงหน้า — quiz อ่าน sessionStorage ตอน mount
 * (คีย์เดียวกับ lib/test-progress: cefr_set_blanks_<section>-<set>)
 */
function seedBlankAnswer(value = 'was') {
  window.sessionStorage.setItem(
    'cefr_set_blanks_form-meaning-29',
    JSON.stringify({ 1: value }),
  );
}

async function submitOnce() {
  seedBlankAnswer();
  await renderQuiz();
  await clickButton('ส่งข้อสอบ');
  // ยังไม่ได้ตอบครบ → ขึ้น modal ยืนยัน → กดยืนยันเพื่อให้ executeSubmit ทำงาน
  await clickButton('ยืนยันส่ง');
}

describe('FormMeaningQuiz — ส่งข้อสอบได้แม้ payload ไม่มีเฉลย', () => {
  it('ไม่ throw และยิง /api/tests/submit ได้ (payload จากเซิร์ฟเวอร์ไม่มี blanks[].correctAnswer)', async () => {
    await submitOnce();

    expect(toastError, 'ต้องไม่มี toast error').not.toHaveBeenCalled();
    expect(apiFetchMock, 'ต้องยิง apiFetch ได้').toHaveBeenCalledTimes(1);
    expect(String(apiFetchMock.mock.calls[0]?.[0])).toContain('/api/tests/submit');
  });

  it('ส่งคำตอบเป็น JSON ที่ map ตาม blank id ของแต่ละข้อ', async () => {
    await submitOnce();

    const body = JSON.parse(String((apiFetchMock.mock.calls[0]?.[1] as { body: string }).body));
    expect(body.testTypeId).toBe('form-meaning');
    expect(body.testSetId).toBe(29);
    expect(body.answers).toHaveLength(1);
    expect(body.answers[0].questionId).toBe(1984);
    // กรอกช่อง 1 แล้ว → ส่งเฉพาะช่องที่กรอก (ช่อง 2 ยังว่าง)
    expect(body.answers[0].selectedAnswer).toBe('{"1":"was"}');
  });
});

describe('FormMeaningQuiz — กันการส่งข้อสอบว่าง', () => {
  it('ยังไม่กรอกสักช่อง → ปุ่มตรวจคำตอบถูกปิด พร้อมใบ้ให้กรอกก่อน', async () => {
    await renderQuiz();

    const primary = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('ตรวจคำตอบ'),
    );
    expect(primary, 'ต้องมีปุ่มตรวจคำตอบ').toBeTruthy();
    expect(primary!.disabled).toBe(true);
    expect(container.textContent).toContain('กรอกคำตอบอย่างน้อย 1 ช่อง');
  });

  it('เรียก submit ตอนยังว่าง → บล็อกที่ handleSubmit ไม่ยิง API และบอกเหตุผล', async () => {
    await renderQuiz();

    await clickButton('ส่งข้อสอบ');

    expect(apiFetchMock).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(String(toastError.mock.calls[0]?.[0])).toContain('อย่างน้อย 1 ช่อง');
  });

  it('กรอกแล้ว → ปุ่มกลับมากดได้', async () => {
    seedBlankAnswer();
    await renderQuiz();

    const primary = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('ตรวจคำตอบ'),
    );
    expect(primary!.disabled).toBe(false);
  });
});
