import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, questionReports } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { checkIpThrottle } from '@/lib/api-security';
import { rateLimit, rateLimitResponse, getRateLimitIdentifier } from '@/lib/rate-limit';
import { z } from 'zod';

const VALID_ISSUE_TYPES = ['wrong_answer', 'missing_option', 'unclear_language', 'audio_problem', 'other'] as const;

const reportBodySchema = z.object({
  issueType: z.enum(VALID_ISSUE_TYPES),
  comment: z.string().max(1000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getRateLimitIdentifier(req);

  const ipThrottleError = await checkIpThrottle(req, { keySuffix: 'question-report' });
  if (ipThrottleError) return ipThrottleError;

  const session = await auth();
  const userId = session?.user?.id ?? null;

  if (userId) {
    const userRl = await rateLimit(`user:${userId}:report-daily`, { windowMs: 86_400_000, maxRequests: 15 });
    if (userRl.limited) return rateLimitResponse(userRl.retryAfterMs);
  } else {
    const perMinuteRl = await rateLimit(`${ip}:report-min`, { windowMs: 60_000, maxRequests: 5 });
    if (perMinuteRl.limited) return rateLimitResponse(perMinuteRl.retryAfterMs);

    const perDayRl = await rateLimit(`${ip}:report-daily`, { windowMs: 86_400_000, maxRequests: 20 });
    if (perDayRl.limited) return rateLimitResponse(perDayRl.retryAfterMs);
  }

  try {
    const { id } = await params;
    const questionId = parseInt(id);
    if (isNaN(questionId)) {
      return NextResponse.json({ error: 'Invalid question ID' }, { status: 400 });
    }

    const body = await req.json();
    const parsed = reportBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { issueType, comment } = parsed.data;

    const [question] = await db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.id, questionId));

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    try {
      const [report] = await db
        .insert(questionReports)
        .values({
          questionId,
          userId,
          issueType,
          comment: comment?.trim() || null,
          status: 'pending',
        })
        .returning();

      return NextResponse.json(report, { status: 201 });
    } catch (insertError: unknown) {
      if (insertError && typeof insertError === 'object' && 'code' in insertError && (insertError as { code: string }).code === '23505') {
        return NextResponse.json(
          { error: 'You have already reported this question' },
          { status: 409 }
        );
      }
      throw insertError;
    }
  } catch (error) {
    console.error('[POST /api/questions/[id]/report] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}