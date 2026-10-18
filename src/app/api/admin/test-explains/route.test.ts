import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  revalidateTag: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  select: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/db', () => ({
  db: {
    insert: (...args: unknown[]) => mocks.insert(...args),
    update: (...args: unknown[]) => mocks.update(...args),
    delete: (...args: unknown[]) => mocks.del(...args),
    select: (...args: unknown[]) => mocks.select(...args),
  },
}));

vi.mock('@/lib/api-security', () => ({ checkUserRateLimit: async () => null }));
import { POST } from './route';

const validPayload = {
  grammarTopic: 'Prepositions',
  title: 'คำบุพบท',
  sections: [{ type: 'rule', heading: 'IN', body: 'x' }],
};

const post = (body: unknown) =>
  new NextRequest('http://localhost/api/admin/test-explains', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ error: null });
  // findDuplicateTopicUser → select().from().where().limit() → []
  mocks.select.mockReturnValue({
    from: () => ({ where: () => ({ limit: async () => [] }) }),
  });
  mocks.insert.mockReturnValue({ values: () => ({ returning: async () => [{ id: 1 }] }) });
});

describe('POST /api/admin/test-explains', () => {
  it('clears the test-explains cache after creating an explain', async () => {
    const res = await POST(post(validPayload));

    expect(res.status).toBe(201);
    expect(mocks.revalidateTag).toHaveBeenCalledExactlyOnceWith('test-explains', { expire: 0 });
  });

  it('leaves the cache alone when the topic duplicates an existing explain', async () => {
    mocks.select.mockReturnValue({
      from: () => ({ where: () => ({ limit: async () => [{ id: 9, grammarTopic: 'Prepositions' }] }) }),
    });

    const res = await POST(post(validPayload));

    expect(res.status).toBe(409);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it('leaves the cache alone when validation fails', async () => {
    const res = await POST(post({ grammarTopic: 'Prepositions' }));

    expect(res.status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });
});