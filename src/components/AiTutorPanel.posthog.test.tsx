// @vitest-environment jsdom
/**
 * Analytics PostHog ชุด ai_tutor_* ในกรอบ AI Tutor
 *
 * event 5 ตัวของหน้าจริง (โหมด mock ไม่ส่งอะไรเลย):
 * - ai_tutor_opened          เห็นกรอบ AI ต่อข้อ หนึ่งครั้งต่อ threadKey
 * - ai_tutor_question_asked  ต่อการส่งคำถาม — ไม่มีเนื้อหาคำถามบน PostHog
 * - ai_tutor_quota_exhausted โควตาของข้อหมด (429 + payload quota)
 * - ai_tutor_error           error_kind: not_configured / not_checked / rate_limit / provider / network
 * - ai_tutor_thread_reset    กดเริ่มคำถามใหม่ (status: ok | error)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AI_TUTOR_EVENTS } from './AiTutorPanel';

const { captures, mockPosthog } = vi.hoisted(() => {
  const captures: Array<{ event: string; props?: Record<string, unknown> }> = [];
  const mockPosthog = {
    capture: vi.fn((event: string, props?: Record<string, unknown>) => {
      captures.push({ event, props });
    }),
  };
  return { captures, mockPosthog };
});

// AiTutorPanel รับ posthog ผ่าน usePostHog() ของบริบท Provider — เทสจำลองแทน
// (จริงในหน้าเว็บถ้า key ไม่ตั้ง = posthog null → capture ถูกข้ามไปโดยตรง)
vi.mock('@/lib/posthog', () => ({
  usePostHog: () => mockPosthog,
}));

import AiTutorPanel from './AiTutorPanel';

let container: HTMLDivElement;
let root: Root;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** SSE สำเร็จ — เธรดเลื่อน delta แล้วจบด้วย done (แบบ /api/ai-tutor จริง) */
function streamResponse(finalText: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: finalText })}\n\n`));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', messageId: 11, text: finalText })}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

function events(name: string) {
  return captures.filter((entry) => entry.event === name);
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  captures.length = 0;
  mockPosthog.capture.mockClear();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function renderPanel(extraProps: React.ComponentProps<typeof AiTutorPanel> = {}) {
  await act(async () => {
    root.render(
      <AiTutorPanel
        questionId={7}
        answerProof="proof-token"
        introMessage="หลัง do ต้องตามด้วยกริยาช่อง 1"
        sectionId="listening"
        testSetId="set-12"
        attemptKey="attempt-1"
        {...extraProps}
      />,
    );
  });
}

function textarea(): HTMLTextAreaElement {
  const element = container.querySelector<HTMLTextAreaElement>('textarea');
  if (!element) throw new Error('ไม่พบช่องพิมพ์');
  return element;
}

async function sendMessage(text: string) {
  await act(async () => {
    const field = textarea();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(field, text);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  await act(async () => {
    await Promise.resolve();
  });
}

/** ทุก event ต้องผูกพาร์ทข้อสอบ/รอบของข้อนี้ไว้ใน props เสมอ (ยกเว้นฟิลด์เพิ่มเฉพาะเหตุการณ์) */
describe('AiTutorPanel — analytics ชุด ai_tutor_*', () => {
  it('AI_TUTOR_EVENTS เรียกตามแผนครบ 5 event', () => {
    expect(AI_TUTOR_EVENTS).toEqual([
      'ai_tutor_opened',
      'ai_tutor_question_asked',
      'ai_tutor_quota_exhausted',
      'ai_tutor_error',
      'ai_tutor_thread_reset',
    ]);
  });

  it('เปิดกรอบข้อจริง → ai_tutor_opened 1 ครั้ง (re-render ข้อเดิมไม่ยิงซ้ำ)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ success: true, messages: [], quota: null })));

    await renderPanel();
    expect(events('ai_tutor_opened')).toHaveLength(1);

    // re-render ในเธรดเดิม (ผู้เรียนเลื่อนหน้า/สถานะเปลี่ยน) ห้ามยิงซ้ำ
    await renderPanel();
    expect(events('ai_tutor_opened')).toHaveLength(1);

    const props = events('ai_tutor_opened')[0]?.props;
    expect(props).toMatchObject({ question_id: 7, section_id: 'listening', test_set_id: 'set-12', attempt_key: 'attempt-1' });
  });

  it('ถามสำเร็จ → ai_tutor_question_asked มีจำนวน/ความยาวเท่านั้น ไม่มีเนื้อหาคำถามขึ้น PostHog', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/api/ai-tutor?')) {
        return jsonResponse({ success: true, messages: [], quota: { used: 0, limit: 5, remaining: 5 } });
      }
      if (init?.method === 'POST') return streamResponse('ตอบสำเร็จ');
      return jsonResponse({ success: true });
    }));

    await renderPanel();
    await sendMessage('ทำไมต้องเป็น do ครับ และเนื้อหานี้จะขึ้น PostHog ไม่ได้');

    const asked = events('ai_tutor_question_asked');
    expect(asked).toHaveLength(1);
    const props = asked[0]?.props as Record<string, unknown>;
    expect(props).toMatchObject({ question_index: 1, answer_length: 'ทำไมต้องเป็น do ครับ และเนื้อหานี้จะขึ้น PostHog ไม่ได้'.length });
    expect(JSON.stringify(props)).not.toContain('ทำไมต้องเป็น');
  });

  it('429-โควตาหมด → ai_tutor_quota_exhausted · 429-ถี่เกินไป → ai_tutor_error (rate_limit)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/api/ai-tutor?')) {
        return jsonResponse({ success: true, messages: [], quota: null });
      }
      if (init?.method === 'POST') {
        return jsonResponse({ error: 'โควตาคำถามของข้อนี้หมดแล้ว', quota: { used: 5, limit: 5, remaining: 0 } }, 429);
      }
      return jsonResponse({ success: true });
    }));

    await renderPanel();
    await sendMessage('ทำไม');
    const exhausted = events('ai_tutor_quota_exhausted');
    expect(exhausted).toHaveLength(1);
    expect(exhausted[0]?.props).toMatchObject({ used: 5, limit: 5 });

    // ไม่มี ai_tutor_error ปนในกรณีโควตาหมด — แยกเหตุการณ์ชัด
    expect(events('ai_tutor_error')).toHaveLength(0);
  });

  it('โมเดล error (SSE error event) → ai_tutor_error (provider)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/api/ai-tutor?')) {
        return jsonResponse({ success: true, messages: [], quota: null });
      }
      if (init?.method === 'POST') {
        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'โมเดลล้มเหลว' })}\n\n`));
            controller.close();
          },
        });
        return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
      }
      return jsonResponse({ success: true });
    }));

    await renderPanel();
    await sendMessage('ทำไม');

    const errors = events('ai_tutor_error');
    expect(errors).toHaveLength(1);
    expect(errors[0]?.props).toMatchObject({ error_kind: 'provider', answered_partially: false });
  });

  it('ยังไม่ได้ตรวจคำตอบ → ai_tutor_error (not_checked) โดยไม่ fetch POST', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('/api/ai-tutor?')) return jsonResponse({ success: true, messages: [], quota: null });
      return jsonResponse({ success: true });
    });
    vi.stubGlobal('fetch', fetchMock);

    await renderPanel({ answerProof: null });
    await sendMessage('ทำไม');

    expect(events('ai_tutor_error')[0]?.props).toMatchObject({ error_kind: 'not_checked' });
    // ไม่ได้ยิงคำถามออกจาก client เพราะกันไว้ที่หน้าเว็บแล้ว
    expect(fetchMock).not.toHaveBeenCalledWith('/api/ai-tutor', expect.objectContaining({ method: 'POST' }));
  });

  it('เริ่มคำถามใหม่สำเร็จ → ai_tutor_thread_reset (status: ok)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/api/ai-tutor?')) {
        return jsonResponse({ success: true, messages: [], quota: null });
      }
      if (String(url).endsWith('/reset')) return jsonResponse({ success: true, quota: { used: 0, limit: 5, remaining: 5 } });
      if (init?.method === 'POST') return streamResponse('ตอบ');
      return jsonResponse({ success: true });
    }));

    await renderPanel();
    const resetButton = container.querySelector<HTMLButtonElement>('button[aria-label="เริ่มคำถามใหม่"]');
    if (!resetButton) throw new Error('ไม่พบปุ่มเริ่มคำถามใหม่');
    await act(async () => {
      resetButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const resets = events('ai_tutor_thread_reset');
    expect(resets).toHaveLength(1);
    expect(resets[0]?.props).toMatchObject({ status: 'ok' });
  });

  it('โหมด mock (ไม่มี questionId) → ไม่ยิง event ใดเลย', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ success: true })));

    await act(async () => {
      root.render(<AiTutorPanel introMessage="โหมดแสดงตัวอย่าง" />);
    });
    // เธรดเลื่อน/คลิกอะไรเองไม่ได้ใน mock — ยืนยันว่าการ mount ไม่สร้าง event
    expect(captures).toHaveLength(0);
  });
});
