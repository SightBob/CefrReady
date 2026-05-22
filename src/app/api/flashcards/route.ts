import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { flashcards } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { z } from 'zod';

const createFlashcardSchema = z.object({
  term: z.string().trim().min(1, 'term is required'),
  contextSentence: z.string().max(2000).optional(),
  sourceType: z.enum(['manual', 'article', 'test', 'must-know']).optional(),
  sourceId: z.number().int().optional(),
  userMeaning: z.string().max(2000).optional(),
  dictData: z.record(z.unknown()).optional(),
});

// GET /api/flashcards - ดึง flashcards ทั้งหมดของ user (รองรับ ?due=true และ ?status=...)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const dueOnly = searchParams.get('due') === 'true';

  const conditions = [eq(flashcards.userId, session.user.id)];
  if (status) {
    conditions.push(eq(flashcards.status, status));
  }

  if (dueOnly) {
    conditions.push(
      sql`(next_review_at IS NULL OR next_review_at <= NOW())`
    );
  }

  const cards = await db
    .select()
    .from(flashcards)
    .where(and(...conditions))
    .orderBy(
      dueOnly
        ? sql`RANDOM()`
        : desc(flashcards.createdAt)
    );

  return NextResponse.json({ flashcards: cards });
}

// POST /api/flashcards - สร้าง flashcard ใหม่
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(`flashcard:${session.user.id}`, { windowMs: 60_000, maxRequests: 20 });
  if (rl.limited) return rateLimitResponse(rl.retryAfterMs);

  const body = await req.json();
  const parsed = createFlashcardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 });
  }
  const { term, contextSentence, sourceType, sourceId, userMeaning, dictData } = parsed.data;

  // ตรวจสอบว่ามี flashcard คำนี้แล้วหรือยัง (ต่อ user)
  const existing = await db
    .select({ id: flashcards.id })
    .from(flashcards)
    .where(and(eq(flashcards.userId, session.user.id), eq(flashcards.term, term.toLowerCase())))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ error: 'already_exists', flashcardId: existing[0].id }, { status: 409 });
  }

  const [newCard] = await db
    .insert(flashcards)
    .values({
      userId: session.user.id,
      term: term.toLowerCase(),
      contextSentence,
      sourceType: sourceType ?? 'manual',
      sourceId,
      userMeaning,
      dictData: dictData ?? null,
      status: 'new',
    })
    .returning();

  return NextResponse.json({ flashcard: newCard }, { status: 201 });
}
