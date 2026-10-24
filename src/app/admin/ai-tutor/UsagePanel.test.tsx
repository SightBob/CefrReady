// @vitest-environment jsdom
/**
 * การ์ด "การใช้วันนี้" ของหน้า /admin/ai-tutor
 * - แสดงตัวเลขจาก API (คำถามวันนี้เทียบเพดาน)
 * - อัปเดตเมื่อกดปุ่มรีเฟรชเท่านั้น (ไม่มี polling อัตโนมัติ)
 * - API ล้ม → บอกเหตุผล + ปุ่มลองใหม่ (ไม่พังทั้งหน้า)
 */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import UsagePanel from './UsagePanel';

const USAGE = {
  dayStart: '2026-10-23T17:00:00.000Z',
  resetAt: '2026-10-24T17:00:00.000Z',
  questions: 1240,
  answers: 1180,
  failed: 12,
  learners: 87,
  pending: 2,
  lastActivityAt: '2026-10-24T09:15:00.000Z',
  topLearners: [
    { userId: 'u1', email: 'heavy@example.com', name: 'ผู้เรียนหนัก', count: 42 },
    { userId: 'u2', email: 'second@example.com', name: null, count: 18 },
  ],
  limits: { systemDailyLimit: 10_000, userDailyLimit: 50, questionQuota: 10 },
  runtimeEnabled: true,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  fetchMock = vi.fn(async () => jsonResponse({ success: true, data: USAGE }));
  vi.stubGlobal('fetch', fetchMock);

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function render() {
  await act(async () => {
    root.render(<UsagePanel />);
  });
}

describe('UsagePanel — การใช้วันนี้', () => {
  it('แสดงจำนวนคำถามวันนี้เทียบเพดาน + ร้อยละ + ที่เหลือ', async () => {
    await render();

    const text = container.textContent ?? '';
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/ai-tutor/usage', { cache: 'no-store' });
    expect(text).toContain('การใช้วันนี้');
    expect(text).toContain('1,240');
    expect(text).toContain('10,000');
    expect(text).toContain('12%');
    expect(text).toContain('8,760'); // เหลือ
    expect(text).toContain('เพดานต่อผู้เรียน 50');
  });

  it('หลอดความคืบหน้ามี aria ที่อ่านออกเสียงได้', async () => {
    await render();

    const bar = container.querySelector('[role="progressbar"]');
    expect(bar?.getAttribute('aria-valuenow')).toBe('1240');
    expect(bar?.getAttribute('aria-valuemax')).toBe('10000');
    expect(bar?.getAttribute('aria-valuetext')).toContain('1240');
  });

  it('แสดงผู้เรียนที่ใช้มากสุด + ลิงก์บริบทเพดานต่อคน', async () => {
    await render();

    const text = container.textContent ?? '';
    expect(text).toContain('heavy@example.com');
    expect(text).toContain('42 ครั้ง');
    expect(text).toContain('second@example.com');
  });

  it('ไม่รีเฟรชเองอัตโนมัติ — ตัวเลขนิ่งจนกว่าจะกดปุ่ม', async () => {
    vi.useFakeTimers();
    await render();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // เดินเวลาไป 5 นาที (เดิมมี polling ทุก 30 วิ = 10 ครั้ง) → ต้องไม่มีการเรียกเพิ่ม
    await act(async () => {
      vi.advanceTimersByTime(5 * 60_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('ตัวเลขจะอัปเดตเมื่อกด “รีเฟรช”');
  });

  it('กดปุ่มรีเฟรช → เรียก API ใหม่และอัปเดตเวลาที่อ่านข้อมูล', async () => {
    await render();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(container.textContent).toMatch(/ข้อมูล ณ \d{2}:\d{2}:\d{2}/);

    fetchMock.mockImplementation(async () => jsonResponse({
      success: true,
      data: { ...USAGE, questions: 1250, answers: 1189 },
    }));

    const refresh = container.querySelector<HTMLButtonElement>('button[aria-label="รีเฟรชสถิติ"]');
    expect(refresh?.textContent).toContain('รีเฟรช');

    await act(async () => {
      refresh!.click();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('1,250');
    expect(container.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('1250');
  });

  it('API ล้ม → บอกเหตุผล + ปุ่มลองใหม่ แล้วกลับมาแสดงตัวเลขได้', async () => {
    fetchMock.mockImplementationOnce(async () => jsonResponse({ success: false, error: 'อ่านสถิติไม่สำเร็จ' }, 503));

    await render();
    expect(container.textContent).toContain('อ่านสถิติไม่สำเร็จ');

    const retry = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('ลองใหม่'));
    expect(retry).toBeTruthy();

    await act(async () => {
      retry!.click();
    });
    expect(container.textContent).toContain('1,240');
  });

  it('วันนี้ยังไม่มีใครถาม → บอกตรง ๆ ไม่ใช่หลอดว่างเปล่า', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({
      success: true,
      data: { ...USAGE, questions: 0, answers: 0, failed: 0, learners: 0, pending: 0, topLearners: [] },
    }));

    await render();
    expect(container.textContent).toContain('วันนี้ยังไม่มีผู้เรียนถาม AI');
  });
});
