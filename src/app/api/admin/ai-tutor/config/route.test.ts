/**
 * API ฝั่งแอดมินของ AI Tutor — ทุก endpoint ต้องตรวจ isAdmin ฝั่ง server
 * (401 ไม่ล็อกอิน / 403 ไม่ใช่แอดมิน) และ PUT ต้อง validate ก่อนเขียน
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  rateLimit: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  findModel: vi.fn(),
  fetchModels: vi.fn(),
  streamAiTutorReply: vi.fn(),
}));

vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/api-security', () => ({ checkUserRateLimit: mocks.rateLimit }));
vi.mock('@/db', () => ({
  db: { select: mocks.select, insert: mocks.insert, delete: mocks.delete, update: mocks.update },
}));
vi.mock('@/lib/ai-tutor/provider', () => ({ streamAiTutorReply: mocks.streamAiTutorReply }));
vi.mock('@/lib/ai-tutor/models', () => ({
  findModel: mocks.findModel,
  fetchOpenRouterModels: mocks.fetchModels,
  sortModelsForAdmin: (models: unknown[]) => models,
}));

import { GET as GET_CONFIG, PUT as PUT_CONFIG } from './route';
import { getAiTutorConfig } from '@/lib/ai-tutor/config';
import { GET as GET_MODELS } from '../models/route';
import { POST as POST_MODEL_TEST } from '../models/test/route';
import { GET as GET_AUDIT } from '../audit/route';

function unauthorized() {
  return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function forbidden() {
  return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** ค่าที่ถูก insert (เก็บจาก .values() เพราะ db.insert() รับ table เป็น argument แรก) */
let inserted: Array<Record<string, unknown>> = [];
const insertedValues = () => inserted;

function stubDb() {
  inserted = [];
  mocks.select.mockImplementation(() => {
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.orderBy = vi.fn(() => chain);
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve([]).then(resolve);
    return chain;
  });
  const insertChain: Record<string, unknown> = {};
  insertChain.values = vi.fn((values: unknown) => {
    inserted.push(values as Record<string, unknown>);
    return insertChain;
  });
  insertChain.onConflictDoUpdate = vi.fn(() => insertChain);
  insertChain.returning = vi.fn(() => insertChain);
  mocks.insert.mockReturnValue(insertChain);

  const deleteChain: Record<string, unknown> = {};
  deleteChain.where = vi.fn(() => deleteChain);
  mocks.delete.mockReturnValue(deleteChain);
  const updateChain: Record<string, unknown> = {};
  updateChain.set = vi.fn(() => updateChain);
  updateChain.where = vi.fn(() => updateChain);
  mocks.update.mockReturnValue(updateChain);
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AI_TUTOR_ENABLED = 'true';
  mocks.requireAdmin.mockResolvedValue({ error: null, session: { user: { id: 'admin-1', email: 'a@b.c' } } });
  mocks.rateLimit.mockResolvedValue(null);
  mocks.findModel.mockResolvedValue(undefined);
  mocks.fetchModels.mockResolvedValue([]);
  stubDb();
});

describe('สิทธิ์ผู้ดูแล — ทุก endpoint', () => {
  const endpoints: Array<[string, () => Promise<Response>]> = [
    ['GET /config', () => GET_CONFIG()],
    ['PUT /config', () => PUT_CONFIG(new NextRequest('http://localhost/api/admin/ai-tutor/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionQuota: 3 }),
    }))],
    ['GET /models', () => GET_MODELS()],
    ['POST /models/test', () => POST_MODEL_TEST(new NextRequest('http://localhost/api/admin/ai-tutor/models/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'x/y' }),
    }))],
    ['GET /audit', () => GET_AUDIT(new NextRequest('http://localhost/api/admin/ai-tutor/audit'))],
  ];

  it('ไม่ล็อกอิน → 401 ทุก endpoint', async () => {
    mocks.requireAdmin.mockResolvedValue({ error: unauthorized(), session: null });
    for (const [name, call] of endpoints) {
      const res = await call();
      expect(res.status, name).toBe(401);
    }
  });

  it('ล็อกอินแต่ไม่ใช่แอดมิน → 403 ทุก endpoint', async () => {
    mocks.requireAdmin.mockResolvedValue({ error: forbidden(), session: null });
    for (const [name, call] of endpoints) {
      const res = await call();
      expect(res.status, name).toBe(403);
    }
  });
});

describe('GET /api/admin/ai-tutor/config', () => {
  it('คืนค่าที่ใช้งานจริง + ที่มาของแต่ละค่า + เพดานเวลา', async () => {
    const res = await GET_CONFIG();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.config).toHaveProperty('primaryModel');
    expect(body.data).toHaveProperty('sources');
    expect(body.data).toHaveProperty('envDefaults');
    expect(body.data.limits.maxTimeoutMs).toBe(30_000);
    expect(body.data.limits.note).toContain('maxDuration');
  });
});

describe('PUT /api/admin/ai-tutor/config', () => {
  it('ปฏิเสธค่าที่อยู่นอกช่วง → 400', async () => {
    const res = await PUT_CONFIG(new NextRequest('http://localhost/api/admin/ai-tutor/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionQuota: 999 }),
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeTruthy();
  });

  it('ปฏิเสธการตั้ง secret → 400', async () => {
    const res = await PUT_CONFIG(new NextRequest('http://localhost/api/admin/ai-tutor/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ AI_TUTOR_PROOF_SECRET: 'x' }),
    }));
    expect(res.status).toBe(400);
  });

  it('บันทึกสำเร็จ → เขียน audit และล้างแคช (อ่าน DB ใหม่ทันที)', async () => {
    // อ่านค่าก่อนหนึ่งครั้งให้แคชถูกเติม
    await GET_CONFIG();
    const beforePut = mocks.select.mock.calls.length;

    const res = await PUT_CONFIG(new NextRequest('http://localhost/api/admin/ai-tutor/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionQuota: 3 }),
    }));
    expect(res.status).toBe(200);
    // เขียนทั้ง settings และ audit
    expect(mocks.insert).toHaveBeenCalled();
    // ล้างแคชหลังบันทึก → ต้องอ่าน DB ใหม่ (นับ call เพิ่มขึ้น)
    expect(mocks.select.mock.calls.length).toBeGreaterThan(beforePut);
  });

  it('audit เก็บค่าที่ใช้งานจริง (effective รวมค่าจาก env) ก่อนเปลี่ยน', async () => {
    await PUT_CONFIG(new NextRequest('http://localhost/api/admin/ai-tutor/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionQuota: 3 }),
    }));
    const auditCall = insertedValues().find((values) => values.action === 'update_settings');
    expect(auditCall).toBeTruthy();
    const values = auditCall as unknown as { before: { effective: Record<string, unknown>; db: Record<string, unknown> } };
    // effective = ค่าที่ระบบใช้งานจริง (รวมค่าที่มาจาก env) ก่อนเปลี่ยน
    expect(values.before.effective).toHaveProperty('primaryModel');
    expect(values.before.effective).toHaveProperty('questionQuota');
    // db = ค่าที่ตั้งไว้ใน DB เดิม (ยังไม่มี = null)
    expect(values.before.db).toHaveProperty('questionQuota');
  });

  it('reset ลบค่าที่ตั้งใน DB → กลับไปใช้ค่าจาก env (ต่างจาก fallbackModel = null ที่แปลว่าปิด fallback)', async () => {
    const res = await PUT_CONFIG(new NextRequest('http://localhost/api/admin/ai-tutor/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reset: ['questionQuota'] }),
    }));
    expect(res.status).toBe(200);
    // ต้องลบแถวใน DB ของคีย์นั้น
    expect(mocks.delete).toHaveBeenCalled();
  });

  it('fallbackModel = null หมายถึง "ปิดโมเดลสำรอง" (ไม่ใช่คืนค่า env)', async () => {
    const res = await PUT_CONFIG(new NextRequest('http://localhost/api/admin/ai-tutor/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fallbackModel: null }),
    }));
    expect(res.status).toBe(200);
    const auditCall = insertedValues().find((values) => values.action === 'update_settings');
    const values = auditCall as unknown as { after: { effective: Record<string, unknown>; db: Record<string, unknown> } };
    expect(values.after.db.fallbackModel).toBeNull();
    expect(values.after.effective.fallbackModel).toBeNull();
  });

  it('ปฏิเสธโมเดลที่ราคาเกินเพดาน', async () => {
    mocks.findModel.mockResolvedValue({
      id: 'expensive/model', name: 'Expensive', pricing: { prompt: 99, completion: 99 },
      reasoningMandatory: false, supportedEfforts: ['low'], contextLength: 1000,
      overPriceLimit: true,
      supportsEffort: () => true,
    });
    const res = await PUT_CONFIG(new NextRequest('http://localhost/api/admin/ai-tutor/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ primaryModel: 'expensive/model' }),
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('ราคาเกินเพดาน');
  });

  it('envStatus มีแต่บูลีน (ไม่มีค่าลับของ secret)', async () => {
    const res = await GET_CONFIG();
    const body = await res.json();
    expect(body.data.envStatus).toEqual({
      openrouterKey: expect.any(Boolean),
      proofSecret: expect.any(Boolean),
      exportSalt: expect.any(Boolean),
      masterEnabled: expect.any(Boolean),
    });
    const serialized = JSON.stringify(body.data.envStatus);
    expect(serialized).not.toContain('sk-or-v1');
    expect(Object.values(body.data.envStatus).every((value) => typeof value === 'boolean')).toBe(true);
  });
});

describe('ขอบเขตค่าตัวเลข (ช่วงเดียวกับ UI)', () => {
  const put = (body: Record<string, unknown>) =>
    PUT_CONFIG(new NextRequest('http://localhost/api/admin/ai-tutor/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }));

  it('ค่าต่ำสุด/สูงสุดของแต่ละค่า → บันทึกได้', async () => {
    for (const body of [
      { questionQuota: 1 }, { questionQuota: 10 },
      { userDailyLimit: 1 }, { userDailyLimit: 100 },
      { systemDailyLimit: 1 }, { systemDailyLimit: 20_000 },
      { rolloutPercent: 0 }, { rolloutPercent: 100 },
      { maxTokens: 200 }, { maxTokens: 2000 },
      { timeoutMs: 5000 }, { timeoutMs: 30_000 },
      { firstTokenTimeoutMs: 2000 },
    ]) {
      const res = await put(body);
      expect(res.status, JSON.stringify(body)).toBe(200);
    }
  });

  it('ค่าเกินช่วง (ต่ำ/สูง) → 400 พร้อมข้อความที่ระบุช่วงที่อนุญาต', async () => {
    for (const body of [
      { questionQuota: 0 }, { questionQuota: 11 },
      { userDailyLimit: 0 }, { userDailyLimit: 101 },
      { systemDailyLimit: 0 }, { systemDailyLimit: 20_001 },
      { rolloutPercent: 101 }, { rolloutPercent: -1 },
      { maxTokens: 199 }, { maxTokens: 2001 },
      { timeoutMs: 4999 }, { timeoutMs: 30_001 },
      { firstTokenTimeoutMs: 1999 },
    ]) {
      const res = await put(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      const payload = await res.json();
      expect(payload.success).toBe(false);
      expect(payload.error).toMatch(/\d+–\d+/); // ข้อความมีช่วงที่อนุญาต
    }
  });

  it('ทศนิยม/ค่าว่าง/ค่าที่ไม่ใช่ตัวเลข → 400', async () => {
    for (const body of [
      { questionQuota: 2.5 },
      { questionQuota: '' },
      { userDailyLimit: 'abc' },
      { maxTokens: null },
    ]) {
      const res = await put(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
  });

  it('เพดานรายวันน้อยกว่าโควตาต่อข้อ → 400', async () => {
    const res = await put({ questionQuota: 10, userDailyLimit: 5 });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('โควตาต่อข้อ');
  });

  it('เวลารอชิ้นแรกเกินเวลารอสูงสุด → 400', async () => {
    const res = await put({ timeoutMs: 5000, firstTokenTimeoutMs: 20_000 });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('เวลารอสูงสุด');
  });

  it('systemDailyLimit = 0 ไม่ใช่ค่าที่ถูกต้อง (0 = ค่าเริ่มต้น ไม่ใช่ "ปิดทุกคน")', async () => {
    const res = await put({ systemDailyLimit: 0 });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('1–20000');
  });
});

describe('migration ยังไม่รัน → 503 พร้อมข้อความชัดเจน (ไม่ใช่ 500)', () => {  it('PUT /config: ตาราง ai_tutor_settings ยังไม่มี → 503', async () => {
    mocks.insert.mockImplementation(() => {
      throw new Error('relation "ai_tutor_settings" does not exist');
    });
    const res = await PUT_CONFIG(new NextRequest('http://localhost/api/admin/ai-tutor/config', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionQuota: 3 }),
    }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('migration');
  });

  it('GET /audit: ตาราง ai_tutor_admin_audit ยังไม่มี → 503', async () => {
    mocks.select.mockImplementation(() => {
      throw new Error('relation "ai_tutor_admin_audit" does not exist');
    });
    const res = await GET_AUDIT(new NextRequest('http://localhost/api/admin/ai-tutor/audit'));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('migration');
  });
});

describe('GET /api/admin/ai-tutor/models', () => {
  it('คืนรายชื่อโมเดลพร้อมราคาและข้อมูล reasoning', async () => {
    mocks.fetchModels.mockResolvedValue([{
      id: 'minimax/minimax-m3.1-flash:free',
      name: 'MiniMax',
      pricing: { prompt: 0, completion: 0 },
      reasoningMandatory: true,
      supportedEfforts: ['low', 'medium'],
      contextLength: 1_000_000,
      supportsEffort: () => true,
    }]);
    const res = await GET_MODELS();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data[0].id).toBe('minimax/minimax-m3.1-flash:free');
    expect(body.data[0].reasoningMandatory).toBe(true);
  });
});

describe('POST /api/admin/ai-tutor/models/test', () => {
  const MODEL_KNOWN = {
    id: 'x/y', name: 'x', pricing: { prompt: 0, completion: 0 },
    reasoningMandatory: false, supportedEfforts: ['low', 'high'], contextLength: 100,
    supportsEffort: (effort: string) => effort === 'low' || effort === 'high',
  };

  const post = (body: Record<string, unknown>) =>
    POST_MODEL_TEST(new NextRequest('http://localhost/api/admin/ai-tutor/models/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }));

  /** ผลลัพธ์ของ provider ที่จำลอง — รูปร่างตรง StreamResult ที่ route อ่าน */
  function stubProviderReply(model: string) {
    mocks.streamAiTutorReply.mockResolvedValue({
      text: 'ทดสอบสำเร็จ',
      ttftMs: 900,
      finishReason: 'stop',
      fallbackUsed: false,
      fallbackReason: null,
      usage: { model, latencyMs: 1200, inputTokens: 10, outputTokens: 20, reasoningTokens: 0 },
    });
  }

  beforeEach(() => {
    stubProviderReply(MODEL_KNOWN.id);
  });

  it('โมเดลไม่มีจริง → 400 (เจอในแคช/ดึงใหม่แล้วไม่เจอทั้งสองครั้ง)', async () => {
    mocks.findModel.mockResolvedValue(undefined);
    const res = await post({ model: 'no/such-model' });
    expect(res.status).toBe(400);
    // ครั้งแรกจากแคช + ครั้งที่สองดึงรายชื่อใหม่ (กันโมเดลใหม่ถูกตอบว่าไม่พบทั้งที่ใช้ได้)
    expect(mocks.findModel).toHaveBeenCalledTimes(2);
    expect(mocks.findModel.mock.calls[1]?.[1]).toEqual({ refresh: true });
  });

  it('ไม่พบในแคชแต่ดึงรายชื่อใหม่แล้วเจอ → ทดสอบได้', async () => {
    const fresh = { ...MODEL_KNOWN, id: 'fresh/model' };
    mocks.findModel
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(fresh);
    stubProviderReply('fresh/model');

    const res = await post({ model: 'fresh/model', effort: 'low' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.model).toBe('fresh/model');
  });

  it('effort ที่โมเดลไม่รองรับ → 400 (ไม่เรียก provider)', async () => {
    mocks.findModel.mockResolvedValue({
      id: 'x/y', name: 'x', pricing: { prompt: 0, completion: 0 },
      reasoningMandatory: true, supportedEfforts: ['low'], contextLength: 100,
      supportsEffort: (effort: string) => effort === 'low',
    });
    const res = await post({ model: 'x/y', effort: 'none' });
    expect(res.status).toBe(400);
    expect(mocks.streamAiTutorReply).not.toHaveBeenCalled();
  });

  it('เรียกโมเดลที่พิมพ์เองจริง ด้วย effort ที่หน้าจอเลือก และปิดโมเดลสำรอง', async () => {
    mocks.findModel.mockResolvedValue(MODEL_KNOWN);

    const res = await post({ model: 'x/y', effort: 'high' });
    expect(res.status).toBe(200);

    const used = mocks.streamAiTutorReply.mock.calls[0]?.[0] as {
      config: { primaryModel: string; primaryEffort: string; fallbackModel: string | null };
    };
    expect(used.config.primaryModel).toBe('x/y');
    expect(used.config.primaryEffort).toBe('high');
    expect(used.config.fallbackModel).toBeNull();
  });

  it('ไม่ส่ง effort → ใช้ระดับที่บันทึกไว้ (ไม่ใช่ low ตั้งต้น)', async () => {
    mocks.findModel.mockResolvedValue(MODEL_KNOWN);
    const saved = await getAiTutorConfig();

    const res = await post({ model: 'x/y' });
    expect(res.status).toBe(200);

    const used = mocks.streamAiTutorReply.mock.calls[0]?.[0] as {
      config: { primaryEffort: string };
    };
    expect(used.config.primaryEffort).toBe(saved.primaryEffort);
  });
});

describe('GET /api/admin/ai-tutor/audit', () => {
  it('คืนรายการ audit', async () => {
    const res = await GET_AUDIT(new NextRequest('http://localhost/api/admin/ai-tutor/audit'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });
});





