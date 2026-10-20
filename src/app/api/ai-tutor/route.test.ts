/**
 * POST /api/ai-tutor — 401/403/429, history สร้างจาก DB เท่านั้น, ล้มเหลวแล้วคืนโควตา
 * และสตรีมคำตอบ (mock provider — ไม่ยิงโมเดลจริง)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  enabled: vi.fn(),
  select: vi.fn(),
  rateLimit: vi.fn(),
  reserveQuestion: vi.fn(),
  getQuotaSnapshot: vi.fn(),
  getThreadMessages: vi.fn(),
  buildProviderMessages: vi.fn(),
  markUserMessageOk: vi.fn(),
  markUserMessageFailed: vi.fn(),
  insertAssistantMessage: vi.fn(),
  stream: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/ai-tutor', () => ({ isAiTutorEnabled: mocks.enabled }));
vi.mock('@/db', () => ({ db: { select: mocks.select } }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: mocks.rateLimit }));
vi.mock('@/lib/api-security', () => ({ validateOrigin: () => null }));
vi.mock('@/lib/ai-tutor/quota', () => ({
  reserveQuestion: mocks.reserveQuestion,
  getQuotaSnapshot: mocks.getQuotaSnapshot,
  questionQuotaLimit: () => 5,
  userDailyLimit: () => 50,
  systemDailyLimit: () => 0,
}));
vi.mock('@/lib/ai-tutor/messages', () => ({
  getThreadMessages: mocks.getThreadMessages,
  buildProviderMessages: mocks.buildProviderMessages,
  markUserMessageOk: mocks.markUserMessageOk,
  markUserMessageFailed: mocks.markUserMessageFailed,
  insertAssistantMessage: mocks.insertAssistantMessage,
}));
vi.mock('@/lib/ai-tutor/provider', () => ({
  streamAiTutorReply: mocks.stream,
  AiTutorProviderError: class AiTutorProviderError extends Error {
    constructor(public status: number, message: string) { super(message); }
  },
}));

import { POST } from './route';
import { issueAnswerProof } from '@/lib/ai-tutor/proof';

process.env.AI_TUTOR_PROOF_SECRET = 'route-test-secret';

const QUESTION_ROW = {
  questionText: 'What do they usually do?',
  optionA: 'be',
  optionB: 'do',
  optionC: 'go',
  optionD: 'eat',
  correctAnswer: 'B',
  explanation: 'หลัง do ต้องตามด้วยกริยาช่อง 1',
  grammarTopic: 'Present Simple',
  cefrLevel: 'A2',
};

function stubQuestionRow(row: unknown = QUESTION_ROW) {
  mocks.select.mockReturnValue({
    from: () => ({ where: () => ({ limit: () => Promise.resolve(row ? [row] : []) }) }),
  });
}

function post(body: unknown) {
  return POST(new Request('http://localhost:3000/api/ai-tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

const validProof = () => issueAnswerProof({ userId: 'u1', questionId: 7, selectedAnswer: 'do' })!;

async function readEvents(response: Response) {
  const text = await response.text();
  return text
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => JSON.parse(line.slice(5).trim()));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'u1' } });
  mocks.enabled.mockResolvedValue(true);
  mocks.rateLimit.mockResolvedValue({ limited: false, retryAfterMs: 0 });
  mocks.getThreadMessages.mockResolvedValue([]);
  mocks.buildProviderMessages.mockReturnValue([{ role: 'system', content: 'x' }]);
  mocks.getQuotaSnapshot.mockResolvedValue({ used: 1, limit: 5, remaining: 4 });
  mocks.reserveQuestion.mockResolvedValue({
    ok: true,
    messageId: 99,
    quota: { used: 1, limit: 5, remaining: 4 },
    reused: false,
  });
  mocks.markUserMessageOk.mockResolvedValue(undefined);
  mocks.markUserMessageFailed.mockResolvedValue(undefined);
  mocks.insertAssistantMessage.mockResolvedValue(100);
  mocks.stream.mockResolvedValue({
    text: 'คำตอบ',
    usage: { inputTokens: 10, outputTokens: 20, model: 'test-model', latencyMs: 100 },
  });
  stubQuestionRow();
});

describe('POST /api/ai-tutor — 401/403', () => {
  it('ไม่ล็อกอิน → 401', async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof() });
    expect(res.status).toBe(401);
  });

  it('ไม่ผ่าน feature flag → 403', async () => {
    mocks.enabled.mockResolvedValue(false);
    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof() });
    expect(res.status).toBe(403);
  });

  it('ไม่มี proof → 403 (ยังไม่ได้ตอบข้อนี้)', async () => {
    const res = await post({ questionId: 7, message: 'ทำไม', proof: 'ไม่มี' });
    expect(res.status).toBe(403);
  });

  it('proof ของข้ออื่น → 403', async () => {
    const proof = issueAnswerProof({ userId: 'u1', questionId: 99, selectedAnswer: 'do' })!;
    const res = await post({ questionId: 7, message: 'ทำไม', proof });
    expect(res.status).toBe(403);
  });

  it('ข้อความยาวเกิน 500 ตัวอักษร → 400', async () => {
    const res = await post({ questionId: 7, message: 'x'.repeat(501), proof: validProof() });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/ai-tutor — โควตา', () => {
  it('โควตาข้อนี้หมด → 429 พร้อมตัวเลขโควตา', async () => {
    mocks.reserveQuestion.mockResolvedValue({
      ok: false,
      reason: 'quota',
      quota: { used: 5, limit: 5, remaining: 0 },
    });
    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof() });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.quota).toEqual({ used: 5, limit: 5, remaining: 0 });
    expect(mocks.stream).not.toHaveBeenCalled();
  });

  it('เพดานซ่อนรายวันของผู้เรียนเต็ม → 429', async () => {
    mocks.rateLimit.mockResolvedValue({ limited: true, retryAfterMs: 1000 });
    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof() });
    expect(res.status).toBe(429);
    expect(mocks.reserveQuestion).not.toHaveBeenCalled();
  });
});

describe('POST /api/ai-tutor — history มาจาก DB เท่านั้น', () => {
  it('ดึงเธรดจาก DB และสร้าง provider messages เอง (ไม่รับ history จาก client)', async () => {
    mocks.getThreadMessages.mockResolvedValue([
      { id: 1, role: 'user', content: 'คำถามก่อนหน้า', status: 'ok', createdAt: new Date() },
      { id: 2, role: 'assistant', content: 'คำตอบก่อนหน้า', status: 'ok', createdAt: new Date() },
    ]);

    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof() });
    await readEvents(res);

    expect(mocks.getThreadMessages).toHaveBeenCalledWith({ userId: 'u1', questionId: 7 });
    const built = mocks.buildProviderMessages.mock.calls[0][0] as {
      thread: unknown[];
      context: { correctAnswerText: string; explanation: string | null };
      learnerMessage: string;
    };
    expect(built.thread).toHaveLength(2);
    expect(built.context.correctAnswerText).toBe('do');
    expect(built.context.explanation).toBe('หลัง do ต้องตามด้วยกริยาช่อง 1');
    expect(built.learnerMessage).toBe('ทำไม');
  });

  it('client ส่ง history มาเอง → 400 (zod strict)', async () => {
    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), history: [{ role: 'user', content: 'หลอด' }] });
    expect(res.status).toBe(400);
    expect(mocks.getThreadMessages).not.toHaveBeenCalled();
  });

  it('ไม่พบข้อใน DB → 404', async () => {
    stubQuestionRow(null);
    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof() });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/ai-tutor — stream + บันทึก', () => {
  it('ส่ง delta ทีละก้อนแล้วจบด้วย done', async () => {
    mocks.stream.mockImplementation(async ({ onDelta }: { onDelta: (text: string) => void }) => {
      onDelta('คำ');
      onDelta('ตอบ');
      return { text: 'คำตอบ', usage: { inputTokens: 1, outputTokens: 2, model: 'm', latencyMs: 5 } };
    });

    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof() });
    const events = await readEvents(res);
    expect(events[0]).toEqual({ type: 'delta', text: 'คำ' });
    expect(events.some((event) => event.type === 'done')).toBe(true);
    expect(mocks.markUserMessageOk).toHaveBeenCalled();
    expect(mocks.insertAssistantMessage).toHaveBeenCalled();
    expect(mocks.markUserMessageFailed).not.toHaveBeenCalled();
  });

  it('โมเดลล้มเหลวก่อนมีเนื้อหา → คืนโควตา (mark failed) + ส่ง error', async () => {
    mocks.stream.mockRejectedValue(new Error('provider down'));

    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof() });
    const events = await readEvents(res);
    expect(events.some((event) => event.type === 'error')).toBe(true);
    expect(mocks.markUserMessageFailed).toHaveBeenCalledWith({ messageId: 99 });
    expect(mocks.insertAssistantMessage).not.toHaveBeenCalled();
  });
});
