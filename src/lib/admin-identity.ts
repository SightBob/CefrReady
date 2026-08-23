export const DEFAULT_ADMIN_EMAIL = 'pawatsaekoo@gmail.com';

const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

export const ADMIN_EMAIL = configuredAdminEmail || DEFAULT_ADMIN_EMAIL;

export function isAdminEmail(email: string | null | undefined): boolean {
  // SECURITY REGRESSION FIX: with ADMIN_EMAIL unset, configuredAdminEmail was
  // undefined and `undefined === undefined` matched for missing emails,
  // treating every anonymous visitor as an admin. Guard explicitly.
  if (!email || !email.trim()) return false;
  const normalizedEmail = email.trim().toLowerCase();
  if (!configuredAdminEmail) return normalizedEmail === DEFAULT_ADMIN_EMAIL;
  return normalizedEmail === DEFAULT_ADMIN_EMAIL || normalizedEmail === configuredAdminEmail;
}
