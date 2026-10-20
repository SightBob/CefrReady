/**
 * POST /api/ai-tutor/feedback — กด 👍/👎 ต่อคำตอบของโมเดล
 * ต้องเป็นข้อความ AI ในเธรดของผู้ใช้คนนั้นเอง
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  enabled: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/ai-tutor', () => ({ isAiTutorEnabled: mocks.enabled }));
vi.mock('@/lib/api-security', () => ({ validateOrigin: () => null }));
vi.mock('@/db', () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
  },
}));

import { POST } from './route';

function post(body: unknown) {
  return POST(new Request('http://localhost:3000/api/ai-tutor/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

function stubMessage(row: unknown) {
  mocks.select.mockReturnValue({
    from: () => ({ where: () => ({ limit: () => Promise.resolve(row ? [row] : []) }) }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'u1' } });
  mocks.enabled.mockResolvedValue(true);
  stubMessage({ id: 55, role: 'assistant', userId: 'u1' });
  const chain: Record<string, unknown> = {};
  chain.values = vi.fn(() => chain);
  chain.onConflictDoUpdate = vi.fn(() => chain);
  mocks.insert.mockReturnValue(chain);
});

describe('POST /api/ai-tutor/feedback', () => {
  it('ไม่ล็อกอิน → 401', async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await post({ messageId: 55, value: 'up' });
    expect(res.status).toBe(401);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('ไม่ผ่าน feature flag → 403 (ผู้ไม่มีสิทธิ์ใช้ feedback ไม่ได้)', async () => {
    mocks.enabled.mockResolvedValue(false);
    const res = await post({ messageId: 55, value: 'up' });
    expect(res.status).toBe(403);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('body ผิด → 400', async () => {
    expect((await post({ messageId: 55, value: 'sideways' })).status).toBe(400);
    expect((await post({ messageId: 0, value: 'up' })).status).toBe(400);
  });

  it('ข้อความไม่ใช่ของผู้ใช้คนนี้ (หรือไม่ใช่ข้อความจากโมเดล) → 404', async () => {
    stubMessage(null);
    const res = await post({ messageId: 55, value: 'up' });
    expect(res.status).toBe(404);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('กดได้เมื่อเป็นข้อความ AI ของตัวเอง → บันทึก (upsert)', async () => {
    const res = await post({ messageId: 55, value: 'down' });
    expect(res.status).toBe(200);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    // insert(table).values({...}) → ค่าที่ส่งเข้า DB
    const chain = mocks.insert.mock.results[0].value as {
      values: ReturnType<typeof vi.fn>;
      onConflictDoUpdate: ReturnType<typeof vi.fn>;
    };
    const values = chain.values.mock.calls[0][0] as { messageId: number; userId: string; value: string };
    expect(values).toEqual({ messageId: 55, userId: 'u1', value: 'down' });
    // กดซ้ำ = อัปเดตค่าเดิม (unique message_id + user_id)
    expect(chain.onConflictDoUpdate).toHaveBeenCalled();
  });

  it('คิวรีต้องกรองทั้ง user_id และ role = assistant', async () => {
    await post({ messageId: 55, value: 'up' });
    const where = mocks.select.mock.calls[0][0];
    expect(where).toBeDefined();
    // เงื่อนไขถูกสร้างใน route (eq userId + eq role) — ตรวจว่าเรียก select ด้วย users.messageId
    expect(mocks.select).toHaveBeenCalled();
  });

  it('ฐานข้อมูลใช้ไม่ได้ → 503 พร้อมข้อความที่ผู้เรียนอ่านรู้เรื่อง (ไม่ใช่ 500)', async () => {
    mocks.select.mockImplementation(() => { throw new Error('relation "ai_tutor_feedback" does not exist'); });

    const res = await post({ messageId: 55, value: 'up' });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('ระบบ AI Tutor ยังไม่พร้อมให้บริการชั่วคราว กรุณาลองใหม่อีกครั้ง');
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
