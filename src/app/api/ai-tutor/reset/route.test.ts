/**
 * POST /api/ai-tutor/reset — เก็บถังข้อความเดิมของข้อนั้น (ไม่ลบ) และไม่คืนโควตา
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  enabled: vi.fn(),
  archiveThread: vi.fn(),
  getQuotaSnapshot: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/ai-tutor', () => ({ isAiTutorEnabled: mocks.enabled }));
vi.mock('@/lib/api-security', () => ({ validateOrigin: () => null }));
vi.mock('@/lib/ai-tutor/messages', () => ({ archiveThread: mocks.archiveThread }));
vi.mock('@/lib/ai-tutor/quota', () => ({ getQuotaSnapshot: mocks.getQuotaSnapshot }));

import { POST } from './route';

function post(body: unknown) {
  return POST(new Request('http://localhost:3000/api/ai-tutor/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'u1' } });
  mocks.enabled.mockResolvedValue(true);
  mocks.archiveThread.mockResolvedValue(4);
  // โควตาไม่เปลี่ยนหลัง reset (ยังนับแถวที่ถูกเก็บถัง)
  mocks.getQuotaSnapshot.mockResolvedValue({ used: 3, limit: 5, remaining: 2 });
});

describe('POST /api/ai-tutor/reset', () => {
  it('ไม่ล็อกอิน → 401', async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await post({ questionId: 7 })).status).toBe(401);
    expect(mocks.archiveThread).not.toHaveBeenCalled();
  });

  it('ไม่ผ่าน feature flag → 403', async () => {
    mocks.enabled.mockResolvedValue(false);
    expect((await post({ questionId: 7 })).status).toBe(403);
    expect(mocks.archiveThread).not.toHaveBeenCalled();
  });

  it('body ผิด → 400', async () => {
    expect((await post({ questionId: 0 })).status).toBe(400);
  });

  it('เก็บถังข้อความของผู้เรียนคนนั้นเท่านั้น', async () => {
    const res = await post({ questionId: 7 });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(mocks.archiveThread).toHaveBeenCalledWith({ userId: 'u1', questionId: 7 });
    expect(body.archived).toBe(4);
  });

  it('ไม่คืนโควตา — ตัวเลขโควตาหลัง reset เท่าเดิม', async () => {
    const body = await (await post({ questionId: 7 })).json();
    expect(body.quota).toEqual({ used: 3, limit: 5, remaining: 2 });
  });
});
