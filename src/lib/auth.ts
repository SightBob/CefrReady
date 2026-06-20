import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '../db';
import { accounts, users, verificationTokens } from '../db/schema';
import { authConfig } from './auth.config';
import { eq } from 'drizzle-orm';

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('Missing Google OAuth env vars: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

if (!process.env.NEXTAUTH_SECRET) {
  console.warn('Missing NEXTAUTH_SECRET env var - generate one with: openssl rand -base64 32');
}

// SECURITY: refuse to start the server in production with a weak JWT secret.
// NextAuth signs the session JWT with NEXTAUTH_SECRET — a short/guessable value
// lets anyone forge a session as any user (including the admin) without going
// through OAuth. A 32-char minimum matches the output of `openssl rand -base64 32`
// and rules out human-chosen phrases.
//
// The guard runs from src/instrumentation.ts at server-runtime startup only;
// it cannot live here because `next build` evaluates this module with
// NODE_ENV=production and would trip the check at build time.

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

// See auth.config.ts for the explanation of AnyTable
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any;

// NOTE: sessions table is intentionally omitted — JWT strategy doesn't use it
const adapter = DrizzleAdapter(db, {
  usersTable: users as AnyTable,
  accountsTable: accounts as AnyTable,
  verificationTokensTable: verificationTokens as AnyTable,
});

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,

  // --- JWT strategy: session is a signed cookie, NOT stored in DB ---
  // This is required for Edge middleware to verify sessions without a DB query.
  // The adapter still handles OAuth account linking + user creation in the DB.
  session: { strategy: 'jwt' },

  adapter,

  callbacks: {
    ...authConfig.callbacks,

    // jwt() — runs on sign-in and every request in middleware/server components.
    // Store userId and isAdmin in the token so Edge can read them from the cookie.
    async jwt({ token, user }) {
      if (user && ADMIN_EMAIL) {
        // First sign-in: user object is populated — fetch DB id and set admin flag
        token.id = user.id;
        token.isAdmin = user.email === ADMIN_EMAIL;
      }
      return token;
    },

    // session() — runs when reading session in server components / client hooks.
    // Map token fields back onto session.user so code can do session.user.id etc.
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
});
