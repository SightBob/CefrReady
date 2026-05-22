import { auth } from './auth';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

const ALLOWED_ORIGINS = [
  process.env.NEXTAUTH_URL || 'https://cefr-ready.site',
  'https://cefr-ready.site',
  'https://cefr-ready.vercel.app',
  'http://localhost:3000',
];

export async function requireAdmin() {
  // CSRF: validate origin on mutating requests
  const reqHeaders = await headers();
  const origin = reqHeaders.get('origin') || reqHeaders.get('referer');
  if (origin && !ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), session: null };
  }

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
