import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), get: vi.fn(), set: vi.fn() }));

vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@upstash/redis', () => ({
  Redis: class {
    get = mocks.get;
    set = mocks.set;
  },
}));

import { GET, PUT } from './route';

const putRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/admin/tap-reason-rewards', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.test');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test');
  mocks.requireAdmin.mockResolvedValue({ error: null, session: null });
  mocks.get.mockResolvedValue(null);
  mocks.set.mockResolvedValue('OK');
});

describe('GET /api/admin/tap-reason-rewards', () => {
  it('returns the requireAdmin error without reading Redis', async () => {
    const error = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    mocks.requireAdmin.mockResolvedValue({ error, session: null });
    expect(await GET()).toBe(error);
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('returns the stored flat score', async () => {
    mocks.get.mockResolvedValue({ autoAward: true, points: 25 });
    const response = await GET();
    expect(await response.json()).toEqual({ success: true, data: { autoAward: true, points: 25 } });
  });

  it('returns 503 without leaking storage errors', async () => {
    mocks.get.mockRejectedValue(new Error('redis down'));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ success: false, error: 'โหลดการตั้งค่าคะแนนไม่สำเร็จ' });
  });
});

describe('PUT /api/admin/tap-reason-rewards', () => {
  it('saves the flat score and echoes it back', async () => {
    const response = await PUT(putRequest({ autoAward: true, points: 50 }));
    expect(response.status).toBe(200);
    expect(mocks.set).toHaveBeenCalledExactlyOnceWith('tap-reasons:reward', { autoAward: true, points: 50 });
    expect(await response.json()).toEqual({ success: true, data: { autoAward: true, points: 50 } });
  });

  it('accepts 0 points and auto award off', async () => {
    expect((await PUT(putRequest({ autoAward: false, points: 0 }))).status).toBe(200);
  });

  it('rejects points outside 0-100, non-integers and unknown fields', async () => {
    for (const body of [
      { autoAward: true, points: 101 },
      { autoAward: true, points: -1 },
      { autoAward: true, points: 1.5 },
      { autoAward: true, points: '50' },
      { autoAward: true, points: 50, extra: true },
      { points: 50 },
      { autoAward: true },
      null,
      'not json',
    ]) {
      const response = await PUT(putRequest(body));
      expect(response.status, JSON.stringify(body)).toBe(400);
    }
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it('returns 503 when the storage write fails', async () => {
    mocks.set.mockRejectedValue(new Error('redis down'));
    const response = await PUT(putRequest({ autoAward: true, points: 50 }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ success: false, error: 'บันทึกการตั้งค่าคะแนนไม่สำเร็จ' });
  });

  it('returns the requireAdmin error without writing', async () => {
    const error = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mocks.requireAdmin.mockResolvedValue({ error, session: null });
    expect(await PUT(putRequest({ autoAward: true, points: 50 }))).toBe(error);
    expect(mocks.set).not.toHaveBeenCalled();
  });
});
