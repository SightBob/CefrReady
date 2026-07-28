import { auth } from './auth';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { requireAllowedOrigin } from './origin-security';
import { isAdminEmail } from './admin-identity';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
