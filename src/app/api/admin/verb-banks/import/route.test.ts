import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  revalidateTag: vi.fn(),
  insert: vi.fn(),
  dbError: null as unknown,
}));

vi.mock('next/cache', () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/db', () => ({
  db: {
    insert: (...args: unknown[]) => mocks.insert(...args),
  },
}));

/** โซ่ Drizzle จำลอง: ทุก method คืนตัวเอง แล้ว await ได้ค่าที่ตั้งไว้ */
function builder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const method of ['values', 'onConflictDoNothing', 'returning']) {
    b[method] = vi.fn(() => b);
  }
  b.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    (mocks.dbError ? Promise.reject(mocks.dbError) : Promise.resolve(result)).then(resolve, reject);
  return b;
}

import { POST } from './route';

const jsonRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/admin/verb-banks/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  mocks.dbError = null;
  mocks.revalidateTag.mockReset();
  mocks.requireAdmin.mockReset().mockResolvedValue({ error: null });
  mocks.insert.mockReset().mockReturnValue(builder([]));
});

const row = (line: number, v1: string, v2: string, v3: string) => ({ line, v1, v2, v3 });

describe('POST /api/admin/verb-banks/import — auth', () => {
  it('returns the 403 response without touching the database', async () => {
    const error = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    mocks.requireAdmin.mockResolvedValue({ error });
    expect(await POST(jsonRequest({ rows: [row(1, 'go', 'went', 'gone')] }))).toBe(error);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/verb-banks/import — request shape', () => {
  it('rejects an empty payload with 400', async () => {
    const response = await POST(jsonRequest({ rows: [] }));
    expect(response.status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('rejects a payload with too many rows with 413', async () => {
    const many = Array.from({ length: 5001 }, (_, i) => row(i + 1, `v${i}`, 'x', 'y'));
    const response = await POST(jsonRequest({ rows: many }));
    expect(response.status).toBe(413);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/verb-banks/import — validation', () => {
  it('reports invalid rows with their line numbers and inserts nothing valid-only', async () => {
    const response = await POST(jsonRequest({
      rows: [row(1, 'go', 'went', 'gone'), row(2, '  ', 'was', 'been')],
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.summary.invalid).toEqual([{ line: 2, message: 'กรุณากรอกข้อมูล' }]);
    // แถว valid ถูกส่งเข้า .values() แม้มีแถวผิดปนมา
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    const valuesChain = mocks.insert.mock.results[0]?.value as { values: { mock: { calls: unknown[][] } } };
    expect(valuesChain.values.mock.calls[0]?.[0]).toEqual([{ v1: 'go', v2: 'went', v3: 'gone' }]);
  });

  it('reports over-length fields per row', async () => {
    const response = await POST(jsonRequest({
      rows: [row(3, 'a'.repeat(101), 'went', 'gone')],
    }));
    const body = await response.json();
    expect(body.summary.invalid[0].message).toContain('ยาวเกิน');
    expect(body.summary.inserted).toBe(0);
  });
});

describe('POST /api/admin/verb-banks/import — write', () => {
  it('inserts unique rows, skips in-file duplicates and reports the summary', async () => {
    mocks.insert.mockReturnValue(builder([{ id: 1 }, { id: 2 }]));
    const response = await POST(jsonRequest({
      rows: [
        row(1, 'go', 'went', 'gone'),
        row(2, ' go ', 'went', 'gone'), // normalize แล้วซ้ำกับแถว 1
        row(3, 'eat', 'ate', 'eaten'),
      ],
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.summary).toMatchObject({ total: 3, inserted: 2, duplicates: 1, invalid: [] });
    expect(mocks.revalidateTag).toHaveBeenCalledExactlyOnceWith('verb-banks', { expire: 0 });
  });

  it('does not revalidate when nothing was inserted (all rows invalid)', async () => {
    const response = await POST(jsonRequest({ rows: [row(1, '', '', '')] }));
    expect(response.status).toBe(200);
    expect((await response.json()).summary.inserted).toBe(0);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it('returns 500 when the database rejects the insert', async () => {
    mocks.dbError = new Error('connection reset');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const response = await POST(jsonRequest({ rows: [row(1, 'go', 'went', 'gone')] }));
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ success: false, error: 'Failed to import verb entries' });
    } finally {
      consoleError.mockRestore();
    }
  });
});
