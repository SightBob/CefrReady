import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  admin: vi.fn(),
  published: vi.fn(),
  preview: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/admin-auth', () => ({ isAdminRequest: mocks.admin }));
vi.mock('@/lib/test-explains', () => ({
  fetchExplainsForSet: mocks.published,
  fetchExplainsForSetPreview: mocks.preview,
  explainsByTopic: (rows: Array<{ grammarTopic: string }>) =>
    Object.fromEntries(rows.map((row) => [row.grammarTopic, row])),
}));

import { GET } from './route';

const request = (query = '') => new NextRequest(`http://localhost/api/test-sets/7/explains${query}`);
const props = { params: Promise.resolve({ id: '7' }) };

const publishedExplain = { id: 1, grammarTopic: 'Present Perfect', title: 'PP', sections: [], intro: null, tip: null, status: 'published' };
const reviewExplain = { id: 2, grammarTopic: 'Present Simple', title: 'PS', sections: [], intro: null, tip: null, status: 'review' };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'learner' } });
  mocks.admin.mockResolvedValue(true);
  mocks.published.mockResolvedValue([publishedExplain]);
  mocks.preview.mockResolvedValue([reviewExplain]);
});

describe('GET /api/test-sets/[id]/explains', () => {
  it('requires authentication', async () => {
    mocks.auth.mockResolvedValue(null);

    expect((await GET(request(), props)).status).toBe(401);
    expect(mocks.published).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric set id', async () => {
    const response = await GET(request(), { params: Promise.resolve({ id: 'abc' }) });

    expect(response.status).toBe(400);
    expect(mocks.published).not.toHaveBeenCalled();
  });

  it('serves only published content by default', async () => {
    const payload = await (await GET(request(), props)).json();

    expect(payload.data).toEqual({ 'Present Perfect': publishedExplain });
    expect(mocks.preview).not.toHaveBeenCalled();
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  // โหมดพรีวิวของแอดมิน: หน้าสอบจริงต้องดึงเนื้อหา รอตรวจสอบ ได้ — แต่ผู้เรียนยังไม่เห็น
  it('serves every status in preview mode for an admin account', async () => {
    const response = await GET(request('?preview=1'), props);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: { 'Present Simple': reviewExplain } });
    expect(mocks.preview).toHaveBeenCalledWith(7);
    expect(mocks.published).not.toHaveBeenCalled();
  });

  it('refuses preview mode for a learner and reads nothing', async () => {
    mocks.admin.mockResolvedValue(false);

    const response = await GET(request('?preview=1'), props);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ success: false, error: 'โหมดพรีวิวใช้ได้เฉพาะบัญชีผู้ดูแล' });
    expect(mocks.preview).not.toHaveBeenCalled();
    expect(mocks.published).not.toHaveBeenCalled();
  });

  it('does not leak database errors', async () => {
    mocks.published.mockRejectedValue(new Error('password authentication failed'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const response = await GET(request(), props);
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ success: false, error: 'Failed to fetch explains' });
    } finally {
      consoleError.mockRestore();
    }
  });
});
