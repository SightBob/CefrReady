import { auth } from './auth';
import { NextResponse } from 'next/server';

const ADMIN_EMAIL = 'pawatsaekoo@gmail.com';

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.email) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      session: null
    };
  }

  if (session.user.email !== ADMIN_EMAIL) {
    return {
      error: NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 }),
      session: null
    };
  }

  return { error: null, session };
}