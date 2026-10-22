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
  minuteLimit: vi.fn(),
  reserveQuestion: vi.fn(),
  getQuotaSnapshot: vi.fn(),
  getDailyQuotaSnapshot: vi.fn(),
  countSystemDailyQuestions: vi.fn(),
  getAiTutorConfig: vi.fn(),
  getThreadMessages: vi.fn(),
  getThreadFeedback: vi.fn(),
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
vi.mock('@/lib/api-security', () => ({ validateOrigin: () => null, checkUserRateLimit: mocks.minuteLimit }));
vi.mock('@/lib/ai-tutor/quota', () => ({
  reserveQuestion: mocks.reserveQuestion,
  getDailyQuotaSnapshot: mocks.getDailyQuotaSnapshot,
  countSystemDailyQuestions: mocks.countSystemDailyQuestions,
  questionQuotaLimit: () => 5,
  userDailyLimit: () => 50,
  systemDailyLimit: () => 10_000,
}));
// ค่าโควตาจริงมาจาก config (DB ทับ env) — ไม่ใช่ค่า env ตรง ๆ
// (ถ้า route ไปอ่าน env เอง ค่าที่ผู้ดูแลตั้งในหน้า admin จะไม่มีผล)
vi.mock('@/lib/ai-tutor/config', () => ({
  getAiTutorConfig: mocks.getAiTutorConfig,
}));
vi.mock('@/lib/ai-tutor/messages', () => ({
  getThreadMessages: mocks.getThreadMessages,
  getThreadFeedback: mocks.getThreadFeedback,
  buildProviderMessages: mocks.buildProviderMessages,
  markUserMessageOk: mocks.markUserMessageOk,
  markUserMessageFailed: mocks.markUserMessageFailed,
  insertAssistantMessage: mocks.insertAssistantMessage,
}));
vi.mock('@/lib/ai-tutor/provider', () => ({
  streamAiTutorReply: mocks.stream,
  aiTutorTimeoutMs: () => 30_000,
  AiTutorProviderError: class AiTutorProviderError extends Error {
    constructor(public status: number, message: string, public reason: string = 'unknown') {
      super(message);
      this.name = 'AiTutorProviderError';
    }
  },
}));

import { POST, GET } from './route';
import { issueAnswerProof } from '@/lib/ai-tutor/proof';
import { AiTutorProviderError } from '@/lib/ai-tutor/provider';
import type { AiTutorFailureReason } from '@/lib/ai-tutor/errors';

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

/** รหัสรอบการทำข้อสอบ (UUID-like) — ใช้แยกบทสนทนาต่อรอบ */
const ATTEMPT_KEY = 'attempt-key-0001';
const OTHER_ATTEMPT_KEY = 'attempt-key-0002';

async function readEvents(response: Response) {
  const text = await response.text();
  return text
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => JSON.parse(line.slice(5).trim()));
}

beforeEach(() => {
  // reset (ไม่ใช่ clear) เพื่อล้าง implementation ที่ค้างจากเคสก่อนหน้า
  // เช่น rateLimit ที่เคย mock เป็น "limited" — ถ้าไม่ reset เคสถัดไปจะได้ 429 ทั้งที่ตั้งใจไม่ให้
  vi.resetAllMocks();
  process.env.AI_TUTOR_PROOF_SECRET = 'route-test-secret';
  mocks.auth.mockResolvedValue({ user: { id: 'u1' } });
  mocks.enabled.mockResolvedValue(true);
  mocks.rateLimit.mockResolvedValue({ limited: false, retryAfterMs: 0 });
  mocks.minuteLimit.mockResolvedValue(null);
  mocks.getThreadMessages.mockResolvedValue([]);
  mocks.getThreadFeedback.mockResolvedValue({});
  mocks.buildProviderMessages.mockReturnValue([{ role: 'system', content: 'x' }]);
  mocks.getQuotaSnapshot.mockResolvedValue({ used: 1, limit: 5, remaining: 4 });
  // ตัวเลขโควตาที่ส่งให้ client = เพดานรายวันของผู้เรียน
  mocks.getDailyQuotaSnapshot.mockResolvedValue({ used: 2, limit: 100, remaining: 98 });
  // ตัวนับโควตารวมทั้งระบบจาก SQL (ตาข่ายที่สองเมื่อ Redis ล่ม)
  mocks.countSystemDailyQuestions.mockResolvedValue(10);
  // config = DB ทับ env (ผู้ดูแลตั้งในหน้า admin) — ค่าโควตาจริงต้องมาจากตรงนี้
  mocks.getAiTutorConfig.mockResolvedValue({
    questionQuota: 10,
    userDailyLimit: 100,
    systemDailyLimit: 10_000,
  });
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
    finishReason: 'stop',
    ttftMs: 42,
    fallbackUsed: false,
    fallbackReason: null,
    usage: { inputTokens: 10, outputTokens: 20, reasoningTokens: 5, model: 'test-model', latencyMs: 100 },
  });
  stubQuestionRow();
});

describe('POST /api/ai-tutor — 401/403', () => {
  it('ไม่ล็อกอิน → 401', async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    expect(res.status).toBe(401);
  });

  it('ไม่ผ่าน feature flag → 403', async () => {
    mocks.enabled.mockResolvedValue(false);
    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    expect(res.status).toBe(403);
  });

  it('ไม่มี proof → 403 (ยังไม่ได้ตอบข้อนี้)', async () => {
    const res = await post({ questionId: 7, message: 'ทำไม', proof: 'ไม่มี', attemptKey: ATTEMPT_KEY });
    expect(res.status).toBe(403);
  });

  it('proof ของข้ออื่น → 403', async () => {
    const proof = issueAnswerProof({ userId: 'u1', questionId: 99, selectedAnswer: 'do' })!;
    const res = await post({ questionId: 7, message: 'ทำไม', proof, attemptKey: ATTEMPT_KEY });
    expect(res.status).toBe(403);
  });

  it('ไม่ได้ส่ง proof → 400 พร้อมข้อความว่ายังไม่ได้ส่งหลักฐาน (ไม่ใช่ "ไม่ถูกต้อง")', async () => {
    const res = await post({ questionId: 7, message: 'ทำไม', attemptKey: ATTEMPT_KEY });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('ยังไม่ได้ส่งหลักฐานการตอบคำถาม');
  });

  it('ระบบยังไม่ได้ตั้ง AI_TUTOR_PROOF_SECRET → 503 พร้อมข้อความกลางๆ (ไม่โทษผู้เรียน)', async () => {
    // จำลอง: ออก proof ตอนที่ secret ยังอยู่ แล้ว secret หายไป (restart ไม่ได้ตั้ง/โหลดไม่ครบ)
    const proof = validProof();
    delete process.env.AI_TUTOR_PROOF_SECRET;
    const res = await post({ questionId: 7, message: 'ทำไม', proof, attemptKey: ATTEMPT_KEY });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('ระบบ AI Tutor ยังไม่พร้อมให้บริการชั่วคราว กรุณาลองใหม่อีกครั้ง');
    expect(mocks.stream).not.toHaveBeenCalled();
  });

  it('proof ไม่ถูกต้อง → 403 พร้อมข้อความให้กดตรวจคำตอบใหม่', async () => {
    const res = await post({ questionId: 7, message: 'ทำไม', proof: 'not-a-proof', attemptKey: ATTEMPT_KEY });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('ตรวจคำตอบ');
  });

  it('proof หมดอายุ → 403 พร้อมข้อความหมดอายุ', async () => {
    const expired = issueAnswerProof({
      userId: 'u1',
      questionId: 7,
      selectedAnswer: 'do',
      now: Date.now() - 25 * 60 * 60 * 1000,
    })!;
    const res = await post({ questionId: 7, message: 'ทำไม', proof: expired, attemptKey: ATTEMPT_KEY });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('หมดอายุ');
  });

  it('ข้อความยาวเกิน 500 ตัวอักษร → 400', async () => {
    const res = await post({ questionId: 7, message: 'x'.repeat(501), proof: validProof(), attemptKey: ATTEMPT_KEY });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/ai-tutor — โควตา', () => {
  it('โควตาข้อนี้หมด → 429 พร้อมตัวเลขโควตาตามเพดานรายวัน (ข้อความบอกโควตาของข้อนี้)', async () => {
    mocks.reserveQuestion.mockResolvedValue({
      ok: false,
      reason: 'quota',
      quota: { used: 5, limit: 5, remaining: 0 },
    });
    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    expect(res.status).toBe(429);
    const body = await res.json();
    // ตัวเลขที่ client แสดง = เพดานรายวัน (เหมือนตอนแสดงผลปกติ)
    expect(body.quota).toEqual({ used: 2, limit: 100, remaining: 98 });
    // ข้อความยังบอกว่าโควตาของ "ข้อนี้" หมด (พร้อมตัวเลขของข้อนี้)
    expect(body.error).toContain('โควตาคำถามของข้อนี้หมดแล้ว');
    expect(body.error).toContain('5/5');
    expect(mocks.stream).not.toHaveBeenCalled();
  });

  it('โควตาข้อนี้หมด → ไม่กินตัวนับรายวันด้วย (ไม่งั้นผู้เรียนเสียโควตาวันนี้เปล่า ๆ)', async () => {
    mocks.reserveQuestion.mockResolvedValue({
      ok: false,
      reason: 'quota',
      quota: { used: 5, limit: 5, remaining: 0 },
    });
    await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    expect(mocks.rateLimit).not.toHaveBeenCalled();
  });

  it('เพดานซ่อนรายวันของผู้เรียนเต็ม → 429', async () => {
    mocks.rateLimit.mockResolvedValue({ limited: true, retryAfterMs: 1000 });
    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    expect(res.status).toBe(429);
    // นับหลังจองโควตาแล้ว → ต้องคืนโควตาข้อนี้ (mark failed) และไม่เรียกโมเดล
    expect(mocks.markUserMessageFailed).toHaveBeenCalledWith(expect.objectContaining({ messageId: 99 }));
    expect(mocks.stream).not.toHaveBeenCalled();
  });
});

describe('POST /api/ai-tutor — จำกัดต่อนาที (10/นาที/คน)', () => {
  const limited = (retryAfter = '42') =>
    new Response(JSON.stringify({ success: false, error: 'Too many requests' }), {
      status: 429,
      headers: { 'Retry-After': retryAfter },
    });

  it('เรียก checkUserRateLimit ด้วยเพดาน 10 ครั้ง/นาที', async () => {
    await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    expect(mocks.minuteLimit).toHaveBeenCalledWith('u1', { keySuffix: 'ai-tutor:chat', maxRequests: 10 });
  });

  it('ถี่เกินไป → 429 พร้อม Retry-After และข้อความไทย (ไม่เรียกโมเดล)', async () => {
    mocks.minuteLimit.mockResolvedValue(limited('42'));
    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('42');
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('ถาม AI ถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง');
    expect(mocks.stream).not.toHaveBeenCalled();
    expect(mocks.reserveQuestion).not.toHaveBeenCalled();
  });

  it('ลำดับ: rate limit ต่อนาทีมาก่อน → ถ้าถูกปฏิเสธ ต้องไม่นับโควตารวมทั้งระบบด้วย SQL', async () => {
    mocks.minuteLimit.mockResolvedValue(limited('42'));

    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });

    expect(res.status).toBe(429);
    // ไม่แตะฐานข้อมูลเลย: ไม่นับเพดานรวม ไม่จองโควตา ไม่ยิงโมเดล
    expect(mocks.countSystemDailyQuestions).not.toHaveBeenCalled();
    expect(mocks.reserveQuestion).not.toHaveBeenCalled();
    expect(mocks.stream).not.toHaveBeenCalled();
  });
});

describe('POST /api/ai-tutor — history มาจาก DB เท่านั้น', () => {
  it('ดึงเธรดจาก DB และสร้าง provider messages เอง (ไม่รับ history จาก client)', async () => {
    mocks.getThreadMessages.mockResolvedValue([
      { id: 1, role: 'user', content: 'คำถามก่อนหน้า', status: 'ok', createdAt: new Date() },
      { id: 2, role: 'assistant', content: 'คำตอบก่อนหน้า', status: 'ok', createdAt: new Date() },
    ]);

    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    await readEvents(res);

    expect(mocks.getThreadMessages).toHaveBeenCalledWith({ userId: 'u1', questionId: 7, attemptKey: ATTEMPT_KEY });
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
    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/ai-tutor — รหัสรอบการทำข้อสอบ (attemptKey)', () => {
  it('ส่ง attemptKey ไปกับการจองโควตาและการโหลดประวัติ', async () => {
    await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    await readEvents(await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY }));

    expect(mocks.reserveQuestion).toHaveBeenCalledWith(expect.objectContaining({ attemptKey: ATTEMPT_KEY }));
    expect(mocks.getThreadMessages).toHaveBeenCalledWith(expect.objectContaining({ attemptKey: ATTEMPT_KEY }));
  });

  it('แต่ละรอบแยกเธรดกัน (คนละ attemptKey ไม่เห็นเธรดของกัน)', async () => {
    await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: OTHER_ATTEMPT_KEY });

    const keys = mocks.getThreadMessages.mock.calls.map((call) => (call[0] as { attemptKey?: string }).attemptKey);
    expect(keys).toContain(ATTEMPT_KEY);
    expect(keys).toContain(OTHER_ATTEMPT_KEY);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it('ไม่ส่ง attemptKey → 400 (บอกให้รีเฟรชหน้า)', async () => {
    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof() });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('รหัสรอบการทำข้อสอบ');
    expect(body.error).toContain('รีเฟรชหน้า');
    // ไม่เผยชื่อ field ภายในของ API ให้ผู้เรียน
    expect(body.error).not.toContain('attemptKey');
    expect(mocks.reserveQuestion).not.toHaveBeenCalled();
  });

  it('attemptKey รูปแบบผิด → 400', async () => {
    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: 'สั้น' });
    expect(res.status).toBe(400);
    expect(mocks.reserveQuestion).not.toHaveBeenCalled();
  });

  it('attemptKey ยาวเกิน 64 ตัว → 400', async () => {
    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: 'a'.repeat(65) });
    expect(res.status).toBe(400);
  });

  it('GET: ไม่ส่ง attemptKey → 400', async () => {
    const res = await GET(new Request('http://localhost:3000/api/ai-tutor?questionId=7'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('รหัสรอบการทำข้อสอบ');
    expect(body.error).not.toContain('attemptKey');
    expect(mocks.getThreadMessages).not.toHaveBeenCalled();
  });

  it('GET: attemptKey รูปแบบผิด → 400', async () => {
    const res = await GET(new Request('http://localhost:3000/api/ai-tutor?questionId=7&attemptKey=bad%20key!'));
    expect(res.status).toBe(400);
    expect(mocks.getThreadMessages).not.toHaveBeenCalled();
  });

  it('GET: ส่ง attemptKey ที่ถูกต้อง → โหลดเธรดของรอบนั้น', async () => {
    const res = await GET(new Request(`http://localhost:3000/api/ai-tutor?questionId=7&attemptKey=${ATTEMPT_KEY}`));
    expect(res.status).toBe(200);
    expect(mocks.getThreadMessages).toHaveBeenCalledWith({ userId: 'u1', questionId: 7, attemptKey: ATTEMPT_KEY });
  });
});

describe('โควตาต้องมาจาก config (DB ทับ env) — ไม่ใช่ค่า env ตรง ๆ', () => {
  // บั๊ก: ผู้ดูแลตั้ง questionQuota = 10 ในหน้า admin แต่โค้ดอ่าน env ตรง ๆ
  // → ได้ค่าเริ่มต้น 5 (และเพดานรายวัน/ทั้งระบบก็ถูกลดตาม env ด้วย)
  it('POST: จองโควตาด้วย limit จาก config', async () => {
    await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });

    expect(mocks.reserveQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, questionId: 7 }),
    );
  });

  it('GET: ส่งตัวเลขโควตาตามเพดานรายวันของผู้เรียน (userDailyLimit)', async () => {
    const res = await GET(new Request(`http://localhost:3000/api/ai-tutor?questionId=7&attemptKey=${ATTEMPT_KEY}`));
    const body = await res.json();

    expect(mocks.getDailyQuotaSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100, userId: 'u1' }),
    );
    // ตัวเลขที่ client แสดง = รายวัน (ไม่ใช่ต่อข้อ)
    expect(body.quota).toEqual({ used: 2, limit: 100, remaining: 98 });
  });

  it('เพดานต่อผู้เรียน/วัน (SQL) และทั้งระบบ/วัน (Redis) ใช้ค่าจาก config', async () => {
    await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });

    // เพดานรายวันของผู้เรียน บังคับด้วย SQL ใน reserveQuestion (ไม่ใช้ Redis แล้ว)
    expect(mocks.reserveQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ dailyLimit: 100, limit: 10 }),
    );

    // เพดานรวมทั้งระบบ/วัน ยังใช้ Redis (kill switch) + SQL ตาข่ายที่สอง
    const calls = mocks.rateLimit.mock.calls as Array<[string, { maxRequests: number }]>;
    expect(calls.find(([key]) => key.includes('system:'))?.[1].maxRequests).toBe(10_000);
    // ไม่มีการเรียก Redis ต่อผู้เรียน/วันอีกแล้ว (คีย์เดิมคือ user:<id>:ai-tutor:day)
    expect(calls.find(([key]) => key.startsWith('user:'))).toBeUndefined();
  });
});

describe('POST/GET /api/ai-tutor — ฐานข้อมูลใช้ไม่ได้ → 503 (ไม่ใช่ 500)', () => {
  it('POST: คิวรี DB พัง → 503 พร้อมข้อความที่ผู้เรียนอ่านรู้เรื่อง', async () => {
    mocks.select.mockImplementation(() => { throw new Error('relation "ai_tutor_messages" does not exist'); });

    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('ระบบ AI Tutor ยังไม่พร้อมให้บริการชั่วคราว กรุณาลองใหม่อีกครั้ง');
    expect(mocks.stream).not.toHaveBeenCalled();
  });

  it('GET: อ่านเธรดไม่สำเร็จ → 503 (หน้าเว็บไม่ค้าง)', async () => {
    mocks.getThreadMessages.mockRejectedValue(new Error('relation "ai_tutor_messages" does not exist'));

    const res = await GET(new Request('http://localhost:3000/api/ai-tutor?questionId=7&attemptKey=attempt-key-0001'));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('ระบบ AI Tutor ยังไม่พร้อมให้บริการชั่วคราว กรุณาลองใหม่อีกครั้ง');
  });
});

describe('POST /api/ai-tutor — stream + บันทึก', () => {
  it('ส่ง delta ทีละก้อนแล้วจบด้วย done', async () => {
    mocks.stream.mockImplementation(async ({ onDelta }: { onDelta: (text: string) => void }) => {
      onDelta('คำ');
      onDelta('ตอบ');
      return { text: 'คำตอบ', usage: { inputTokens: 1, outputTokens: 2, model: 'm', latencyMs: 5 } };
    });

    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    const events = await readEvents(res);
    expect(events[0]).toEqual({ type: 'delta', text: 'คำ' });
    expect(events.some((event) => event.type === 'done')).toBe(true);
    expect(mocks.markUserMessageOk).toHaveBeenCalled();
    expect(mocks.insertAssistantMessage).toHaveBeenCalled();
    expect(mocks.markUserMessageFailed).not.toHaveBeenCalled();
  });

  it('โมเดลล้มเหลวก่อนมีเนื้อหา → คืนโควตา (mark failed) + ส่ง error', async () => {
    mocks.stream.mockRejectedValue(new Error('provider down'));

    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    const events = await readEvents(res);
    expect(events.some((event) => event.type === 'error')).toBe(true);
    expect(mocks.markUserMessageFailed).toHaveBeenCalledWith(expect.objectContaining({ messageId: 99 }));
    expect(mocks.insertAssistantMessage).not.toHaveBeenCalled();
  });

  it('ข้อความที่ผู้เรียนเห็นเป็นข้อความกลางๆ — ไม่มีรายละเอียดดิบจาก provider หลุดไป', async () => {
    const rawDetail = 'OpenRouter 500 — provider-secret-detail-xyz';
    const learnerMessage = 'คำถามลับของผู้เรียนที่ห้ามไปโผล่ใน log';
    mocks.stream.mockRejectedValue(new AiTutorProviderError(500, rawDetail, 'server-error'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const res = await post({ questionId: 7, message: learnerMessage, proof: validProof(), attemptKey: ATTEMPT_KEY });
    const events = await readEvents(res);
    const errorEvent = events.find((event) => event.type === 'error') as { error?: string } | undefined;

    expect(errorEvent?.error).toBeTruthy();
    expect(errorEvent?.error).not.toContain('provider-secret-detail-xyz');
    expect(errorEvent?.error).not.toContain('OpenRouter');
    expect(errorEvent?.error).toContain('ระบบ AI');

    // log ฝั่ง server: มี status code + รายละเอียดที่ redact แล้ว แต่ไม่มีเนื้อหาข้อความผู้เรียน
    const logged = warn.mock.calls.map((call) => String(call[0])).join('\n');
    expect(logged).toContain('500');
    expect(logged).not.toContain(learnerMessage);
    warn.mockRestore();
  });

  it('แต่ละประเภทความล้มเหลว → ข้อความกลางๆ ที่ต่างกัน', async () => {
    const cases: Array<[AiTutorFailureReason, string]> = [
      ['rate-limit', 'หนาแน่น'],
      ['timeout', 'ใช้เวลานาน'],
      ['empty', 'ไม่ได้ส่งคำตอบกลับมา'],
      ['client-error', 'ไม่สามารถให้บริการคำถามนี้ได้'],
      ['config', 'ยังไม่ได้ตั้งค่า'],
    ];

    for (const [reason, expected] of cases) {
      mocks.stream.mockRejectedValue(new AiTutorProviderError(500, 'รายละเอียดดิบจาก provider', reason));
      const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
      const events = await readEvents(res);
      const errorEvent = events.find((event) => event.type === 'error') as { error?: string } | undefined;
      expect(errorEvent?.error, reason).toContain(expected);
      expect(errorEvent?.error, reason).not.toContain('รายละเอียดดิบ');
      // 429 ของ provider ต้องไม่ถูกแสดงเป็น "โควตาของผู้เรียนหมด"
      if (reason === 'rate-limit') {
        expect(errorEvent?.error).not.toContain('โควตา');
        expect(errorEvent?.error).toContain('ระบบ AI');
      }
    }
  });

  it('บันทึกโมเดลที่ตอบจริง + เหตุการณ์ fallback ลง usage ที่ส่งให้ client', async () => {    mocks.stream.mockResolvedValue({
      text: 'คำตอบจากสำรอง',
      finishReason: 'stop',
      ttftMs: 120,
      fallbackUsed: true,
      fallbackReason: 'rate-limit',
      usage: { inputTokens: 11, outputTokens: 22, reasoningTokens: 7, model: 'fallback-model', latencyMs: 300 },
    });

    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    const events = await readEvents(res);
    const done = events.find((event) => event.type === 'done');
    expect(done?.usage).toMatchObject({
      model: 'fallback-model',
      fallbackUsed: true,
      finishReason: 'stop',
      ttftMs: 120,
    });
    // โมเดลที่ตอบจริงถูกบันทึกลงคอลัมน์ model
    expect(mocks.insertAssistantMessage).toHaveBeenCalledWith(expect.objectContaining({ model: 'fallback-model' }));
    // การสลับไม่เพิ่มโควตา — จองแค่ครั้งเดียว
    expect(mocks.reserveQuestion).toHaveBeenCalledTimes(1);
  });

  it('คำตอบถูกตัด (finish_reason = length) → ตัดที่ประโยคสมบูรณ์สุดท้ายก่อนบันทึกลง DB และส่งฉบับเดียวกันให้ client', async () => {
    mocks.stream.mockResolvedValue({
      text: 'ประโยคแรกที่จบแล้ว ประโยคที่สองก็จบนะ ประโยคที่ถูกตัดค้าง',
      finishReason: 'length',
      ttftMs: 100,
      fallbackUsed: false,
      fallbackReason: null,
      usage: { inputTokens: 10, outputTokens: 20, reasoningTokens: 5, model: 'test-model', latencyMs: 100 },
    });

    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    const events = await readEvents(res);
    const done = events.find((event) => event.type === 'done');

    // ข้อความที่บันทึกลง DB ต้องเป็นฉบับที่ตัดแล้วเหมือนกัน
    const saved = mocks.insertAssistantMessage.mock.calls[0][0] as { content: string };
    expect(saved.content).toBe('ประโยคแรกที่จบแล้ว ประโยคที่สองก็จบนะ');
    // client ได้ฉบับเดียวกัน
    expect((done as { text?: string }).text).toBe(saved.content);
  });

  it('เพดานรวมทั้งระบบเต็ม (kill switch) → 429', async () => {
    mocks.rateLimit.mockImplementation(async (key: string) => (
      key.startsWith('system:') ? { limited: true, retryAfterMs: 1000 } : { limited: false, retryAfterMs: 0 }
    ));
    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    expect(res.status).toBe(429);
    // คืนโควตาข้อนี้ด้วย (ไม่ให้ผู้เรียนเสียสิทธิ์เพราะระบบเต็ม) + ไม่เรียกโมเดล
    expect(mocks.markUserMessageFailed).toHaveBeenCalledWith(expect.objectContaining({ messageId: 99 }));
    expect(mocks.stream).not.toHaveBeenCalled();
  });

  // ─── เพดานต้นทุนรวมทั้งระบบ/วัน: ต้องมี SQL เป็นตาข่ายที่สอง (Redis ล่ม = fail-open) ───
  it('Redis ปล่อยผ่าน (fail-open) แต่ SQL นับว่าเกินเพดานรวมทั้งระบบ → 429 (ก่อนจองโควตา)', async () => {
    // Redis ตอบว่าไม่ limited (จำลอง Redis ล่ม/ช้า → fail-open)
    mocks.rateLimit.mockResolvedValue({ limited: false, retryAfterMs: 0 });
    // SQL นับได้ว่าเกินเพดานรวมทั้งระบบ (cap = 10_000)
    mocks.countSystemDailyQuestions.mockResolvedValue(10_000);

    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain('ระบบถาม AI ได้เต็มโควตาของวันนี้แล้ว');
    expect(mocks.stream).not.toHaveBeenCalled();
    // เช็คก่อนจองโควตา → ไม่มี insert แถว pending และไม่ต้อง update เป็น failed
    expect(mocks.reserveQuestion).not.toHaveBeenCalled();
    expect(mocks.markUserMessageFailed).not.toHaveBeenCalled();
  });

  it('ขอบเขต: นับได้ cap-1 → ผ่าน (ยิงโมเดลได้) · นับได้ cap → ปฏิเสธ 429', async () => {
    // cap = 10_000 · เกณฑ์เทียบคือ >= → ขอสุดท้ายที่ยังไม่เต็ม (cap-1) ต้องผ่าน
    mocks.rateLimit.mockResolvedValue({ limited: false, retryAfterMs: 0 });
    mocks.countSystemDailyQuestions.mockResolvedValue(10_000 - 1);
    mocks.stream.mockResolvedValue({
      text: 'คำตอบ',
      finishReason: 'stop',
      ttftMs: 10,
      fallbackUsed: false,
      fallbackReason: null,
      usage: { inputTokens: 1, outputTokens: 2, reasoningTokens: 0, model: 'm', latencyMs: 10 },
    });

    const lastAllowed = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    await lastAllowed.text();
    expect(lastAllowed.status).toBe(200);
    expect(mocks.stream).toHaveBeenCalled();

    // ขอแรกที่เต็มพอดี (นับได้ = cap) → ต้องถูกปฏิเสธ
    mocks.stream.mockClear();
    mocks.countSystemDailyQuestions.mockResolvedValue(10_000);
    const firstRejected = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    expect(firstRejected.status).toBe(429);
    expect(mocks.stream).not.toHaveBeenCalled();
  });

  it('นับโควตารวมทั้งระบบด้วย SQL ไม่ได้ → fail-closed (503 ไม่ยิงโมเดล ไม่จองโควตา)', async () => {
    mocks.countSystemDailyQuestions.mockRejectedValue(new Error('relation "ai_tutor_messages" does not exist'));

    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBeTruthy();
    // ไม่เผยรายละเอียดภายในของ error
    expect(JSON.stringify(body)).not.toContain('ai_tutor_messages');
    expect(mocks.stream).not.toHaveBeenCalled();
    // เช็คก่อนจองโควตา → ยังไม่มีแถวให้คืน และผู้เรียนไม่เสียโควตา
    expect(mocks.reserveQuestion).not.toHaveBeenCalled();
    expect(mocks.markUserMessageFailed).not.toHaveBeenCalled();
  });

  it('ปกติ: Redis ผ่าน + SQL ไม่เกินเพดาน → เรียกโมเดลได้', async () => {
    mocks.rateLimit.mockResolvedValue({ limited: false, retryAfterMs: 0 });
    mocks.countSystemDailyQuestions.mockResolvedValue(5);
    mocks.stream.mockResolvedValue({
      text: 'คำตอบ',
      finishReason: 'stop',
      ttftMs: 10,
      fallbackUsed: false,
      fallbackReason: null,
      usage: { inputTokens: 1, outputTokens: 2, reasoningTokens: 0, model: 'm', latencyMs: 10 },
    });

    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    await res.text();
    expect(res.status).toBe(200);
    expect(mocks.stream).toHaveBeenCalled();
  });

  it('เพดานรวมทั้งระบบที่ตั้งใน DB (systemDailyLimit) ถูกใช้กับ rateLimit + ข้อความ 429 ถูกต้อง', async () => {
    // ค่าใน DB = 7 (ไม่ใช่ค่า env) → rateLimit ต้องถูกเรียกด้วย maxRequests 7
    mocks.getAiTutorConfig.mockResolvedValue({
      questionQuota: 10,
      userDailyLimit: 100,
      systemDailyLimit: 7,
    });
    // SQL ยังไม่เกินเพดาน → ถึงจะไปถึงขั้น Redis
    mocks.countSystemDailyQuestions.mockResolvedValue(1);
    mocks.rateLimit.mockImplementation(async (key: string) => (
      key.startsWith('system:') ? { limited: true, retryAfterMs: 1000 } : { limited: false, retryAfterMs: 0 }
    ));

    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain('ระบบถาม AI ได้เต็มโควตาของวันนี้แล้ว');

    const calls = mocks.rateLimit.mock.calls as Array<[string, { maxRequests: number }]>;
    const systemCall = calls.find(([key]) => key.includes('system:'));
    expect(systemCall?.[1].maxRequests).toBe(7);
    // คืนโควตาข้อนี้ (ผู้เรียนไม่เสียสิทธิ์เพราะระบบเต็ม)
    expect(mocks.markUserMessageFailed).toHaveBeenCalled();
  });

  it('บันทึก selected_answer + is_correct ที่แถวผู้เรียน (คำนวณจากเฉลยใน DB และคำตอบใน proof)', async () => {
    // คำตอบใน proof = 'do' และเฉลยใน DB (option B) = 'do' → ถูก
    mocks.stream.mockResolvedValue({
      text: 'คำตอบ',
      finishReason: 'stop',
      ttftMs: 50,
      fallbackUsed: false,
      fallbackReason: null,
      usage: { inputTokens: 1, outputTokens: 2, reasoningTokens: 0, model: 'm', latencyMs: 10 },
    });

    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    await res.text(); // รอให้ stream ของ route ทำงานจนจบ
    const saved = mocks.markUserMessageOk.mock.calls[0][0] as { selectedAnswer: string; isCorrect: boolean };
    expect(saved.selectedAnswer).toBe('do');
    expect(saved.isCorrect).toBe(true);
  });

  it('บันทึก fallback_used + finish_reason ที่แถว assistant', async () => {
    mocks.stream.mockResolvedValue({
      text: 'คำตอบจากสำรอง',
      finishReason: 'length',
      ttftMs: 80,
      fallbackUsed: true,
      fallbackReason: 'rate-limit',
      usage: { inputTokens: 1, outputTokens: 2, reasoningTokens: 3, model: 'fallback-model', latencyMs: 20 },
    });

    const res = await post({ questionId: 7, message: 'ทำไม', proof: validProof(), attemptKey: ATTEMPT_KEY });
    // อ่าน body ให้ stream ของ route ทำงานจนจบก่อน (route ตอบเป็น ReadableStream)
    await res.text();
    const saved = mocks.insertAssistantMessage.mock.calls[0][0] as {
      fallbackUsed: boolean; finishReason: string; model: string;
    };
    expect(saved.fallbackUsed).toBe(true);
    expect(saved.finishReason).toBe('length');
    expect(saved.model).toBe('fallback-model');
  });
});
