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
    {
      id: 'vendor/high-only:free',
      name: 'High Only',
      pricing: { prompt: 0, completion: 0 },
      reasoningMandatory: true,
      supportedEfforts: ['medium', 'high'],
      contextLength: 200000,
      overPriceLimit: false,
    },
  ],
};

/** บันทึกทุกคำขอที่หน้าจอยิงออกไป (ตรวจ body ของปุ่มทดสอบ) */
let fetchCalls: Array<{ href: string; init?: RequestInit }> = [];

let container: HTMLDivElement;
let root: Root;

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  fetchCalls = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const href = String(url);
    fetchCalls.push({ href, init });
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

/** พิมพ์ค่าลง input แบบ React รับรู้ (ต้องใช้ native setter + เปลี่ยนแปลง 'input') */
function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
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
    const input = container.querySelector<HTMLInputElement>('input[aria-label="โมเดลหลัก"]');
    expect(input).toBeTruthy();

    await act(async () => {
      setInputValue(input!, 'deepseek/deepseek-v4.1-flash');
    });

    expect(button('บันทึกการตั้งค่า').disabled).toBe(true);
    expect(container.textContent).toContain('ต้องทดสอบโมเดลใหม่ให้ผ่านก่อนจึงจะบันทึกได้');

    await act(async () => {
      button('ทดสอบเรียกโมเดลหลัก').click();
    });

    expect(container.textContent).toContain('ทดสอบโมเดลนี้ผ่านแล้ว');
    expect(button('บันทึกการตั้งค่า').disabled).toBe(false);
  });

  it('ปุ่มทดสอบต้องส่ง effort ที่เลือกไว้ไปด้วย (ไม่ใช่ให้ server ใช้ low ตั้งต้น)', async () => {
    await renderTab();

    await act(async () => {
      const effort = container.querySelector<HTMLSelectElement>('select[aria-label="เลือก reasoning effort ของโมเดลหลัก"]');
      effort!.value = 'medium';
      effort!.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => {
      button('ทดสอบเรียกโมเดลหลัก').click();
    });

    const testCall = fetchCalls.find((call) => call.href.includes('/api/admin/ai-tutor/models/test'));
    expect(testCall).toBeTruthy();
    const body = JSON.parse(String(testCall!.init?.body));
    expect(body).toEqual({ model: 'minimax/minimax-m3.1-flash:free', effort: 'medium' });
  });

  it('พิมพ์ model id เองได้ แม้ไม่มีในรายการที่โหลดมา (โมเดลใหม่จาก OpenRouter)', async () => {
    await renderTab();
    const input = container.querySelector<HTMLInputElement>('input[aria-label="โมเดลหลัก"]');
    expect(input).toBeTruthy();

    await act(async () => {
      setInputValue(input!, 'vendor/brand-new-model:free');
    });

    // ค่าที่พิมพ์เองอยู่ในช่อง (ไม่ถูกตัดทิ้ง/ไม่ถูกบังคับให้เลือกจากรายการ)
    expect(input!.value).toBe('vendor/brand-new-model:free');
    // เตือนว่าไม่พบในรายชื่อที่แคชไว้ แต่ยังพิมพ์ต่อได้
    expect(container.textContent).toContain('ไม่พบ');
    // ยังต้องทดสอบก่อนบันทึก (กันพิมพ์ผิด)
    expect(button('บันทึกการตั้งค่า').disabled).toBe(true);
  });

  it('เปลี่ยนไปโมเดลที่ไม่รองรับ effort เดิม (low) → ปรับ effort ให้อัตโนมัติ ให้คำว่า low ไม่ค้าง', async () => {
    await renderTab();
    // ค่าที่โหลดมา: โมเดลหลัก low (CONFIG_VALUES) — พิมพ์โมเดลที่รองรับแค่ medium/high
    const input = container.querySelector<HTMLInputElement>('input[aria-label="โมเดลหลัก"]');
    const effort = container.querySelector<HTMLSelectElement>('select[aria-label="เลือก reasoning effort ของโมเดลหลัก"]');
    expect(input).toBeTruthy();
    expect(effort!.value).toBe('low');

    await act(async () => {
      setInputValue(input!, 'vendor/high-only:free');
    });

    expect(input!.value).toBe('vendor/high-only:free');
    // ค่า effort ในฟอร์มต้องพุ่งตามโมเดลใหม่ทันที (ปรับเป็นระดับแรกที่รองรับ)
    expect(effort!.value).toBe('medium');
  });

  it('ช่องโมเดลหลักมี datalist ของรายการจาก OpenRouter ไว้ให้เลือก', async () => {
    await renderTab();
    const datalist = container.querySelector('datalist#ai-tutor-primary-model-options');
    expect(datalist).toBeTruthy();
    expect(datalist!.querySelectorAll('option').length).toBeGreaterThan(0);
    const values = [...datalist!.querySelectorAll('option')].map((option) => option.getAttribute('value'));
    expect(values).toContain('minimax/minimax-m3.1-flash:free');
  });

  it('โมเดลสำรอง: พิมพ์เองได้ และล้างเป็น "ไม่ใช้โมเดลสำรอง" ได้', async () => {
    await renderTab();
    const input = container.querySelector<HTMLInputElement>('input[aria-label="โมเดลสำรอง"]');
    expect(input).toBeTruthy();

    await act(async () => {
      setInputValue(input!, 'vendor/other-model');
    });
    expect(input!.value).toBe('vendor/other-model');

    await act(async () => {
      button('ไม่ใช้โมเดลสำรอง').click();
    });
    expect(input!.value).toBe('');
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

  it('ประวัติ (audit) ล้ม → ยังใช้ส่วนตั้งค่าได้ และเตือนว่าประวัติโหลดไม่ได้', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const href = String(url);
      if (href.includes('/api/admin/ai-tutor/config')) return jsonResponse({ success: true, data: CONFIG });
      if (href.includes('/api/admin/ai-tutor/models')) return jsonResponse(MODELS);
      if (href.includes('/api/admin/ai-tutor/audit')) {
        return new Response(JSON.stringify({ success: false, error: 'ยังไม่ได้รัน migration' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return jsonResponse({ success: true });
    }));

    await renderTab();

    // ส่วนตั้งค่ายังทำงาน
    expect(container.textContent).toContain('โควตาต่อข้อ');
    expect(button('บันทึกการตั้งค่า').disabled).toBe(false);
    // แต่มีข้อความเตือนว่าประวัติโหลดไม่ได้
    expect(container.textContent).toContain('โหลดประวัติการเปลี่ยนค่าไม่สำเร็จ');
  });

  it('ค่าตั้งโหลดไม่ได้ → บอกเหตุผลจาก server (เช่น ยังไม่ได้รัน migration)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const href = String(url);
      if (href.includes('/api/admin/ai-tutor/config')) {
        return new Response(JSON.stringify({ success: false, error: 'ยังไม่ได้รัน migration ของ AI Tutor' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (href.includes('/api/admin/ai-tutor/models')) return jsonResponse(MODELS);
      if (href.includes('/api/admin/ai-tutor/audit')) return jsonResponse({ success: true, data: [] });
      return jsonResponse({ success: true });
    }));

    await renderTab();

    expect(container.textContent).toContain('ยังไม่ได้รัน migration ของ AI Tutor');
  });

  it('ไม่ได้ตั้ง AI_TUTOR_PROOF_SECRET → มีคำเตือนเด่นว่า AI Tutor ใช้ไม่ได้', async () => {
    const noSecret = {
      ...CONFIG,
      envStatus: { ...CONFIG.envStatus, proofSecret: false },
    };
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const href = String(url);
      if (href.includes('/api/admin/ai-tutor/config')) return jsonResponse({ success: true, data: noSecret });
      if (href.includes('/api/admin/ai-tutor/models')) return jsonResponse(MODELS);
      if (href.includes('/api/admin/ai-tutor/audit')) return jsonResponse({ success: true, data: [] });
      return jsonResponse({ success: true });
    }));

    await renderTab();

    expect(container.textContent).toContain('AI Tutor ใช้งานไม่ได้ในตอนนี้');
    expect(container.textContent).toContain('AI_TUTOR_PROOF_SECRET');
    // ต้องเตือนด้วยว่าอย่าใช้ NEXT_PUBLIC_*
    expect(container.textContent).toContain('NEXT_PUBLIC_');
  });

  it('ตั้งครบทุกค่า → ไม่มีคำเตือนว่าใช้งานไม่ได้', async () => {
    await renderTab();
    expect(container.textContent).not.toContain('AI Tutor ใช้งานไม่ได้ในตอนนี้');
  });

  it('ช่องตัวเลขมี type=number + min/max/step ตามช่วงที่กำหนด และแสดงช่วงข้างช่อง', async () => {
    await renderTab();

    const quota = container.querySelector<HTMLInputElement>('input[aria-label="โควตาต่อข้อ (ครั้ง/วัน)"]');
    expect(quota?.type).toBe('number');
    expect(quota?.min).toBe('1');
    expect(quota?.max).toBe('10');
    expect(quota?.step).toBe('1');
    expect(container.textContent).toContain('ช่วงที่อนุญาต 1–10');

    const system = container.querySelector<HTMLInputElement>('input[aria-label="เพดานรวมทั้งระบบ (ครั้ง/วัน)"]');
    expect(system?.min).toBe('1');
    expect(system?.max).toBe('20000');
    // ค่า 0 ไม่ใช่ทางปิดระบบ → ต้องเตือน
    expect(container.textContent).toContain('ค่า 0 ไม่ได้หมายถึงปิดทุกคน');
  });

  it('ใส่ค่าเกินช่วง → ปุ่มบันทึกถูกปิด + มีข้อความบอกช่วง', async () => {
    await renderTab();

    const quota = container.querySelector<HTMLInputElement>('input[aria-label="โควตาต่อข้อ (ครั้ง/วัน)"]');
    expect(button('บันทึกการตั้งค่า').disabled).toBe(false);

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(quota, '999');
      quota!.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(button('บันทึกการตั้งค่า').disabled).toBe(true);
    expect(container.textContent).toContain('อยู่นอกช่วงที่อนุญาต');
    expect(container.textContent).toContain('1–10');
  });

  it('เพดานรายวันน้อยกว่าโควตาต่อข้อ → ปุ่มบันทึกถูกปิด', async () => {
    await renderTab();

    const quota = container.querySelector<HTMLInputElement>('input[aria-label="โควตาต่อข้อ (ครั้ง/วัน)"]');
    const userLimit = container.querySelector<HTMLInputElement>('input[aria-label="เพดานต่อผู้เรียน (ครั้ง/วัน)"]');

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(quota, '10');
      quota!.dispatchEvent(new Event('input', { bubbles: true }));
      setter?.call(userLimit, '2');
      userLimit!.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(button('บันทึกการตั้งค่า').disabled).toBe(true);
    expect(container.textContent).toContain('โควตาต่อข้อ');
  });
});
