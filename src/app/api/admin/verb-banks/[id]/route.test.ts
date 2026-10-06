import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  revalidateTag: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  dbError: null as unknown,
}));

vi.mock('next/cache', () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/db', () => ({
  db: {
    update: (...args: unknown[]) => mocks.update(...args),
    delete: (...args: unknown[]) => mocks.del(...args),
  },
}));

function builder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const method of ['set', 'where', 'returning']) b[method] = vi.fn(() => b);
  b.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    (mocks.dbError ? Promise.reject(mocks.dbError) : Promise.resolve(result)).then(resolve, reject);
  return b;
}

import { PUT, DELETE } from './route';

const jsonRequest = (id: string, body: unknown) =>
  new NextRequest(`http://localhost/api/admin/verb-banks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const delRequest = (id: string) =>
  new NextRequest(`http://localhost/api/admin/verb-banks/${id}`, { method: 'DELETE' });

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  mocks.dbError = null;
  mocks.revalidateTag.mockReset();
  mocks.requireAdmin.mockReset().mockResolvedValue({ error: null });
  mocks.update.mockReset().mockReturnValue(builder([]));
  mocks.del.mockReset().mockReturnValue(builder([]));
});

describe('auth gate', () => {
  it('blocks both write methods for non-admins', async () => {
    const error = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    mocks.requireAdmin.mockResolvedValue({ error });
    expect(await PUT(jsonRequest('1', { v1: 'go', v2: 'went', v3: 'gone' }), params('1'))).toBe(error);
    expect(await DELETE(delRequest('1'), params('1'))).toBe(error);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.del).not.toHaveBeenCalled();
  });
});

describe('PUT /api/admin/verb-banks/[id]', () => {
  it('rejects a non-numeric id with 400', async () => {
    const response = await PUT(jsonRequest('abc', { v1: 'go', v2: 'went', v3: 'gone' }), params('abc'));
    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('validates all three forms on edit', async () => {
    const response = await PUT(jsonRequest('1', { v1: 'go', v2: 'went', v3: '' }), params('1'));
    expect(response.status).toBe(400);
    expect((await response.json()).errors).toEqual({ v3: 'กรุณากรอกข้อมูล' });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('updates the row and returns it', async () => {
    mocks.update.mockReturnValue(builder([{ id: 3, v1: 'see', v2: 'saw', v3: 'seen' }]));
    const response = await PUT(jsonRequest('3', { v1: 'see', v2: 'saw', v3: 'seen' }), params('3'));
    expect(response.status).toBe(200);
    expect(mocks.revalidateTag).toHaveBeenCalledExactlyOnceWith('verb-banks', { expire: 0 });
    expect(await response.json()).toMatchObject({ success: true, data: { id: 3 } });
  });

  it('returns 404 when the id does not exist', async () => {
    mocks.update.mockReturnValue(builder([]));
    const response = await PUT(jsonRequest('999', { v1: 'go', v2: 'went', v3: 'gone' }), params('999'));
    expect(response.status).toBe(404);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
    expect((await response.json()).error).toBe('ไม่พบรายการนี้');
  });

  it('returns 409 when the new triple collides with another row', async () => {
    mocks.dbError = Object.assign(new Error('duplicate key'), { code: '23505' });
    const response = await PUT(jsonRequest('1', { v1: 'eat', v2: 'ate', v3: 'eaten' }), params('1'));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('อยู่ในคลังแล้ว');
  });

  it('returns 500 for any other database failure', async () => {
    mocks.dbError = new Error('connection reset');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const response = await PUT(jsonRequest('1', { v1: 'go', v2: 'went', v3: 'gone' }), params('1'));
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ success: false, error: 'Server error' });
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe('DELETE /api/admin/verb-banks/[id]', () => {
  it('rejects a non-numeric id with 400', async () => {
    const response = await DELETE(delRequest('xyz'), params('xyz'));
    expect(response.status).toBe(400);
    expect(mocks.del).not.toHaveBeenCalled();
  });

  it('deletes the row and returns it', async () => {
    mocks.del.mockReturnValue(builder([{ id: 2, v1: 'eat', v2: 'ate', v3: 'eaten' }]));
    const response = await DELETE(delRequest('2'), params('2'));
    expect(response.status).toBe(200);
    expect(mocks.revalidateTag).toHaveBeenCalledExactlyOnceWith('verb-banks', { expire: 0 });
    expect(await response.json()).toMatchObject({ success: true, data: { id: 2 } });
  });

  it('returns 404 when the row is already gone', async () => {
    mocks.del.mockReturnValue(builder([]));
    const response = await DELETE(delRequest('999'), params('999'));
    expect(response.status).toBe(404);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });
});
