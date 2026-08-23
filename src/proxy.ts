import NextAuth from 'next-auth';
import {
  NextResponse,
  type NextFetchEvent,
  type NextMiddleware,
  type NextRequest,
} from 'next/server';
import { authConfig } from '@/lib/auth.config';
import { buildCsp } from '@/lib/csp';
import { isAdminEmail } from '@/lib/admin-identity';
import { isMaintenanceMode, resolveMaintenanceAction } from '@/lib/maintenance';

/**
 * Proxy uses the lightweight auth config (NO DB and NO pg).
 *
 * Route protection is handled via the `authorized` callback in auth.config.ts.
 * This replaces the manual cookie-name check that was fragile and implementation-specific.
 *
 * Import chain: proxy → auth.config → GoogleProvider
 *                                   ↳ NO @/db, NO drizzle-orm, NO pg
 */
const { auth } = NextAuth(authConfig);

// SECURITY: besides auth, the proxy issues a per-request CSP nonce and sets
// the Content-Security-Policy header (report M1). The nonce reaches server
// components through the x-nonce request header so they can mark their
// inline scripts (JSON-LD, GA bootstrap) as trusted.
const securityProxy = auth(async function cspNonceProxy(request) {
  const { pathname } = request.nextUrl;

  // MAINTENANCE: checked first so a closed site never leaks page or API
  // responses. Admins bypass via the JWT isAdmin claim (or bootstrap email)
  // so the team can keep working and flip the flag back off. The maintenance
  // page itself must stay reachable to be a redirect target, and auth/health
  // APIs stay open so admins can still sign in.
  const isBypassed =
    request.auth?.user?.isAdmin === true || isAdminEmail(request.auth?.user?.email);
  const maintFlag = await isMaintenanceMode();
  const action = resolveMaintenanceAction(pathname, isBypassed, maintFlag);
  if (action === 'api-503') {
    return NextResponse.json(
      {
        success: false,
        error: 'ระบบปิดปรับปรุงชั่วคราว กรุณาลองใหม่ภายหลัง',
      },
      { status: 503, headers: { 'Retry-After': '3600' } }
    );
  }
  if (action === 'redirect') {
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  const nonce = btoa(crypto.randomUUID());
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(
    'Content-Security-Policy',
    buildCsp(nonce, process.env.NODE_ENV === 'development')
  );
  return response;
}) as unknown as NextMiddleware;

export function proxy(request: NextRequest, event: NextFetchEvent) {
  return securityProxy(request, event);
}

export const config = {
  // MAINTENANCE: api/auth and api/health are excluded so sign-in and uptime
  // checks keep working while every other /api/* route flows through the
  // maintenance gate above.
  matcher: [
    '/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|[^?]*\\.(?:html?|css|js|png|jpg|jpeg|gif|svg|ico|webp)).*)',
  ],
};
