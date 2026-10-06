import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// logAiUsage must never throw and never slow the caller: it swallows DB errors
// with a console.warn so telemetry failures can't break the tap-reason flow.
const insertMock = vi.fn();

vi.mock('@/db', () => ({
  db: {
    insert: (...args: unknown[]) => insertMock(...args),
  },
}));

vi.mock('@/db/schema', () => ({
  aiUsageLogs: { name: 'ai_usage_logs' },
}));

import { AI_FEATURE_TAP_REASON, logAiUsage } from './ai-usage';

describe('logAiUsage', () => {
  const baseEntry = {
    userId: 'user-1',
    feature: AI_FEATURE_TAP_REASON,
    model: 'provider/model',
    promptTokens: 120,
    completionTokens: 80,
    totalTokens: 200,
    status: 'ok' as const,
  };

  beforeEach(() => {
    insertMock.mockReset();
    insertMock.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('inserts one row with every provided field', async () => {
    const valuesMock = vi.fn().mockResolvedValue(undefined);
    insertMock.mockReturnValue({ values: valuesMock });

    await logAiUsage({ ...baseEntry, latencyMs: 1234, understanding: 'correct' });

    expect(valuesMock).toHaveBeenCalledTimes(1);
    expect(valuesMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      feature: 'tap_reason',
      model: 'provider/model',
      promptTokens: 120,
      completionTokens: 80,
      totalTokens: 200,
      status: 'ok',
      latencyMs: 1234,
      understanding: 'correct',
    }));
  });

  it('defaults optional fields to null instead of undefined', async () => {
    const valuesMock = vi.fn().mockResolvedValue(undefined);
    insertMock.mockReturnValue({ values: valuesMock });

    await logAiUsage(baseEntry);

    const row = valuesMock.mock.calls[0][0];
    expect(row.errorStatus).toBeNull();
    expect(row.latencyMs).toBeNull();
    expect(row.understanding).toBeNull();
  });

  it('swallows DB errors with a console.warn and never throws', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    insertMock.mockReturnValue({ values: vi.fn().mockRejectedValue(new Error('relation does not exist')) });

    await expect(logAiUsage(baseEntry)).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('[ai-usage]');
  });
});
