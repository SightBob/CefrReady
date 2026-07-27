import NextAuth from 'next-auth';
import {
  NextResponse,
  type NextFetchEvent,
  type NextMiddleware,
  type NextRequest,
} from 'next/server';
import { authConfig } from '@/lib/auth.config';

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
const continueRequest: NextMiddleware = () => NextResponse.next();
const authProxy = auth(continueRequest);

export function proxy(request: NextRequest, event: NextFetchEvent) {
  return authProxy(request, event);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|[^?]*\\.(?:html?|css|js|png|jpg|jpeg|gif|svg|ico|webp)).*)',
  ],
};
