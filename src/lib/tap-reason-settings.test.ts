import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TAP_REASON_REWARD_SETTINGS } from './tap-reason-rewards';

const mocks = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock('@upstash/redis', () => ({
  Redis: class {
    get = mocks.get;
    set = mocks.set;
  },
}));

import {
  getTapReasonRewardSettings,
  getTapReasonRewardSettingsSafe,
  saveTapReasonRewardSettings,
} from './tap-reason-settings';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.test');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test');
  mocks.get.mockResolvedValue(null);
  mocks.set.mockResolvedValue('OK');
});
afterEach(() => vi.unstubAllEnvs());

describe('Tap reason reward settings storage', () => {
  it('uses the flat 50-point default when nothing was saved yet', async () => {
    expect(await getTapReasonRewardSettings()).toEqual(DEFAULT_TAP_REASON_REWARD_SETTINGS);
    expect(mocks.get).toHaveBeenCalledWith('tap-reasons:reward');
  });

  it('writes only the dedicated reward key, never maintenance or credentials', async () => {
    await saveTapReasonRewardSettings({ autoAward: true, points: 30 });
    expect(mocks.set).toHaveBeenCalledExactlyOnceWith('tap-reasons:reward', { autoAward: true, points: 30 });
  });

  it('refuses to save an out-of-range flat score', async () => {
    await expect(saveTapReasonRewardSettings({ autoAward: true, points: 101 })).rejects.toThrow();
    await expect(saveTapReasonRewardSettings({ autoAward: true, points: -1 })).rejects.toThrow();
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it('falls back to the default instead of failing when the stored value is corrupt', async () => {
    mocks.get.mockResolvedValue({ autoAward: 'yes', points: 'ห้าสิบ' });
    expect(await getTapReasonRewardSettings()).toEqual(DEFAULT_TAP_REASON_REWARD_SETTINGS);
  });

  it('does not quietly ignore missing storage credentials', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    await expect(getTapReasonRewardSettings()).rejects.toThrow('not configured');
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('safe reader returns null so a submit never fails because of settings', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      mocks.get.mockRejectedValue(new Error('redis down'));
      expect(await getTapReasonRewardSettingsSafe()).toBeNull();
    } finally {
      warn.mockRestore();
    }
  });
});
