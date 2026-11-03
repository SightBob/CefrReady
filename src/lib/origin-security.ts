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
  // Extra origins (e.g. a local preview server on another port) injected
  // via env — comma-separated, full base URLs. Never hardcode tunnel domains.
  ...(process.env.ADMIN_EXTRA_ORIGINS
    ? process.env.ADMIN_EXTRA_ORIGINS.split(',').map((s) => s.trim())
    : []),
  'https://cefr-ready.site',
  'https://cefr-ready.vercel.app',
  'http://localhost:3000',
].filter(Boolean) as string[];

const ALLOWED_ORIGIN_SET = new Set(ALLOWED_ORIGINS);

function toBaseUrl(origin: string | null): string | null {
  if (!origin) return null;
  try {
    const u = new URL(origin);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

/**
 * Same-origin แบบอิง request เอง — จำเป็นเมื่อเซิร์ฟเวอร์ไม่ได้ฟังที่พอร์ต/โดเมน
 * ใน allow-list (เช่น `next dev` เลือกพอร์ตอื่นเมื่อ 3000 ไม่ว่าง หรือ preview
 * deployment ของ Vercel ที่มีโดเมนสุ่ม). ปลอดภัยเพราะเบราว์เซอร์กำหนดค่า
 * `Host` header เองไม่ได้ (forbidden header) — ผู้โจมตีจึงปลอม Host ให้ตรงกับ
 * Origin ของตนไม่ได้
 */
function isSameOriginAsRequest(base: string, headers: Headers): boolean {
  // หลัง reverse proxy (Vercel/Cloudflare) host ที่แอปเห็นอาจเป็น internal —
  // ใช้ x-forwarded-host / x-forwarded-proto ที่ proxy ใส่มาก่อนเมื่อมี
  const forwardedHost = headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const host = forwardedHost || headers.get('host');
  if (!host) return false;
  if (forwardedProto) return base === `${forwardedProto}://${host}`;
  try {
    return new URL(base).host === host;
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
  const headers = requestOrHeaders instanceof Headers ? requestOrHeaders : requestOrHeaders.headers;
  const base = toBaseUrl(headers.get('origin') || headers.get('referer'));

  const allowed = base !== null && (ALLOWED_ORIGIN_SET.has(base) || isSameOriginAsRequest(base, headers));
  if (!allowed) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  return null;
}
