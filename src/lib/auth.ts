import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { accounts, users, verificationTokens } from '../db/schema';
import { usersForAuth } from '../db/auth-compat';
import { authConfig } from './auth.config';
import { isAdminEmail } from './admin-identity';

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

// See auth.config.ts for the explanation of AnyTable
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any;

// NOTE: sessions table is intentionally omitted — JWT strategy doesn't use it
//
// usersTable ที่ส่งให้ adapter = "มุมมอง" ของตาราง users ที่ตัดคอลัมน์ของฟีเจอร์
// AI Tutor (users.ai_tutor_access จาก migration 0045) ออก
// เหตุผล: adapter อ่านด้วย `db.select().from(usersTable)` (ไม่ระบุคอลัมน์) → drizzle
// จะ select ทุกคอลัมน์ใน schema รวมทั้ง ai_tutor_access → ถ้า migration ยังไม่รัน
// การล็อกอิน/สมัครผ่าน OAuth จะพัง แม้ฟีเจอร์ AI Tutor จะปิดอยู่ก็ตาม
// ดูรายละเอียดที่ src/db/auth-compat.ts
const adapter = DrizzleAdapter(db, {
  usersTable: usersForAuth as AnyTable,
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
    // Store userId, isAdmin and isTaster in the token so Edge can read them from the cookie.
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        const dbUser = await db
          .select({ isAdmin: users.isAdmin, isTaster: users.isTaster })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1)
          .then((rows) => rows[0]);
        token.isAdmin = dbUser?.isAdmin === true || isAdminEmail(user.email);
        token.isTaster = dbUser?.isTaster === true;
      }
      return token;
    },

    // session() — runs when reading session in server components / client hooks.
    // Map token fields back onto session.user so code can do session.user.id etc.
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.isTaster = token.isTaster as boolean;
      }
      return session;
    },
  },
});
