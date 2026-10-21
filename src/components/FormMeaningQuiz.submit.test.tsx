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

// ตัด TestLayout / ConfirmModal / FormMeaningFillCard ออก — ให้เทสโฟกัสที่ logic
// ของ FormMeaningQuiz (นับคะแนนฝั่ง client + การยิง submit)
vi.mock('@/components/TestLayout', () => ({
  default: ({ onSubmit }: { onSubmit: () => void }) => (
    <button type="button" onClick={onSubmit}>ส่งข้อสอบ</button>
  ),
}));

vi.mock('@/components/ConfirmModal', () => ({
  default: ({ isOpen, onConfirm }: { isOpen: boolean; onConfirm: () => void }) =>
    isOpen ? (
      <button type="button" onClick={onConfirm}>ยืนยันส่ง</button>
    ) : null,
}));

vi.mock('@/components/FormMeaningFillCard', () => ({
  default: () => <div data-testid="fill-card" />,
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

async function submitOnce() {
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

  const clickButton = async (label: string) => {
    const button = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(label),
    );
    expect(button, `ไม่เจอปุ่ม "${label}"`).toBeTruthy();
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };

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
    // ยังไม่ได้ตอบ → ค่าว่าง (ไม่ใช่ undefined ที่จะทำให้ JSON.stringify พัง)
    expect(body.answers[0].selectedAnswer).toBe('');
  });
});
