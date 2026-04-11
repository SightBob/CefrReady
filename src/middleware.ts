import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

/**
 * Middleware uses the Edge-compatible auth config (NO DB, NO pg, NO Node.js crypto).
 *
 * Route protection is handled via the `authorized` callback in auth.config.ts.
 * This replaces the manual cookie-name check that was fragile and implementation-specific.
 *
 * Import chain: middleware → auth.config → GoogleProvider (Edge-safe)
 *                                            ↳ NO @/db, NO drizzle-orm, NO pg
 */
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|[^?]*\\.(?:html?|css|js|png|jpg|jpeg|gif|svg|ico|webp)).*)',
  ],
};