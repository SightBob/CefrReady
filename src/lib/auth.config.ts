import GoogleProvider from 'next-auth/providers/google';
import type { NextAuthConfig, DefaultSession } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import { isAdminEmail } from './admin-identity';

/**
 * Edge-compatible auth config — NO database adapter, NO Node.js modules.
 *
 * Used by:
 * - middleware.ts (Edge Runtime)
 *
 * Must NOT import anything from:
 * - @/db (pulls in pg → Node.js crypto)
 * - drizzle-orm
 * - Any Node.js-only package
 *
 * The full auth config (with DB adapter + JWT callbacks) lives in auth.ts
 * and is used only in Server Components / Route Handlers.
 *
 * WHY jwt strategy?
 * - database strategy stores a random session token → middleware must query DB to verify
 * - DB uses pg which uses Node.js crypto → crashes Edge runtime
 * - jwt strategy stores a signed cookie → Edge verifies with Web Crypto (no DB needed)
 */

// --- TypeScript module augmentation ---
// Extend the Session and JWT types to include our custom fields.
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    isAdmin?: boolean;
  }
}

export const authConfig: NextAuthConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/',
  },
  callbacks: {
    // Map JWT fields onto the session. REQUIRED here (not just in auth.ts):
    // src/proxy.ts builds its middleware from this config alone, so without
    // this callback auth.user.isAdmin is undefined in the proxy and every
    // DB-promoted admin gets redirected out of /admin even though their
    // session is genuinely admin. Edge-safe — reads the token only, no DB.
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },

    // authorized() runs in Edge — controls middleware access.
    // auth.user is populated from the JWT cookie — no DB call required.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const protectedRoutes = ['/admin'];
      const isProtected = protectedRoutes.some((r) => nextUrl.pathname.startsWith(r));

      if (isProtected) {
        if (!isLoggedIn) return Response.redirect(new URL('/', nextUrl));
        const isAuthedAdmin = auth.user?.isAdmin === true || isAdminEmail(auth.user?.email);
        if (!isAuthedAdmin) return Response.redirect(new URL('/', nextUrl));
      }

      return true;
    },
  },
};
