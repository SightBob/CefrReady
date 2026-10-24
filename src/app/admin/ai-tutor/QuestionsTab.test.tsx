// @vitest-environment jsdom
/**
 * แท็บ "คำถามผู้เรียน" ในหน้า /admin/ai-tutor
 * - โหลดรายการจาก API ของผู้ดูแล
 * - ส่งตัวกรอง (ช่วงเวลา/ประเภท/สถานะ/ข้อสอบ/คำค้น) ไปกับ URL
 * - แสดงสรุปยอด + รายการ + แบ่งหน้า
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import QuestionsTab from './QuestionsTab';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ROW = {
  id: 1103,
  createdAt: '2026-10-21T07:57:42.023Z',
  role: 'user',
  status: 'ok',
  content: 'จะใช้ some ตอนไหน',
  archived: false,
  questionId: 2098,
  questionText: 'Woman: Sorry I missed the meeting.',
  cefrLevel: 'A2',
  grammarTopic: 'Past Simple',
  userId: 'u1',
  userEmail: 'learner@example.com',
  userName: 'ผู้เรียน',
  model: null,
  latencyMs: null,
  inputTokens: null,
  outputTokens: null,
  selectedAnswer: 'A',
  isCorrect: true,
  attemptKey: 'attempt-aaaa-0001',
};

const BODY = {
  success: true,
  data: {
    rows: [ROW],
    summary: {
      questions: 18,
      answers: 16,
      failed: 2,
      learners: 3,
      topQuestions: [{ questionId: 2098, count: 16, questionText: 'Woman: Sorry I missed the meeting.' }],
    },
  },
  meta: { total: 18, page: 1, totalPages: 2, pageSize: 25 },
};

let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  fetchMock = vi.fn(async () => jsonResponse(BODY));
  vi.stubGlobal('fetch', fetchMock);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function renderTab() {
  await act(async () => {
    root.render(<QuestionsTab />);
  });
}

/** URL ของ request ล่าสุด */
function lastUrl(): string {
  return String(fetchMock.mock.calls[fetchMock.mock.calls.length - 1]?.[0] ?? '');
}

describe('QuestionsTab — คำถามของผู้เรียน', () => {
  it('เรนเดอร์ได้ และโหลดรายการจาก API ของผู้ดูแล', async () => {
    await renderTab();

    expect(fetchMock).toHaveBeenCalled();
    expect(lastUrl()).toContain('/api/admin/ai-tutor/messages');
    expect(container.textContent).toContain('จะใช้ some ตอนไหน');
    expect(container.textContent).toContain('learner@example.com');
  });

  it('ค่าเริ่มต้ม = 30 วัน + คำถามผู้เรียน', async () => {
    await renderTab();
    const url = new URL(lastUrl(), 'http://localhost');
    expect(url.searchParams.get('days')).toBe('30');
    expect(url.searchParams.get('role')).toBe('user');
    expect(url.searchParams.get('page')).toBe('1');
  });

  it('แสดงสรุปยอด (คำถาม/ผู้เรียน/คำตอบ/ล้มเหลว) และข้อที่ถามบ่อย', async () => {
    await renderTab();
    const text = container.textContent ?? '';
    expect(text).toContain('18'); // คำถามผู้เรียน
    expect(text).toContain('3'); // ผู้เรียนที่ถาม
    expect(text).toContain('16'); // คำตอบ AI
    expect(text).toContain('ข้อที่ถูกถามบ่อยที่สุด');
  });

  it('ค้นหาแล้วส่งคำค้นไปกับ URL', async () => {
    await renderTab();

    const input = container.querySelector('input[aria-label="ค้นหาในข้อความ"]') as HTMLInputElement;
    const form = input.closest('form') as HTMLFormElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, 'some');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    const url = new URL(lastUrl(), 'http://localhost');
    expect(url.searchParams.get('q')).toBe('some');
    expect(url.searchParams.get('page')).toBe('1');
  });

  it('เก็บรหัสรอบของผู้เรียนไว้แสดง (ตามรอบ) — ข้อความรอบเดิมไม่หาย', async () => {
    await renderTab();
    expect(container.textContent).toContain('จะใช้ some ตอนไหน');
  });

  it('API ล้มเหลว → แสดงข้อความแทนที่จะพัง', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ success: false, error: 'อ่านไม่สำเร็จ' }, 500));

    await renderTab();

    expect(container.textContent).toContain('อ่านไม่สำเร็จ');
  });
});
