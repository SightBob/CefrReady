import NextAuth from 'next-auth';
import {
  NextResponse,
  type NextFetchEvent,
  type NextMiddleware,
  type NextRequest,
} from 'next/server';
import { authConfig } from '@/lib/auth.config';
import { buildCsp } from '@/lib/csp';

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
const securityProxy = auth(function cspNonceProxy(request) {
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
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|[^?]*\\.(?:html?|css|js|png|jpg|jpeg|gif|svg|ico|webp)).*)',
  ],
};
