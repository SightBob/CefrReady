import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TAP_AI_SETTINGS } from './tap-ai';
const mocks = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock('@upstash/redis', () => ({ Redis: class { get = mocks.get; set = mocks.set; } }));
import { getTapAiSettings, saveTapAiSettings } from './tap-ai-settings';
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.test'); vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test');
  mocks.get.mockResolvedValue(null); mocks.set.mockResolvedValue('OK');
});
afterEach(() => vi.unstubAllEnvs());
describe('Tap AI settings storage', () => {
  it('defaults to disabled if no configuration exists', async () => {
    expect(await getTapAiSettings()).toEqual(DEFAULT_TAP_AI_SETTINGS);
    expect(mocks.get).toHaveBeenCalledWith('ai:tap-select:settings');
  });
  it('writes only the dedicated AI key, never maintenance or credentials', async () => {
    await saveTapAiSettings(DEFAULT_TAP_AI_SETTINGS);
    expect(mocks.set).toHaveBeenCalledExactlyOnceWith('ai:tap-select:settings', DEFAULT_TAP_AI_SETTINGS);
  });
  it('rejects corrupt stored configuration rather than failing open', async () => {
    mocks.get.mockResolvedValue({ enabled: true }); await expect(getTapAiSettings()).rejects.toThrow();
  });
  it('does not quietly ignore missing storage credentials', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', ''); await expect(getTapAiSettings()).rejects.toThrow('not configured');
    expect(mocks.get).not.toHaveBeenCalled();
  });
});
