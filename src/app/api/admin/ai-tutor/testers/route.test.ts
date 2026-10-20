/**
 * API ผู้ทดสอบ AI Tutor — 401/403 + bulk grant/revoke
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  rateLimit: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
}));

vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/api-security', () => ({ checkUserRateLimit: mocks.rateLimit }));
vi.mock('@/db', () => ({
  db: { select: mocks.select, update: mocks.update, insert: mocks.insert },
}));

import { GET, POST } from './route';

const TESTER_ROWS = [
  { id: 'u1', email: 'learner@example.com', name: 'ผู้เรียน', access: true, updatedAt: new Date() },
  { id: 'u2', email: 'second@example.com', name: null, access: true, updatedAt: new Date() },
];

/** กำหนดผลลัพธ์ของ select (ผู้ใช้ที่ค้นเจอ) */
let selectedUsers: Array<{ id: string; email: string; name: string | null; access: boolean; updatedAt: Date }> = TESTER_ROWS;

function unauthorized() {
  return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
}
function forbidden() {
  return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403 });
}

/** chain ที่รองรับ select().from().where().orderBy().limit().offset() และ await ได้ */
function chain(rows: unknown[]) {
  const builder: Record<string, unknown> = {};
  for (const method of ['from', 'where', 'orderBy', 'limit', 'offset']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(rows).then(resolve);
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  selectedUsers = TESTER_ROWS;
  mocks.requireAdmin.mockResolvedValue({ error: null, session: { user: { id: 'admin-1' } } });
  mocks.rateLimit.mockResolvedValue(null);
  mocks.select.mockImplementation((selection: Record<string, unknown>) => (
    'total' in selection ? chain([{ total: TESTER_ROWS.length }]) : chain(selectedUsers)
  ));
  const updateChain: Record<string, unknown> = {};
  updateChain.set = vi.fn(() => updateChain);
  updateChain.where = vi.fn(() => updateChain);
  mocks.update.mockReturnValue(updateChain);
  const insertChain: Record<string, unknown> = {};
  insertChain.values = vi.fn(() => insertChain);
  mocks.insert.mockReturnValue(insertChain);
});

function post(body: unknown) {
  return POST(new Request('http://localhost/api/admin/ai-tutor/testers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

describe('ผู้ทดสอบ — สิทธิ์', () => {
  it('ไม่ล็อกอิน → 401 (ทั้ง GET และ POST)', async () => {
    mocks.requireAdmin.mockResolvedValue({ error: unauthorized(), session: null });
    const getRes = await GET(new Request('http://localhost/api/admin/ai-tutor/testers'));
    const postRes = await post({ action: 'grant', emails: ['a@b.com'] });
    expect(getRes.status).toBe(401);
    expect(postRes.status).toBe(401);
  });

  it('ไม่ใช่แอดมิน → 403 (ทั้ง GET และ POST)', async () => {
    mocks.requireAdmin.mockResolvedValue({ error: forbidden(), session: null });
    const getRes = await GET(new Request('http://localhost/api/admin/ai-tutor/testers'));
    const postRes = await post({ action: 'grant', emails: ['a@b.com'] });
    expect(getRes.status).toBe(403);
    expect(postRes.status).toBe(403);
  });
});

describe('GET /api/admin/ai-tutor/testers', () => {
  it('คืนรายชื่อผู้มีสิทธิ์ + จำนวนรวม + เมตาแบ่งหน้า', async () => {
    const res = await GET(new Request('http://localhost/api/admin/ai-tutor/testers?q=learn&page=1'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.meta.total).toBe(2);
    expect(body.meta.perPage).toBe(20);
    // ไม่ส่งข้อมูลเกินจำเป็น
    expect(body.data[0]).not.toHaveProperty('aiTutorAccess');
  });
});

describe('POST /api/admin/ai-tutor/testers — bulk grant/revoke', () => {
  it('grant ผู้ที่ยังไม่มีสิทธิ์ → สำเร็จ', async () => {
    selectedUsers = [{ id: 'u3', email: 'learner@example.com', name: null, access: false, updatedAt: new Date() }];
    const res = await post({ action: 'grant', emails: ['learner@example.com'] });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.granted).toEqual(['learner@example.com']);
    expect(mocks.update).toHaveBeenCalled();
  });

  it('grant ผู้ที่มีสิทธิ์อยู่แล้ว → แยกกลุ่ม already', async () => {
    const res = await post({ action: 'grant', emails: ['learner@example.com'] });
    const body = await res.json();
    expect(body.data.granted).toEqual([]);
    expect(body.data.already).toEqual(['learner@example.com']);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('revoke ผู้ที่มีสิทธิ์ → สำเร็จ', async () => {
    const res = await post({ action: 'revoke', emails: ['learner@example.com'] });
    const body = await res.json();
    expect(body.data.granted).toEqual(['learner@example.com']);
    expect(mocks.update).toHaveBeenCalled();
  });

  it('ไม่พบผู้ใช้ → แยกกลุ่ม notFound', async () => {
    selectedUsers = [];
    const res = await post({ action: 'grant', emails: ['ghost@example.com'] });
    const body = await res.json();
    expect(body.data.granted).toEqual([]);
    expect(body.data.notFound).toEqual(['ghost@example.com']);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('อีเมลซ้ำในคำขอเดียว → ทำครั้งเดียว (ไม่ซ้ำ)', async () => {
    selectedUsers = [{ id: 'u3', email: 'learner@example.com', name: null, access: false, updatedAt: new Date() }];
    const res = await post({ action: 'grant', emails: ['learner@example.com', 'LEARNER@example.com'] });
    const body = await res.json();
    expect(body.data.granted).toEqual(['learner@example.com']);
  });

  it('เกิน 200 รายการ → 400', async () => {
    const emails = Array.from({ length: 201 }, (_, index) => `u${index}@example.com`);
    const res = await post({ action: 'grant', emails });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('200');
  });

  it('อีเมลรูปแบบผิด → แยกกลุ่ม invalid (ไม่ทั้งหมดผิด)', async () => {
    selectedUsers = [{ id: 'u3', email: 'learner@example.com', name: null, access: false, updatedAt: new Date() }];
    const res = await post({ action: 'grant', emails: ['not-an-email', 'learner@example.com'] });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.invalid).toEqual(['not-an-email']);
    expect(body.data.granted).toEqual(['learner@example.com']);
  });

  it('revoke ผู้ที่ยังไม่มีสิทธิ์ → แยกกลุ่ม already', async () => {
    selectedUsers = [{ id: 'u9', email: 'none@example.com', name: null, access: false, updatedAt: new Date() }];
    const res = await post({ action: 'revoke', emails: ['none@example.com'] });
    const body = await res.json();
    expect(body.data.granted).toEqual([]);
    expect(body.data.already).toEqual(['none@example.com']);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('เขียน audit ทุกครั้งที่มีการเปลี่ยน', async () => {
    selectedUsers = [{ id: 'u3', email: 'learner@example.com', name: null, access: false, updatedAt: new Date() }];
    await post({ action: 'grant', emails: ['learner@example.com'] });
    expect(mocks.insert).toHaveBeenCalled();
  });
});
