import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  rateLimit: vi.fn(),
  rateLimitResponse: vi.fn(),
  values: vi.fn(),
  insert: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: mocks.rateLimit,
  rateLimitResponse: mocks.rateLimitResponse,
}));
vi.mock('@/db', () => ({ db: { insert: mocks.insert } }));
vi.mock('@/db/schema', () => ({ contactMessages: Symbol('contactMessages') }));

import { POST } from './route';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/contacts', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function rawRequest(body: string) {
  return new NextRequest('http://localhost/api/contacts', {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/contacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: 'session-user' } });
    mocks.rateLimit.mockResolvedValue({ limited: false, retryAfterMs: 0 });
    mocks.insert.mockReturnValue({ values: mocks.values });
    mocks.values.mockResolvedValue(undefined);
  });

  it('returns 401 before invoking rate limiting when unauthenticated', async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await POST(request({ message: 'hello' }));

    expect(response.status).toBe(401);
    expect(mocks.rateLimit).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', {}],
    ['empty', { message: '' }],
    ['whitespace-only', { message: '   ' }],
    ['longer than 5000 characters after trimming', { message: 'x'.repeat(5001) }],
  ])('rejects an invalid %s message', async (_label, body) => {
    const response = await POST(request(body));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ success: false, error: 'ข้อมูลไม่ถูกต้อง' });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('stores the trimmed message with identity solely from the session', async () => {
    const response = await POST(request({
      message: '  สวัสดีครับ  ',
      userId: 'spoofed-user',
      email: 'spoof@example.com',
      name: 'Spoofed Name',
      subject: 'Spoofed Subject',
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(mocks.values).toHaveBeenCalledWith({
      userId: 'session-user',
      message: 'สวัสดีครับ',
    });
    expect(mocks.rateLimit).toHaveBeenNthCalledWith(1, 'user:session-user:contacts:minute', {
      windowMs: 60_000,
      maxRequests: 3,
    });
    expect(mocks.rateLimit).toHaveBeenNthCalledWith(2, 'user:session-user:contacts:daily', {
      windowMs: 86_400_000,
      maxRequests: 10,
    });
  });

  it('returns Thai 400 for malformed JSON without writing to the database', async () => {
    const response = await POST(rawRequest('{'));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ success: false, error: 'ข้อมูลไม่ถูกต้อง' });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('returns the rate-limit response when the per-minute limit is exceeded', async () => {
    const limitedResponse = new Response(null, { status: 429 });
    mocks.rateLimit.mockResolvedValueOnce({ limited: true, retryAfterMs: 1234 });
    mocks.rateLimitResponse.mockReturnValue(limitedResponse);

    const response = await POST(request({ message: 'hello' }));

    expect(response).toBe(limitedResponse);
    expect(mocks.rateLimit).toHaveBeenCalledTimes(1);
    expect(mocks.rateLimit).toHaveBeenCalledWith('user:session-user:contacts:minute', {
      windowMs: 60_000,
      maxRequests: 3,
    });
    expect(mocks.rateLimitResponse).toHaveBeenCalledWith(1234);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('returns the rate-limit response when the daily limit is exceeded', async () => {
    const limitedResponse = new Response(null, { status: 429 });
    mocks.rateLimit
      .mockResolvedValueOnce({ limited: false, retryAfterMs: 0 })
      .mockResolvedValueOnce({ limited: true, retryAfterMs: 5678 });
    mocks.rateLimitResponse.mockReturnValue(limitedResponse);

    const response = await POST(request({ message: 'hello' }));

    expect(response).toBe(limitedResponse);
    expect(mocks.rateLimit).toHaveBeenNthCalledWith(2, 'user:session-user:contacts:daily', {
      windowMs: 86_400_000,
      maxRequests: 10,
    });
    expect(mocks.rateLimitResponse).toHaveBeenCalledWith(5678);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('returns the existing Thai 500 response when saving fails', async () => {
    mocks.values.mockRejectedValue(new Error('database unavailable'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await POST(request({ message: 'hello' }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ success: false, error: 'ไม่สามารถส่งข้อความได้' });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
