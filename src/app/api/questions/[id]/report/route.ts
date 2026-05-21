import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, questionReports } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
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
  const rl = await rateLimit(getRateLimitIdentifier(req), { windowMs: 60_000, maxRequests: 5 });
  if (rl.limited) return rateLimitResponse(rl.retryAfterMs);

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

    // ตรวจว่า question มีอยู่จริง
    const [question] = await db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.id, questionId));

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Anonymous หรือ logged-in ก็ได้
    const session = await auth();

    const [report] = await db
      .insert(questionReports)
      .values({
        questionId,
        userId: session?.user?.id ?? null,
        issueType,
        comment: comment?.trim() || null,
        status: 'pending',
      })
      .returning();

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('[POST /api/questions/[id]/report] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
