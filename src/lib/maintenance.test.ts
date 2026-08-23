import { describe, expect, it } from 'vitest';
import { parseMaintenanceValue, resolveMaintenanceAction } from './maintenance';

describe('parseMaintenanceValue', () => {
  it('treats string "1" as enabled', () => {
    expect(parseMaintenanceValue('1')).toBe(true);
  });

  // REGRESSION: @upstash/redis deserializes numeric strings to numbers,
  // so redis.get returned 1 (number) and `value === "1"` never matched.
  it('treats numeric 1 as enabled (Upstash client coercion)', () => {
    expect(parseMaintenanceValue(1)).toBe(true);
  });

  it('treats everything else as disabled', () => {
    expect(parseMaintenanceValue('0')).toBe(false);
    expect(parseMaintenanceValue(0)).toBe(false);
    expect(parseMaintenanceValue(null)).toBe(false);
    expect(parseMaintenanceValue(undefined)).toBe(false);
  });
});

describe('resolveMaintenanceAction', () => {
  it('allows everything when the flag is OFF', () => {
    expect(resolveMaintenanceAction('/', false, false)).toBe('allow');
    expect(resolveMaintenanceAction('/tests', false, false)).toBe('allow');
  });

  it('lets admins bypass everything when the flag is ON', () => {
    expect(resolveMaintenanceAction('/', true, true)).toBe('allow');
    expect(resolveMaintenanceAction('/api/admin/maintenance', true, true)).toBe('allow');
  });

  it('redirects pages when the flag is ON', () => {
    expect(resolveMaintenanceAction('/', false, true)).toBe('redirect');
    expect(resolveMaintenanceAction('/tests', false, true)).toBe('redirect');
  });

  it('keeps /maintenance itself reachable', () => {
    expect(resolveMaintenanceAction('/maintenance', false, true)).toBe('allow');
  });

  it('returns 503 for API routes when ON', () => {
    expect(resolveMaintenanceAction('/api/tests', false, true)).toBe('api-503');
    expect(resolveMaintenanceAction('/api/progress', false, true)).toBe('api-503');
  });
});
