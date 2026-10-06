import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractUsage } from './openrouter';

// extractUsage is best-effort telemetry: a payload missing usage, or usage with
// missing fields (seen in the wild: only completion_tokens), must never throw
// and must never report 0/0 tokens as real usage.
describe('extractUsage', () => {
  const model = 'provider/model';
  const startedAt = Date.now() - 500;

  it('returns null when the payload has no usage block', () => {
    expect(extractUsage({ choices: [{ finish_reason: 'stop', message: { content: '{}' } }] }, model, startedAt)).toBeNull();
  });

  it('reads a complete usage block and measures latency', () => {
    const usage = extractUsage(
      { choices: [{ finish_reason: 'stop', message: { content: '{}' } }], usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 } },
      model,
      startedAt,
    );
    expect(usage).toMatchObject({ promptTokens: 100, completionTokens: 50, totalTokens: 150, model });
    expect(usage?.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('fills total_tokens from prompt + completion when total is missing', () => {
    const usage = extractUsage(
      { choices: [{ finish_reason: 'stop', message: { content: '{}' } }], usage: { prompt_tokens: 100, completion_tokens: 50 } },
      model,
      startedAt,
    );
    expect(usage?.totalTokens).toBe(150);
  });

  it('returns null when usage has no token counts at all (e.g. only details)', () => {
    expect(extractUsage(
      { choices: [{ finish_reason: 'stop', message: { content: '{}' } }], usage: { completion_tokens_details: { reasoning_tokens: 1192 } } },
      model,
      startedAt,
    )).toBeNull();
  });

  it('never throws on a completely malformed payload', () => {
    expect(extractUsage('not an object', model, startedAt)).toBeNull();
    expect(extractUsage(null, model, startedAt)).toBeNull();
  });
});
