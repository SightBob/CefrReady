/**
 * POST /api/ai-tutor/end — จบรอบการทำข้อสอบ → เก็บถังบทสนทนาทั้งรอบ (ไม่ลบ ไม่คืนโควตา)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  enabled: vi.fn(),
  minuteLimit: vi.fn(),
  archiveAttempt: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/ai-tutor', () => ({ isAiTutorEnabled: mocks.enabled }));
vi.mock('@/lib/api-security', () => ({ validateOrigin: () => null, checkUserRateLimit: mocks.minuteLimit }));
vi.mock('@/lib/ai-tutor/messages', () => ({ archiveAttempt: mocks.archiveAttempt }));

import { POST } from './route';

function post(body: unknown) {
  return POST(new Request('http://localhost:3000/api/ai-tutor/end', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'u1' } });
  mocks.enabled.mockResolvedValue(true);
  mocks.minuteLimit.mockResolvedValue(null);
  mocks.archiveAttempt.mockResolvedValue(6);
});

describe('POST /api/ai-tutor/end', () => {
  it('ไม่ล็อกอิน → 401', async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await post({ attemptKey: 'attempt-key-0001' })).status).toBe(401);
    expect(mocks.archiveAttempt).not.toHaveBeenCalled();
  });

  it('ไม่ผ่าน feature flag → 403', async () => {
    mocks.enabled.mockResolvedValue(false);
    expect((await post({ attemptKey: 'attempt-key-0001' })).status).toBe(403);
    expect(mocks.archiveAttempt).not.toHaveBeenCalled();
  });

  it('body ผิด (ไม่มี attemptKey / รูปแบบไม่ถูก) → 400', async () => {
    expect((await post({})).status).toBe(400);
    expect((await post({ attemptKey: 'สั้น' })).status).toBe(400);
    expect(mocks.archiveAttempt).not.toHaveBeenCalled();
  });

  it('เก็บถังทั้งรอบของผู้เรียนคนนั้นเท่านั้น', async () => {
    const res = await post({ attemptKey: 'attempt-key-0001' });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.archived).toBe(6);
    expect(mocks.archiveAttempt).toHaveBeenCalledWith({ userId: 'u1', attemptKey: 'attempt-key-0001' });
  });

  it('ฐานข้อมูลใช้ไม่ได้ → 503 พร้อมข้อความกลาง (ไม่เผยรายละเอียด error)', async () => {
    mocks.archiveAttempt.mockRejectedValue(new Error('relation "ai_tutor_messages" does not exist'));

    const res = await post({ attemptKey: 'attempt-key-0001' });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('ระบบ AI Tutor ยังไม่พร้อมให้บริการชั่วคราว กรุณาลองใหม่อีกครั้ง');
    expect(JSON.stringify(body)).not.toContain('ai_tutor_messages');
  });

  it('จำกัด 30 ครั้ง/นาที → 429 พร้อม Retry-After', async () => {
    await post({ attemptKey: 'attempt-key-0001' });
    expect(mocks.minuteLimit).toHaveBeenCalledWith('u1', { keySuffix: 'ai-tutor:end', maxRequests: 30 });

    mocks.minuteLimit.mockResolvedValue(new Response(JSON.stringify({ success: false, error: 'Too many requests' }), {
      status: 429,
      headers: { 'Retry-After': '60' },
    }));
    mocks.archiveAttempt.mockClear();
    const res = await post({ attemptKey: 'attempt-key-0001' });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
    expect(mocks.archiveAttempt).not.toHaveBeenCalled();
  });
});
