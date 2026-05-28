import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contactMessages } from '@/db/schema';
import { z } from 'zod';
import { rateLimit, rateLimitResponse, getRateLimitIdentifier } from '@/lib/rate-limit';

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

export async function POST(request: NextRequest) {
  const rl = await rateLimit(getRateLimitIdentifier(request), { windowMs: 60_000, maxRequests: 3 });
  if (rl.limited) return rateLimitResponse(rl.retryAfterMs);

  try {
    const body = await request.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ถูกต้อง', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await db.insert(contactMessages).values({
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
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
