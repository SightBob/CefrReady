// @vitest-environment jsdom
/**
 * คอมโพเนนต์หลักของหน้า /admin/ai-tutor (แท็บตั้งค่า)
 * - เรนเดอร์ได้
 * - ปุ่มบันทึกถูกปิดจนกว่าจะทดสอบโมเดลใหม่ผ่านในหน้านี้
 * - ปิดสวิตช์ต้องมีกล่องยืนยันก่อน
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import ConfigTab from './ConfigTab';

const CONFIG_VALUES = {
  envMasterEnabled: true,
  runtimeEnabled: true,
  primaryModel: 'minimax/minimax-m3.1-flash:free',
  fallbackModel: 'deepseek/deepseek-v4.1-flash',
  primaryEffort: 'low',
  fallbackEffort: 'none',
  maxTokens: 1200,
  timeoutMs: 30000,
  firstTokenTimeoutMs: 15000,
  questionQuota: 5,
  userDailyLimit: 50,
  systemDailyLimit: 10000,
  rolloutPercent: 0,
  promptCache: false,
};

const CONFIG = {
  config: CONFIG_VALUES,
  sources: { questionQuota: 'db' } as Record<string, string>,
  envDefaults: CONFIG_VALUES,
  warnings: [],
  envStatus: { openrouterKey: true, proofSecret: true, exportSalt: false, masterEnabled: true },
  limits: {
    routeMaxDurationSeconds: 75,
    slackSeconds: 15,
    maxTimeoutSeconds: 30,
    maxTimeoutMs: 30000,
    maxFirstTokenTimeoutMs: 30000,
    note: 'เพดานเวลารอของ route /api/ai-tutor',
    maxModelPriceInPerMtok: 1,
    maxModelPriceOutPerMtok: 3,
  },
};

const MODELS = {
  success: true,
  data: [
    {
      id: 'minimax/minimax-m3.1-flash:free',
      name: 'MiniMax',
      pricing: { prompt: 0, completion: 0 },
      reasoningMandatory: true,
      supportedEfforts: ['low', 'medium', 'high'],
      contextLength: 1000000,
      overPriceLimit: false,
    },
    {
      id: 'deepseek/deepseek-v4.1-flash',
      name: 'DeepSeek',
      pricing: { prompt: 0.0352, completion: 0.0112 },
      reasoningMandatory: false,
      supportedEfforts: ['none', 'low', 'high'],
      contextLength: 1048576,
      overPriceLimit: false,
    },
  ],
};

let container: HTMLDivElement;
let root: Root;

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const href = String(url);
    if (href.includes('/api/admin/ai-tutor/config')) return jsonResponse({ success: true, data: CONFIG });
    if (href.includes('/api/admin/ai-tutor/models/test')) {
      return jsonResponse({
        success: true,
        data: {
          model: 'deepseek/deepseek-v4.1-flash',
          latencyMs: 1200,
          ttftMs: 900,
          inputTokens: 10,
          outputTokens: 20,
          reasoningTokens: 0,
          finishReason: 'stop',
          sample: 'ทดสอบสำเร็จ',
        },
      });
    }
    if (href.includes('/api/admin/ai-tutor/models')) return jsonResponse(MODELS);
    if (href.includes('/api/admin/ai-tutor/audit')) return jsonResponse({ success: true, data: [] });
    return jsonResponse({ success: true });
  }));

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
    root.render(<ConfigTab />);
  });
}

function button(label: string): HTMLButtonElement {
  const element = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!element) throw new Error(`ไม่พบปุ่ม "${label}"`);
  return element;
}

describe('หน้า /admin/ai-tutor — แท็บตั้งค่า', () => {
  it('เรนเดอร์ได้ พร้อมสถานะ env และช่องตั้งค่า', async () => {
    await renderTab();
    expect(container.textContent).toContain('AI Tutor');
    expect(container.textContent).toContain('OPENROUTER_API_KEY');
    expect(container.textContent).toContain('โมเดลหลัก');
    expect(container.textContent).toContain('โควตาต่อข้อ');
    expect(container.textContent).toContain('ประวัติการเปลี่ยนแปลงล่าสุด');
    // ไม่มี secret ใน DOM
    expect(container.innerHTML).not.toContain('sk-or-v1');
  });

  it('ปุ่มบันทึกเปิดได้เมื่อยังไม่ได้เปลี่ยนโมเดล', async () => {
    await renderTab();
    expect(button('บันทึกการตั้งค่า').disabled).toBe(false);
  });

  it('เปลี่ยนโมเดลแล้วปุ่มบันทึกถูกปิด จนกว่าจะทดสอบโมเดลนั้นผ่าน', async () => {
    await renderTab();
    const select = container.querySelector<HTMLSelectElement>('select[aria-label="เลือกโมเดลหลัก"]');
    expect(select).toBeTruthy();

    await act(async () => {
      select!.value = 'deepseek/deepseek-v4.1-flash';
      select!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(button('บันทึกการตั้งค่า').disabled).toBe(true);
    expect(container.textContent).toContain('ต้องทดสอบโมเดลใหม่ให้ผ่านก่อนจึงจะบันทึกได้');

    await act(async () => {
      button('ทดสอบเรียกโมเดลหลัก').click();
    });

    expect(container.textContent).toContain('ทดสอบโมเดลนี้ผ่านแล้ว');
    expect(button('บันทึกการตั้งค่า').disabled).toBe(false);
  });

  it('ปิดสวิตช์ต้องมีกล่องยืนยันก่อน', async () => {
    await renderTab();
    const toggle = container.querySelector<HTMLInputElement>('input[aria-label="สวิตช์เปิดใช้งาน AI Tutor"]');
    expect(toggle).toBeTruthy();

    await act(async () => {
      toggle!.click();
    });

    expect(container.textContent).toContain('ปิดการใช้งาน AI Tutor?');
    const confirm = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('ปิดการใช้งาน'));
    expect(confirm).toBeTruthy();
  });

  it('env ปิดอยู่ → อธิบายว่าสวิตช์ชั่วคราวใช้ไม่ได้ และปิดสวิตช์ไว้', async () => {
    const offConfig = { ...CONFIG, envStatus: { ...CONFIG.envStatus, masterEnabled: false } };
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const href = String(url);
      if (href.includes('/api/admin/ai-tutor/config')) return jsonResponse({ success: true, data: offConfig });
      if (href.includes('/api/admin/ai-tutor/models')) return jsonResponse(MODELS);
      if (href.includes('/api/admin/ai-tutor/audit')) return jsonResponse({ success: true, data: [] });
      return jsonResponse({ success: true });
    }));
    await renderTab();
    expect(container.textContent).toContain('env');
    const toggle = container.querySelector<HTMLInputElement>('input[aria-label="สวิตช์เปิดใช้งาน AI Tutor"]');
    expect(toggle?.disabled).toBe(true);
  });
});
