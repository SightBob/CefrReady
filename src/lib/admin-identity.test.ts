import { describe, expect, it } from 'vitest';
import { ADMIN_EMAIL, isAdminEmail } from './admin-identity';

describe('isAdminEmail', () => {
  // REGRESSION: with ADMIN_EMAIL unset, configuredAdminEmail was undefined,
  // so isAdminEmail(undefined) matched undefined === undefined and treated
  // EVERY anonymous visitor as an admin (maintenance bypass hole).
  it('returns false for missing/empty emails', () => {
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail('')).toBe(false);
    expect(isAdminEmail('   ')).toBe(false);
  });

  it('accepts the bootstrap admin email always', () => {
    expect(isAdminEmail('pawatsaekoo@gmail.com')).toBe(true);
    expect(isAdminEmail('Pawatsaekoo@Gmail.com')).toBe(true);
  });

  it('accepts ADMIN_EMAIL when properly configured', () => {
    // ADMIN_EMAIL export falls back to DEFAULT when unset, so this holds
    // regardless of environment.
    expect(ADMIN_EMAIL.length).toBeGreaterThan(0);
    expect(isAdminEmail(ADMIN_EMAIL)).toBe(true);
  });

  it('rejects regular user emails', () => {
    expect(isAdminEmail('someone@example.com')).toBe(false);
  });
});
