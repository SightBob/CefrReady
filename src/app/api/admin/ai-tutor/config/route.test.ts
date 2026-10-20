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
  findModel: vi.fn(),
  fetchModels: vi.fn(),
}));

vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/api-security', () => ({ checkUserRateLimit: mocks.rateLimit }));
vi.mock('@/db', () => ({ db: { select: mocks.select, insert: mocks.insert } }));
vi.mock('@/lib/ai-tutor/models', () => ({
  findModel: mocks.findModel,
  fetchOpenRouterModels: mocks.fetchModels,
  sortModelsForAdmin: (models: unknown[]) => models,
}));

import { GET as GET_CONFIG, PUT as PUT_CONFIG } from './route';
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

function stubDb() {
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
  insertChain.values = vi.fn(() => insertChain);
  insertChain.onConflictDoUpdate = vi.fn(() => insertChain);
  insertChain.returning = vi.fn(() => insertChain);
  mocks.insert.mockReturnValue(insertChain);
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
  it('โมเดลไม่มีจริง → 400', async () => {
    mocks.findModel.mockResolvedValue(undefined);
    const res = await POST_MODEL_TEST(new NextRequest('http://localhost/api/admin/ai-tutor/models/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'no/such-model' }),
    }));
    expect(res.status).toBe(400);
  });

  it('effort ที่โมเดลไม่รองรับ → 400', async () => {
    mocks.findModel.mockResolvedValue({
      id: 'x/y', name: 'x', pricing: { prompt: 0, completion: 0 },
      reasoningMandatory: true, supportedEfforts: ['low'], contextLength: 100,
      supportsEffort: (effort: string) => effort === 'low',
    });
    const res = await POST_MODEL_TEST(new NextRequest('http://localhost/api/admin/ai-tutor/models/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'x/y', effort: 'none' }),
    }));
    expect(res.status).toBe(400);
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


