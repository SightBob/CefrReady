/**
 * โมเดลที่เลือกในหน้า admin (DB) ต้องถูกส่งให้ provider จริง
 *
 * ข้อ 2.3 (4): เลือกโมเดลใน DB → provider ได้รับโมเดลนั้น
 * - mock fetch (ไม่ยิง OpenRouter จริง) + stub '@/db' (ค่าใน ai_tutor_settings)
 * - ไม่ส่ง config เข้าไป → provider ต้องอ่าน getAiTutorConfig() เอง = DB ทับ env
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: { select: mocks.select },
}));

import { streamAiTutorReply } from './provider';
import { clearAiTutorConfigCache } from './config';

const DB_MODEL = 'vendor/model-from-admin-page';
const ENV_MODEL = 'env/model';

function stubSettings(rows: Array<{ key: string; value: unknown }>) {
  mocks.select.mockImplementation(() => {
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(rows).then(resolve);
    return chain;
  });
}

function sseStream(chunks: string[]): ReadableStream<Uint8Buffer> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Buffer>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}
type Uint8Buffer = Uint8Array;

let calls: Array<{ url: string; body: Record<string, unknown> }> = [];

beforeEach(() => {
  calls = [];
  mocks.select.mockReset();
  process.env.OPENROUTER_API_KEY = 'test-key';
  process.env.AI_TUTOR_MODEL = ENV_MODEL;
  process.env.AI_TUTOR_REASONING_EFFORT = 'low';
  clearAiTutorConfigCache();

  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    calls.push({ url: String(url), body });
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"คำตอบ"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n'));
        controller.close();
      },
    });
    return new Response(stream);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.AI_TUTOR_MODEL;
  delete process.env.AI_TUTOR_REASONING_EFFORT;
});

describe('provider — โมเดลจาก DB (หน้า admin) ถูกใช้จริง', () => {
  it('โมเดลใน DB ถูกส่งให้ OpenRouter (แทนค่า env)', async () => {
    stubSettings([{ key: 'primaryModel', value: DB_MODEL }]);
    const result = await streamAiTutorReply({
      messages: [{ role: 'user', content: 'ทำไม' }],
      onDelta: () => undefined,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].body.model).toBe(DB_MODEL);
    expect(result.usage.model).toBe(DB_MODEL);
  });

  it('ไม่มีค่าใน DB → ใช้ค่า env', async () => {
    stubSettings([]);
    const result = await streamAiTutorReply({
      messages: [{ role: 'user', content: 'ทำไม' }],
      onDelta: () => undefined,
    });
    expect(calls[0].body.model).toBe(ENV_MODEL);
    expect(result.usage.model).toBe(ENV_MODEL);
  });
});
