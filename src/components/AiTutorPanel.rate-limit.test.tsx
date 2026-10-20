// @vitest-environment jsdom
/**
 * กรอบ AI Tutor ฝั่งผู้เรียน — พฤติกรรมเมื่อ server ตอบ 429
 *
 * 429 สองแบทมีความหมายต่างกัน:
 * - มี payload quota → โควตาหมดจริง → ปิดช่องพิมพ์ (ผู้เรียนรู้ว่าต้องรอพรุ่งนี้)
 * - ไม่มี payload quota → ถี่เกินไป (rate limit) → แสดงข้อความไทย แต่ยังพิมพ์ต่อได้
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import AiTutorPanel from './AiTutorPanel';

let container: HTMLDivElement;
let root: Root;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function renderPanel() {
  await act(async () => {
    root.render(
      <AiTutorPanel
        questionId={7}
        answerProof="proof-token"
        introMessage="หลัง do ต้องตามด้วยกริยาช่อง 1"
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
    // ช่องพิมพ์เป็น uncontrolled (อ่านค่าจาก ref) → set ผ่าน native setter
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(field, text);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    // กด Enter = ส่ง (ปุ่มส่งถูกปิดไว้เพราะช่องพิมพ์ไม่ได้ผูกกับ state)
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  await act(async () => {
    await Promise.resolve();
  });
}

describe('AiTutorPanel — 429 ถี่เกินไป (rate limit)', () => {
  it('แสดงข้อความไทยจาก server และยังพิมพ์ต่อได้ (ไม่ปิดช่อง)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/api/ai-tutor?')) {
        return jsonResponse({ success: true, messages: [], quota: { used: 1, limit: 5, remaining: 4 } });
      }
      if (init?.method === 'POST') {
        return jsonResponse({ success: false, error: 'ถาม AI ถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง' }, 429);
      }
      return jsonResponse({ success: true });
    }));

    await renderPanel();
    await sendMessage('ทำไม');

    expect(container.textContent).toContain('ถาม AI ถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง');
    // ไม่ปิดช่องพิมพ์ — ผู้เรียนลองใหม่ได้เลย
    expect(textarea().disabled).toBe(false);
  });
});

describe('AiTutorPanel — 429 โควตาหมด (มี payload quota)', () => {
  it('ปิดช่องพิมพ์ไว้ เพราะโควตาของข้อนี้หมดแล้ว', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/api/ai-tutor?')) {
        return jsonResponse({ success: true, messages: [], quota: { used: 5, limit: 5, remaining: 0 } });
      }
      if (init?.method === 'POST') {
        return jsonResponse(
          { success: false, error: 'โควตาคำถามของข้อนี้หมดแล้ว (5/5 ครั้งต่อวัน)', quota: { used: 5, limit: 5, remaining: 0 } },
          429,
        );
      }
      return jsonResponse({ success: true });
    }));

    await renderPanel();
    await sendMessage('ทำไม');

    expect(container.textContent).toContain('โควตาคำถามของข้อนี้หมดแล้ว');
    expect(textarea().disabled).toBe(true);
  });
});
