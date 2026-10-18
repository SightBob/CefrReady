import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  revalidateTag: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  select: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/db', () => ({
  db: {
    update: (...args: unknown[]) => mocks.update(...args),
    delete: (...args: unknown[]) => mocks.del(...args),
    select: (...args: unknown[]) => mocks.select(...args),
  },
}));

vi.mock('@/lib/api-security', () => ({ checkUserRateLimit: async () => null }));
import { PATCH, DELETE } from './route';

const validBody = {
  grammarTopic: 'Prepositions',
  title: 'คำบุพบท',
  sections: [{ type: 'rule', heading: 'IN', body: 'x' }],
};

const patchRequest = (id: string, body: unknown) =>
  new NextRequest(`http://localhost/api/admin/test-explains/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const delRequest = (id: string) =>
  new NextRequest(`http://localhost/api/admin/test-explains/${id}`, { method: 'DELETE' });

const params = (id: string) => ({ params: Promise.resolve({ id }) });

function builder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const method of ['set', 'where', 'returning']) b[method] = vi.fn(() => b);
  b.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return b;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ error: null });
  // duplicate-topic lookup → no conflict
  mocks.select.mockReturnValue({
    from: () => ({ where: () => ({ limit: async () => [] }) }),
  });
  mocks.update.mockReturnValue(builder([{ id: 4 }]));
  mocks.del.mockReturnValue(builder([{ id: 4 }]));
});

describe('PATCH /api/admin/test-explains/[id]', () => {
  it('clears the test-explains cache after a successful update', async () => {
    const res = await PATCH(patchRequest('4', validBody), params('4'));

    expect(res.status).toBe(200);
    expect(mocks.revalidateTag).toHaveBeenCalledExactlyOnceWith('test-explains', { expire: 0 });
  });

  it('rejects a non-numeric id before touching the database', async () => {
    const res = await PATCH(patchRequest('abc', validBody), params('abc'));

    expect(res.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it('leaves the cache alone when the update matched no row', async () => {
    mocks.update.mockReturnValue(builder([]));

    const res = await PATCH(patchRequest('404', validBody), params('404'));

    expect(res.status).toBe(404);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it('leaves the cache alone when the topic duplicates another explain', async () => {
    mocks.select.mockReturnValue({
      from: () => ({ where: () => ({ limit: async () => [{ id: 9, grammarTopic: 'Prepositions' }] }) }),
    });

    const res = await PATCH(patchRequest('4', validBody), params('4'));

    expect(res.status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/admin/test-explains/[id]', () => {
  it('clears the test-explains cache after a successful delete', async () => {
    const res = await DELETE(delRequest('4'), params('4'));

    expect(res.status).toBe(200);
    expect(mocks.revalidateTag).toHaveBeenCalledExactlyOnceWith('test-explains', { expire: 0 });
  });

  it('leaves the cache alone when there was nothing to delete', async () => {
    mocks.del.mockReturnValue(builder([]));

    const res = await DELETE(delRequest('404'), params('404'));

    expect(res.status).toBe(404);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });
});