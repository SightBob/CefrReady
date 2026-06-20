import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { checkIpThrottle, checkUserRateLimit } from '@/lib/api-security';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const createUserSchema = z.object({
  // SECURITY: email is accepted for backward compatibility but ignored —
  // the server always uses the session email. See POST handler.
  email: z.string().email().optional(),
  name: z.string().max(200).optional(),
  image: z.string().url().optional(),
});

export async function GET(request: Request) {
  const ipThrottleError = await checkIpThrottle(request, { keySuffix: 'users-get' });
  if (ipThrottleError) return ipThrottleError;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitError = await checkUserRateLimit(session.user.id!, { windowMs: 60_000, maxRequests: 5, keySuffix: 'users-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, session.user.email))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json([user]);
  } catch (error) {
    console.error('[users] Failed to fetch user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ipThrottleError = await checkIpThrottle(request, { keySuffix: 'users-post' });
  if (ipThrottleError) return ipThrottleError;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitError = await checkUserRateLimit(session.user.id!, { windowMs: 60_000, maxRequests: 5, keySuffix: 'users-post' });
  if (rateLimitError) return rateLimitError;

  try {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 });
    }
    const { name, image } = parsed.data;
    const id = `user_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 9)}`;
    // SECURITY: the email always comes from the authenticated session, never
    // from the request body. Letting an authenticated user pick an arbitrary
    // email would let them spawn rows for other people's addresses and pollute
    // admin views / dashboard stats / the OAuth account-linking flow. We also
    // ignore the body's email field entirely so a missing/typo'd session email
    // can never be papered over with a client-supplied one.
    const [user] = await db
      .insert(schema.users)
      .values({ id, email: session.user.email, name, image })
      .onConflictDoNothing({ target: schema.users.email })
      .returning();

    // If the row already existed (race or duplicate call), return the existing
    // record so the client behaves idempotently instead of getting a 201.
    if (!user) {
      const [existing] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, session.user.email))
        .limit(1);
      return NextResponse.json(existing, { status: 200 });
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('[users] Failed to upsert user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}