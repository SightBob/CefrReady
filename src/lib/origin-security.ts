import { NextResponse } from 'next/server';

/**
 * SECURITY: CSRF origin allow-list.
 *
 * Origins are compared by full URL equality (`protocol://host`) — never by
 * substring match. A `startsWith` check would let an attacker register a
 * look-alike domain like `https://cefr-ready.site.evil.com` and pass the
 * check, so we resolve the Origin header to its base URL and require an
 * exact match against this set.
 */
const ALLOWED_ORIGINS = [
  process.env.NEXTAUTH_URL,
  'https://cefr-ready.site',
  'https://cefr-ready.vercel.app',
  'http://localhost:3000',
].filter(Boolean) as string[];

const ALLOWED_ORIGIN_SET = new Set(ALLOWED_ORIGINS);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    const base = `${u.protocol}//${u.host}`;
    return ALLOWED_ORIGIN_SET.has(base);
  } catch {
    return false;
  }
}

/**
 * SECURITY: validate the Origin/Referer header on mutating requests.
 *
 * Returns a 403 NextResponse when the request is cross-origin, and a 403 when
 * the Origin header is missing entirely. Browsers always send Origin (or
 * Referer) on credentialed POST/PUT/PATCH/DELETE requests, so an absent header
 * on a mutating request is suspicious — we fail closed instead of skipping the
 * check (the previous behavior let curl/server-to-server callers bypass CSRF).
 */
export function requireAllowedOrigin(requestOrHeaders: Request | Headers): Response | null {
  const origin =
    requestOrHeaders instanceof Headers
      ? requestOrHeaders.get('origin') || requestOrHeaders.get('referer')
      : requestOrHeaders.headers.get('origin') || requestOrHeaders.headers.get('referer');

  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  return null;
}
