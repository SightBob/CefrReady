import GoogleProvider from 'next-auth/providers/google';
import type { NextAuthConfig, DefaultSession } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

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
    // authorized() runs in Edge — controls middleware access.
    // auth.user is populated from the JWT cookie — no DB call required.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const protectedRoutes = ['/admin', '/progress', '/tests'];
      const isProtected = protectedRoutes.some((r) => nextUrl.pathname.startsWith(r));

      if (isProtected && !isLoggedIn) {
        return Response.redirect(new URL('/', nextUrl));
      }

      return true;
    },
  },
};
