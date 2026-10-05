import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  dbError: null as unknown,
}));

vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => mocks.select(...args),
    insert: (...args: unknown[]) => mocks.insert(...args),
    update: (...args: unknown[]) => mocks.update(...args),
    delete: (...args: unknown[]) => mocks.del(...args),
  },
}));

/** โซ่ Drizzle จำลอง: ทุก method คืนตัวเอง แล้ว await ได้ค่าที่ตั้งไว้ */
function builder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const method of ['from', 'where', 'orderBy', 'values', 'set', 'onConflictDoNothing', 'returning']) {
    b[method] = vi.fn(() => b);
  }
  b.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    (mocks.dbError ? Promise.reject(mocks.dbError) : Promise.resolve(result)).then(resolve, reject);
  return b;
}

import { GET, POST } from './route';

const jsonRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/admin/verb-banks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  mocks.dbError = null;
  mocks.requireAdmin.mockReset().mockResolvedValue({ error: null });
  mocks.select.mockReset().mockReturnValue(builder([]));
  mocks.insert.mockReset().mockReturnValue(builder([]));
  mocks.update.mockReset().mockReturnValue(builder([]));
  mocks.del.mockReset().mockReturnValue(builder([]));
});

describe('POST /api/admin/verb-banks — auth', () => {
  it('returns the 403 response without touching the database', async () => {
    const error = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    mocks.requireAdmin.mockResolvedValue({ error });
    expect(await POST(jsonRequest({ v1: 'go', v2: 'went', v3: 'gone' }))).toBe(error);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/verb-banks — validation', () => {
  it('rejects a blank field with 400 and per-field errors', async () => {
    const response = await POST(jsonRequest({ v1: 'go', v2: '  ', v3: 'gone' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.errors).toEqual({ v2: 'กรุณากรอกข้อมูล' });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('rejects over-length input with 400', async () => {
    const response = await POST(jsonRequest({ v1: 'a'.repeat(101), v2: 'went', v3: 'gone' }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('ยาวเกิน');
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('rejects non-string input with 400', async () => {
    const response = await POST(jsonRequest({ v1: 5, v2: ['went'], v3: null }));
    expect(response.status).toBe(400);
    expect((await response.json()).errors).toEqual({
      v1: 'กรุณากรอกข้อมูล',
      v2: 'กรุณากรอกข้อมูล',
      v3: 'กรุณากรอกข้อมูล',
    });
  });
});

describe('POST /api/admin/verb-banks — write', () => {
  it('returns 201 with the created row when the triple is new', async () => {
    mocks.insert.mockReturnValue(builder([{ id: 7, v1: 'write', v2: 'wrote', v3: 'written' }]));
    const response = await POST(jsonRequest({ v1: ' write ', v2: 'wrote', v3: 'written' }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      success: true,
      data: { id: 7, v1: 'write', v2: 'wrote', v3: 'written' },
    });
  });

  it('returns 409 when the triple already exists', async () => {
    mocks.insert.mockReturnValue(builder([])); // onConflictDoNothing ไม่คืนแถว
    const response = await POST(jsonRequest({ v1: 'go', v2: 'went', v3: 'gone' }));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('อยู่ในคลังแล้ว');
  });

  it('returns 500 when the database rejects the insert', async () => {
    mocks.dbError = new Error('connection reset');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const response = await POST(jsonRequest({ v1: 'go', v2: 'went', v3: 'gone' }));
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ success: false, error: 'Failed to create verb entry' });
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe('GET /api/admin/verb-banks', () => {
  it('returns the rows with a total count', async () => {
    mocks.select.mockReturnValue(builder([
      { id: 1, v1: 'go', v2: 'went', v3: 'gone' },
      { id: 2, v1: 'eat', v2: 'ate', v3: 'eaten' },
    ]));
    const response = await GET(new NextRequest('http://localhost/api/admin/verb-banks'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.total).toBe(2);
    expect(body.data[1]).toMatchObject({ v1: 'eat', v3: 'eaten' });
  });

  it('requires admin before listing', async () => {
    const error = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    mocks.requireAdmin.mockResolvedValue({ error });
    expect(await GET(new NextRequest('http://localhost/api/admin/verb-banks'))).toBe(error);
    expect(mocks.select).not.toHaveBeenCalled();
  });
});
