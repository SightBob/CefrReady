import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_TAP_AI_SETTINGS } from '@/lib/tap-ai';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), rate: vi.fn(), evaluate: vi.fn() }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin: mocks.auth }));
vi.mock('@/lib/api-security', () => ({ checkUserRateLimit: mocks.rate }));
vi.mock('@/lib/openrouter', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/openrouter')>(), evaluateTapReason: mocks.evaluate }));
import { POST } from './route';
import { TapAiError } from '@/lib/openrouter';
const settings = { ...DEFAULT_TAP_AI_SETTINGS, model: 'provider/model' };
const request = (body = settings) => new NextRequest('http://localhost:3000/api/admin/ai-settings/test', { method: 'POST', body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks(); mocks.auth.mockResolvedValue({ error: null, session: { user: { id: 'admin' } } });
  mocks.rate.mockResolvedValue(null); mocks.evaluate.mockResolvedValue({ understanding: 'correct', feedback: 'ถูกต้อง' });
});
describe('admin OpenRouter connection test', () => {
  it('requires admin before any provider call', async () => {
    const error = NextResponse.json({}, { status: 403 }); mocks.auth.mockResolvedValue({ error });
    expect(await POST(request())).toBe(error); expect(mocks.evaluate).not.toHaveBeenCalled();
  });
  it('limits connection tests separately from learner requests', async () => {
    const limited = NextResponse.json({}, { status: 429 }); mocks.rate.mockResolvedValue(limited);
    expect(await POST(request())).toBe(limited);
    expect(mocks.rate).toHaveBeenCalledWith('admin', { keySuffix: 'admin-tap-ai-test', maxRequests: 3 });
    expect(mocks.evaluate).not.toHaveBeenCalled();
  });
  it('requires a valid explicit model for testing', async () => {
    expect((await POST(request(DEFAULT_TAP_AI_SETTINGS))).status).toBe(400); expect(mocks.evaluate).not.toHaveBeenCalled();
  });
  it('tests draft settings even with AI disabled, using fixed nonpersonal context', async () => {
    const response = await POST(request()); expect(response.status).toBe(200);
    expect(mocks.evaluate).toHaveBeenCalledWith(settings, expect.objectContaining({ selectedAnswer: 'B', item: expect.objectContaining({ correct: 1 }) }));
    expect(settings.enabled).toBe(false);
  });
  it('returns safe provider failure feedback without a successful result', async () => {
    mocks.evaluate.mockRejectedValue(new TapAiError(502, 'ตรวจไม่สำเร็จ'));
    const response = await POST(request()); expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ success: false, error: 'ตรวจไม่สำเร็จ' });
  });
});
