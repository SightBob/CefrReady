// @vitest-environment jsdom
/**
 * ปุ่ม "ส่งคำถาม" ในกรอบ AI Tutor ต้องกดได้หลังผู้เรียนพิมพ์
 * (ผู้ใช้รายงาน 2026-10-25: ปุ่มส่งกดไม่ได้)
 *
 * สาเหตุเดิม: ช่องพิมพ์เป็น uncontrolled (defaultValue) แต่ปุ่มผูกกับ state
 * `chatInput` ที่ไม่มี onChange อัปเดต → chatInput ว่างตลอด → disabled ตลอด
 * (กด Enter ยังส่งได้เพราะ sendFromInput อ่านค่าจาก DOM ตรง ๆ)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import AiTutorPanel from './AiTutorPanel';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function streamResponse(finalText: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: finalText })}\n\n`));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', messageId: 21, text: finalText })}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

let container: HTMLDivElement;
let root: Root;
let calls: Array<{ url: string; init?: RequestInit }>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  calls = [];
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    if (!init || init.method !== 'POST') {
      return jsonResponse({ messages: [], quota: { used: 0, limit: 5, remaining: 5 } });
    }
    return streamResponse('หลัง do ต้องตามด้วยกริยาช่อง 1');
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function sendButton() {
  const button = container.querySelector<HTMLButtonElement>('button[aria-label="ส่งคำถาม"]');
  if (!button) throw new Error('ไม่พบปุ่มส่งคำถาม');
  return button;
}

function textarea() {
  const field = container.querySelector<HTMLTextAreaElement>('textarea');
  if (!field) throw new Error('ไม่พบช่องพิมพ์');
  return field;
}

async function type(text: string) {
  await act(async () => {
    const field = textarea();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(field, text);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('AiTutorPanel — ปุ่มส่งคำถาม', () => {
  it('พิมพ์แล้วปุ่มส่งต้องกดได้ และกดแล้วยิงไป /api/ai-tutor', async () => {
    await act(async () => {
      root.render(
        <AiTutorPanel questionId={7} answerProof="proof-token" introMessage="คำอธิบายข้อนี้" />,
      );
    });

    // ยังไม่ได้พิมพ์ → ปิดไว้ถูกต้อง
    expect(sendButton().disabled).toBe(true);

    await type('ทำไมช่องว่างต้องเป็น do');

    expect(sendButton().disabled).toBe(false);

    await act(async () => {
      sendButton().click();
    });

    const post = calls.filter((call) => call.init?.method === 'POST');
    expect(post).toHaveLength(1);
    expect(JSON.parse(String(post[0].init?.body))).toMatchObject({
      questionId: 7,
      message: 'ทำไมช่องว่างต้องเป็น do',
      proof: 'proof-token',
    });

    // ส่งแล้วช่องพิมพ์ว่าง → ปุ่มกลับไปปิด
    expect(sendButton().disabled).toBe(true);
  });
});
