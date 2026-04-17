import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { flashcards } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET /api/flashcards - ดึง flashcards ทั้งหมดของ user
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status'); // 'new' | 'learning' | 'mastered' | null (all)

  const conditions = [eq(flashcards.userId, session.user.id)];
  if (status) {
    conditions.push(eq(flashcards.status, status));
  }

  const cards = await db
    .select()
    .from(flashcards)
    .where(and(...conditions))
    .orderBy(desc(flashcards.createdAt));

  return NextResponse.json({ flashcards: cards });
}

// POST /api/flashcards - สร้าง flashcard ใหม่
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { term, contextSentence, sourceType, sourceId, userMeaning, dictData } = body;

  if (!term?.trim()) {
    return NextResponse.json({ error: 'term is required' }, { status: 400 });
  }

  // ตรวจสอบว่ามี flashcard คำนี้แล้วหรือยัง (ต่อ user)
  const existing = await db
    .select({ id: flashcards.id })
    .from(flashcards)
    .where(and(eq(flashcards.userId, session.user.id), eq(flashcards.term, term.trim().toLowerCase())))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ error: 'already_exists', flashcardId: existing[0].id }, { status: 409 });
  }

  const [newCard] = await db
    .insert(flashcards)
    .values({
      userId: session.user.id,
      term: term.trim().toLowerCase(),
      contextSentence: contextSentence || null,
      sourceType: sourceType || 'manual',
      sourceId: sourceId || null,
      userMeaning: userMeaning || null,
      dictData: dictData || null,
      status: 'new',
    })
    .returning();

  return NextResponse.json({ flashcard: newCard }, { status: 201 });
}
