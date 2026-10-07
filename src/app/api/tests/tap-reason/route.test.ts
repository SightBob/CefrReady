import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_TAP_AI_SETTINGS } from '@/lib/tap-ai';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), origin: vi.fn(), rate: vi.fn(), select: vi.fn(), settings: vi.fn(), evaluate: vi.fn() }));
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/api-security', () => ({ validateOrigin: mocks.origin, checkUserRateLimit: mocks.rate }));
vi.mock('@/db', () => ({ db: { select: mocks.select } }));
vi.mock('@/lib/tap-ai-settings', () => ({ getTapAiSettings: mocks.settings }));
vi.mock('@/lib/openrouter', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/openrouter')>(), evaluateTapReason: mocks.evaluate }));
import { POST } from './route';
import { TapAiError } from '@/lib/openrouter';

const row = { tapExercise: { title: 'Practice', items: [{ prompt: 'She ___ daily.', choiceA: 'go', choiceB: 'goes', correct: 1 }] }, explanation: 'Third-person singular', grammarTopic: 'Present simple' };
const body = { testSetId: 1, questionId: 2, itemIndex: 0, selectedAnswer: 'B', reason: 'She เป็นเอกพจน์' };
const request = (patch = {}) => new NextRequest('http://localhost:3000/api/tests/tap-reason', { method: 'POST', body: JSON.stringify({ ...body, ...patch }) });
function rows(data: unknown[]) {
  const builder: Record<string, unknown> = {};
  for (const key of ['from', 'innerJoin', 'where']) builder[key] = vi.fn(() => builder);
  builder.limit = vi.fn().mockResolvedValue(data);
  return builder;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'learner' } });
  mocks.origin.mockReturnValue(null);
  mocks.rate.mockResolvedValue(null);
  mocks.select.mockReturnValue(rows([row]));
  mocks.settings.mockResolvedValue({ ...DEFAULT_TAP_AI_SETTINGS, enabled: true, model: 'provider/model' });
  mocks.evaluate.mockResolvedValue({ understanding: 'correct', feedback: 'เข้าใจถูกต้อง' });
});

describe('POST tap-reason', () => {
  it('rejects disallowed origins before auth or AI work', async () => {
    const error = NextResponse.json({}, { status: 403 }); mocks.origin.mockReturnValue(error);
    expect(await POST(request())).toBe(error); expect(mocks.auth).not.toHaveBeenCalled();
  });
  it('requires authentication', async () => {
    mocks.auth.mockResolvedValue(null); expect((await POST(request())).status).toBe(401); expect(mocks.select).not.toHaveBeenCalled();
  });
  it('enforces a six request per minute user limit', async () => {
    const error = NextResponse.json({}, { status: 429 }); mocks.rate.mockResolvedValue(error);
    expect(await POST(request())).toBe(error);
    expect(mocks.rate).toHaveBeenCalledWith('learner', { keySuffix: 'tap-reason-ai', maxRequests: 6 });
    expect(mocks.evaluate).not.toHaveBeenCalled();
  });
  it.each([{ reason: 'x'.repeat(1501) }, { selectedAnswer: 'C' }, { itemIndex: -1 }, { model: 'evil/model' }, { correctAnswer: 'A' }])('rejects malformed or client-supplied grading inputs %#', async patch => {
    expect((await POST(request(patch))).status).toBe(400); expect(mocks.select).not.toHaveBeenCalled();
  });
  it('accepts an empty reason without failing', async () => {
    const response = await POST(request({ reason: '' }));
    expect(response.status).toBe(200);
    expect(mocks.evaluate).toHaveBeenCalledTimes(1);
  });
  it('prefills a server-side explanation request when the reason is blank', async () => {
    await POST(request({ reason: '   ' }));
    const context = mocks.evaluate.mock.calls[0][1];
    expect(context.reason).toContain('ยังไม่ได้เขียนเหตุผล');
    expect(context.reason).not.toBe(context.reason.trim() && '   ');
  });
  it('rejects missing/non-Tap question items', async () => {
    mocks.select.mockReturnValue(rows([{ ...row, tapExercise: null }]));
    expect((await POST(request())).status).toBe(404); expect(mocks.evaluate).not.toHaveBeenCalled();
  });
  it('checks the original stored choice, using database context for AI', async () => {
    const response = await POST(request({ selectedAnswer: 'A' }));
    expect(await response.json()).toMatchObject({ success: true, data: { isCorrect: false, ai: { understanding: 'correct' } } });
    expect(mocks.evaluate.mock.calls[0][1]).toMatchObject({ item: row.tapExercise.items[0], explanation: row.explanation, selectedAnswer: 'A' });
  });
  it('returns a clearly labeled choice-only check when AI is disabled', async () => {
    mocks.settings.mockResolvedValue(DEFAULT_TAP_AI_SETTINGS);
    const response = await POST(request());
    expect(await response.json()).toMatchObject({ success: true, data: { isCorrect: true, ai: null } });
    expect(mocks.evaluate).not.toHaveBeenCalled();
  });
  it('returns safe retryable provider errors without a fake successful result', async () => {
    mocks.evaluate.mockRejectedValue(new TapAiError(504, 'AI ใช้เวลานาน'));
    const response = await POST(request()); expect(response.status).toBe(504);
    expect(await response.json()).toEqual({ success: false, error: 'AI ใช้เวลานาน' });
  });
  it('fails closed when AI settings storage is unavailable', async () => {
    mocks.settings.mockRejectedValue(new Error('secret redis credentials'));
    const response = await POST(request()); expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('secret');
  });
});
