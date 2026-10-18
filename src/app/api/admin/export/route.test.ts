/**
 * GET /api/admin/export — endpoint ที่ดึงข้อมูลผู้เรียนเป็นจำนวนมาก
 * (attempt 5,000 แถว พร้อมชื่อและอีเมล) จึงต้องมีโควตาแยกจาก admin route อื่น
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ withAdmin: vi.fn(), select: vi.fn() }));
vi.mock('@/lib/admin-route', () => ({ withAdmin: mocks.withAdmin }));
vi.mock('@/db', () => ({ db: { select: mocks.select } }));

import { GET } from './route';

/** drizzle chain ที่ resolve เป็น attempt ปลอม 1 แถว */
function attemptsChain(rows: unknown[]) {
  const builder: Record<string, unknown> = {};
  for (const m of ['from', 'leftJoin', 'orderBy']) builder[m] = vi.fn(() => builder);
  builder.limit = vi.fn().mockResolvedValue(rows);
  return builder;
}

const EXPORT_LIMIT = { keySuffix: 'admin-export', maxRequests: 5, windowMs: 5 * 60_000 };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.withAdmin.mockResolvedValue({ error: null, session: { user: { id: 'admin-1' } } });
  mocks.select.mockReturnValue(attemptsChain([]));
});

describe('GET /api/admin/export', () => {
  it('ขอโควตาเข้มกว่าปกติก่อนดึงข้อมูล', async () => {
    await GET();
    expect(mocks.withAdmin).toHaveBeenCalledWith(EXPORT_LIMIT);
  });

  it('เกินโควตาได้ 429 และไม่ดึงข้อมูล', async () => {
    mocks.withAdmin.mockResolvedValue({
      error: new Response(JSON.stringify({ success: false, error: 'Too many requests' }), { status: 429 }),
      session: null,
    });
    const res = await GET();
    expect(res.status).toBe(429);
    expect((await res.text()).includes('Too many requests')).toBe(true);
  });

  it('ไม่ใช่แอดมินได้ 401 เหมือนเดิม', async () => {
    mocks.withAdmin.mockResolvedValue({ error: new Response('Unauthorized', { status: 401 }), session: null });
    expect((await GET()).status).toBe(401);
  });

  it('ไม่ใช่แอดมินได้ 403 เหมือนเดิม', async () => {
    mocks.withAdmin.mockResolvedValue({
      error: new Response('Forbidden - Admin access required', { status: 403 }),
      session: null,
    });
    expect((await GET()).status).toBe(403);
  });

  it('แอดมินที่ยังไม่เกินโควตายังดึง CSV ได้เหมือนเดิม', async () => {
    mocks.select.mockReturnValue(
      attemptsChain([
        {
          id: 1, userName: 'สมชาย', userEmail: 'a@b.c', testType: 'Focus on Form',
          score: '80.00', correctAnswers: 8, totalQuestions: 10,
          startedAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-01T01:00:00Z',
        },
      ])
    );
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/csv');
    const csv = await res.text();
    expect(csv).toContain('อีเมล');
    expect(csv).toContain('a@b.c');
  });
});