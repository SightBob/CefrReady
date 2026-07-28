import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contactMessages, testAttempts } from '@/db/schema';
import { z } from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { auth } from '@/lib/auth';
import { and, eq, ilike } from 'drizzle-orm';

export const SURVEY_MESSAGE_PREFIX = '[Mini Survey]';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  const scope = request.nextUrl.searchParams.get('scope');
  if (scope !== 'survey') {
    return NextResponse.json({ success: false, error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const [existing, attempts] = await Promise.all([
    db
      .select({ id: contactMessages.id })
      .from(contactMessages)
      .where(
        and(
          eq(contactMessages.userId, session.user.id),
          ilike(contactMessages.message, `${SURVEY_MESSAGE_PREFIX}%`),
        ),
      )
      .limit(1),
    db
      .select({ id: testAttempts.id })
      .from(testAttempts)
      .where(eq(testAttempts.userId, session.user.id))
      .limit(1),
  ]);

  return NextResponse.json({
    success: true,
    submitted: existing.length > 0,
    eligible: attempts.length > 0,
  });
}

const contactSchema = z.object({
  message: z.string().trim().min(1).max(5000),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  }

  const rateLimitKey = `user:${session.user.id}:contacts`;

  const perMinuteRl = await rateLimit(`${rateLimitKey}:minute`, { windowMs: 60_000, maxRequests: 3 });
  if (perMinuteRl.limited) return rateLimitResponse(perMinuteRl.retryAfterMs);

  const perDayRl = await rateLimit(`${rateLimitKey}:daily`, { windowMs: 86_400_000, maxRequests: 10 });
  if (perDayRl.limited) return rateLimitResponse(perDayRl.retryAfterMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'ข้อมูลไม่ถูกต้อง', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    await db.insert(contactMessages).values({
      userId: session.user.id,
      message: parsed.data.message,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[contacts] Failed to save message:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถส่งข้อความได้' },
      { status: 500 }
    );
  }
}
