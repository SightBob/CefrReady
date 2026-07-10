export const DEFAULT_ADMIN_EMAIL = 'pawatsaekoo@gmail.com';

const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

export const ADMIN_EMAIL = configuredAdminEmail || DEFAULT_ADMIN_EMAIL;

export function isAdminEmail(email: string | null | undefined): boolean {
  const normalizedEmail = email?.trim().toLowerCase();
  return normalizedEmail === DEFAULT_ADMIN_EMAIL || normalizedEmail === configuredAdminEmail;
}
