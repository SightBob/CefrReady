import { auth } from './auth';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { requireAllowedOrigin } from './origin-security';
import { isAdminEmail } from './admin-identity';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * ตรวจสิทธิ์ผู้ดูแลสำหรับคำขอ "อ่าน" (GET) — ไม่เช็ค Origin เพราะไม่มี side effect
 * และเบราว์เซอร์ไม่ส่ง Origin กับการเรียก GET ทุกครั้ง
 * ใช้กับโหมดพรีวิวที่หน้าผู้เรียนเรียกกลับมา (เช่น ?preview=1) เท่านั้น
 */
export async function isAdminRequest(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.email) return false;
  // Bootstrap email ผ่านเสมอ (เส้นทางกู้คืนสิทธิ์)
  if (isAdminEmail(session.user.email)) return true;

  const dbUser = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
    .then((rows) => rows[0]);

  return dbUser?.isAdmin === true;
}

export async function requireAdmin() {
  // SECURITY: CSRF check on mutating requests — requires a browser-issued
  // Origin/Referer header and compares the full URL against the allow-list.
  // See origin-security.ts for why we no longer use startsWith or skip the
  // check when the header is missing.
  const reqHeaders = await headers();
  const originError = requireAllowedOrigin(reqHeaders);
  if (originError) {
    return { error: originError, session: null };
  }

  const session = await auth();

  if (!session?.user?.email) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      session: null
    };
  }

  // SECURITY (report L9): JWT isAdmin is only refreshed at sign-in, so a
  // demoted admin would keep access until token expiry. Re-check the DB flag
  // on every admin API call. Bootstrap email always passes (recovery path).
  const isBootstrapAdmin = isAdminEmail(session.user.email);
  if (!isBootstrapAdmin) {
    const dbUser = await db
      .select({ isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)
      .then((rows) => rows[0]);

    if (dbUser?.isAdmin !== true) {
      return {
        error: NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 }),
        session: null
      };
    }
  }

  return { error: null, session };
}
