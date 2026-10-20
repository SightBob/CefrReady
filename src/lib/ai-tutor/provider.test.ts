/**
 * Fallback ของ AI Tutor — mock fetch ทั้งหมด ไม่ยิงโมเดลจริง
 *
 * กฎที่ต้องผ่าน:
 * - สลับโมเดลสำรองเมื่อ: 429 / 5xx / timeout / ไม่มีเนื้อหาชิ้นแรกตามเวลา / คำตอบว่าง
 * - ไม่สลับเมื่อ: 4xx อื่น (400/401/402/404)
 * - ไม่สลับหลังเริ่มส่งเนื้อหาให้ผู้เรียนแล้ว
 * - ทั้งสองโมเดลล้มเหลว → throw (ฝั่ง route คืนโควตา)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AiTutorProviderError, streamAiTutorReply } from './provider';
import { clearAiTutorConfigCache } from './config';

const PRIMARY = 'minimax/minimax-m3.1-flash:free';
const FALLBACK = 'deepseek/deepseek-v4.1-flash';

type Call = { url: string; body: Record<string, unknown>; signal: AbortSignal | null };

function sseStream(
  chunks: string[],
  options: { hang?: boolean; signal?: AbortSignal | null } = {},
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      // เมื่อถูก abort (เช่น รอเนื้อหาชิ้นแรกไม่ทัน) → stream ต้อง error ด้วย
      options.signal?.addEventListener('abort', () => {
        try { controller.error(new Error('aborted')); } catch { /* ปิดไปแล้ว */ }
      });
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      if (options.hang) return; // ไม่ปิด stream → ผู้เรียกรอถึง timeout
      controller.close();
    },
  });
}

function contentChunk(text: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content: text }, finish_reason: null }] })}\n\n`;
}

function finishChunk(reason: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: reason }] })}\n\n`;
}

function usageChunk(): string {
  return `data: ${JSON.stringify({ usage: { prompt_tokens: 100, completion_tokens: 50, completion_tokens_details: { reasoning_tokens: 10 } } })}\n\n`;
}

let calls: Call[] = [];
let responses: Array<(call: Call) => Response | Promise<Response>> = [];

beforeEach(() => {
  calls = [];
  responses = [];
  process.env.OPENROUTER_API_KEY = 'test-key';
  process.env.AI_TUTOR_MODEL = PRIMARY;
  process.env.AI_TUTOR_FALLBACK_MODEL = FALLBACK;
  process.env.AI_TUTOR_REASONING_EFFORT = 'low';
  process.env.AI_TUTOR_FALLBACK_REASONING_EFFORT = 'none';
  process.env.AI_TUTOR_FIRST_TOKEN_TIMEOUT_MS = '80';
  process.env.AI_TUTOR_TIMEOUT_MS = '5000';
  delete process.env.AI_TUTOR_PROMPT_CACHE;
  // config มีแคช 30 วินาที — ล้างให้แต่ละเคสอ่าน env ตามที่ตั้งไว้
  clearAiTutorConfigCache();

  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    const call = { url: String(url), body, signal: init.signal ?? null };
    calls.push(call);
    const handler = responses.shift();
    if (!handler) throw new Error('ไม่ได้เตรียม response ให้');
    return handler(call);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.AI_TUTOR_MODEL;
  delete process.env.AI_TUTOR_FALLBACK_MODEL;
  delete process.env.AI_TUTOR_REASONING_EFFORT;
  delete process.env.AI_TUTOR_FALLBACK_REASONING_EFFORT;
  delete process.env.AI_TUTOR_FIRST_TOKEN_TIMEOUT_MS;
  delete process.env.AI_TUTOR_TIMEOUT_MS;
  delete process.env.OPENROUTER_API_KEY;
});

const messages = [{ role: 'user' as const, content: 'ทำไม' }];

function okResponse(text: string, finishReason = 'stop') {
  return new Response(sseStream([contentChunk(text), finishChunk(finishReason), usageChunk()]));
}

describe('AI Tutor — ไม่มี fallback ที่จำเป็น', () => {
  it('โมเดลหลักตอบได้ → ใช้โมเดลหลัก ไม่สลับ', async () => {
    responses = [() => okResponse('คำตอบ')];
    const result = await streamAiTutorReply({ messages, onDelta: () => undefined });
    expect(result.usage.model).toBe(PRIMARY);
    expect(result.fallbackUsed).toBe(false);
    expect(result.text).toBe('คำตอบ');
    expect(calls).toHaveLength(1);
  });

  it('ส่ง reasoning.effort + exclude ตามที่ตั้งค่า (ไม่ส่งเนื้อหา reasoning กลับ)', async () => {
    responses = [() => okResponse('คำตอบ')];
    await streamAiTutorReply({ messages, onDelta: () => undefined });
    const reasoning = calls[0].body.reasoning as { effort: string; exclude: boolean };
    expect(reasoning.exclude).toBe(true);
    expect(reasoning.effort).toBe('low');
  });

  it('ไม่มีโมเดลสำรอง → error ตรง ๆ ไม่พยายามสลับ', async () => {
    delete process.env.AI_TUTOR_FALLBACK_MODEL;
    responses = [() => new Response('rate limited', { status: 429 })];
    await expect(streamAiTutorReply({ messages, onDelta: () => undefined })).rejects.toThrow(AiTutorProviderError);
    expect(calls).toHaveLength(1);
  });
});

describe('AI Tutor — สลับโมเดลสำรอง', () => {
  it('สลับเมื่อโมเดลหลักได้ 429', async () => {
    responses = [
      () => new Response(JSON.stringify({ error: { message: 'rate limited' } }), { status: 429 }),
      () => okResponse('คำตอบจากสำรอง'),
    ];
    const result = await streamAiTutorReply({ messages, onDelta: () => undefined });
    expect(result.fallbackUsed).toBe(true);
    expect(result.fallbackReason).toBe('rate-limit');
    expect(result.usage.model).toBe(FALLBACK);
    expect(result.text).toBe('คำตอบจากสำรอง');
    expect(calls).toHaveLength(2);
  });

  it('สลับเมื่อโมเดลหลักได้ 5xx', async () => {
    responses = [
      () => new Response('server error', { status: 503 }),
      () => okResponse('ok'),
    ];
    const result = await streamAiTutorReply({ messages, onDelta: () => undefined });
    expect(result.fallbackUsed).toBe(true);
    expect(result.fallbackReason).toBe('server-error');
  });

  it('สลับเมื่อไม่มีเนื้อหาชิ้นแรกภายในเวลาที่กำหนด (timeout)', async () => {
    responses = [
      (call) => new Response(sseStream([], { hang: true, signal: call.signal })),
      () => okResponse('ตอบจากสำรอง'),
    ];
    const result = await streamAiTutorReply({ messages, onDelta: () => undefined });
    expect(result.fallbackUsed).toBe(true);
    expect(result.fallbackReason).toBe('first-token-timeout');
    expect(result.usage.model).toBe(FALLBACK);
  });

  it('สลับเมื่อคำตอบว่าง (จบแล้วไม่มีเนื้อหา)', async () => {
    responses = [
      () => new Response(sseStream([finishChunk('stop'), usageChunk()])),
      () => okResponse('ตอบจากสำรอง'),
    ];
    const result = await streamAiTutorReply({ messages, onDelta: () => undefined });
    expect(result.fallbackUsed).toBe(true);
    expect(result.fallbackReason).toBe('empty');
  });

  it('สลับเมื่อถูกตัด (finish_reason = length) ก่อนมีเนื้อหา', async () => {
    responses = [
      () => new Response(sseStream([finishChunk('length'), usageChunk()])),
      () => okResponse('ตอบจากสำรอง'),
    ];
    const result = await streamAiTutorReply({ messages, onDelta: () => undefined });
    expect(result.fallbackUsed).toBe(true);
  });

  it('ใช้ค่า reasoning ของโมเดลสำรองแยกกัน', async () => {
    responses = [
      () => new Response('rate limited', { status: 429 }),
      () => okResponse('ตอบ'),
    ];
    await streamAiTutorReply({ messages, onDelta: () => undefined });
    const primaryReasoning = calls[0].body.reasoning as { effort: string };
    const fallbackReasoning = calls[1].body.reasoning as { effort: string };
    expect(primaryReasoning.effort).toBe('low');
    expect(fallbackReasoning.effort).toBe('none');
  });
});

describe('AI Tutor — ไม่สลับ', () => {
  it('ไม่สลับเมื่อโมเดลหลักได้ 400', async () => {
    responses = [() => new Response(JSON.stringify({ error: { message: 'bad request' } }), { status: 400 })];
    await expect(streamAiTutorReply({ messages, onDelta: () => undefined })).rejects.toThrow(AiTutorProviderError);
    expect(calls).toHaveLength(1);
  });

  it('ไม่สลับเมื่อโมเดลหลักได้ 401', async () => {
    responses = [() => new Response(JSON.stringify({ error: { message: 'no key' } }), { status: 401 })];
    await expect(streamAiTutorReply({ messages, onDelta: () => undefined })).rejects.toThrow(/key/);
    expect(calls).toHaveLength(1);
  });

  it('ไม่สลับหลังเริ่มส่งเนื้อหาให้ผู้เรียนแล้ว (stream ล้มกลางทาง)', async () => {
    const deltas: string[] = [];
    // stream ที่ส่งข้อความแล้ว error กลางทาง (error หลัง tick ถัดไป เพื่อให้ chunk แรกถูกส่งถึงผู้เรียนก่อน)
    const encoder = new TextEncoder();
    responses = [
      () => new Response(new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(contentChunk('คำตอบบางส่วน')));
          setTimeout(() => controller.error(new Error('stream ล้ม')), 5);
        },
      })),
      () => okResponse('ไม่ควรถูกเรียก'),
    ];

    const result = await streamAiTutorReply({ messages, onDelta: (t) => deltas.push(t) });
    expect(result.fallbackUsed).toBe(false);
    expect(result.text).toBe('คำตอบบางส่วน');
    expect(deltas).toEqual(['คำตอบบางส่วน']);
    expect(calls).toHaveLength(1);
  });
});

describe('AI Tutor — ทั้งสองโมเดลล้มเหลว', () => {
  it('throw error (ฝั่ง route จะคืนโควตา)', async () => {
    responses = [
      () => new Response('rate limited', { status: 429 }),
      () => new Response('server error', { status: 500 }),
    ];
    await expect(streamAiTutorReply({ messages, onDelta: () => undefined })).rejects.toThrow(AiTutorProviderError);
    expect(calls).toHaveLength(2);
  });

  it('ทั้งสองตอบว่าง → throw error', async () => {
    responses = [
      () => new Response(sseStream([finishChunk('stop')])),
      () => new Response(sseStream([finishChunk('stop')])),
    ];
    await expect(streamAiTutorReply({ messages, onDelta: () => undefined })).rejects.toThrow(AiTutorProviderError);
  });
});

describe('AI Tutor — ข้อมูลที่ route บันทึก', () => {
  it('รายงานโมเดลที่ตอบจริง + finish_reason + TTFT + reasoning tokens', async () => {
    responses = [() => okResponse('คำตอบ', 'stop')];
    const result = await streamAiTutorReply({ messages, onDelta: () => undefined });
    expect(result.usage.model).toBe(PRIMARY);
    expect(result.finishReason).toBe('stop');
    expect(result.usage.reasoningTokens).toBe(10);
    expect(result.usage.inputTokens).toBe(100);
    expect(result.usage.outputTokens).toBe(50);
    expect(result.ttftMs).not.toBeNull();
  });
});
