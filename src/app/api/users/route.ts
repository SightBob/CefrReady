import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { checkIpThrottle, checkUserRateLimit } from '@/lib/api-security';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
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
    const { email, name, image } = parsed.data;
    const id = `user_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 9)}`;
    const [user] = await db.insert(schema.users).values({ id, email, name, image }).returning();
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}