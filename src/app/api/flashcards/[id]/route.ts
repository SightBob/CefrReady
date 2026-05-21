import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { flashcards } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const patchFlashcardSchema = z.object({
  userMeaning: z.string().max(2000).optional(),
  status: z.enum(['new', 'learning', 'mastered']).optional(),
  reviewCount: z.number().int().min(0).optional(),
  lastReviewedAt: z.string().datetime().optional(),
});

// PATCH /api/flashcards/[id] - อัปเดต (userMeaning, status)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cardId = parseInt(params.id);
  if (isNaN(cardId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const body = await req.json();
  const parsed = patchFlashcardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  const data = parsed.data;
  if (data.userMeaning !== undefined) updates.userMeaning = data.userMeaning;
  if (data.status !== undefined) updates.status = data.status;
  if (data.reviewCount !== undefined) updates.reviewCount = data.reviewCount;
  if (data.lastReviewedAt !== undefined) updates.lastReviewedAt = new Date(data.lastReviewedAt);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const [updated] = await db
    .update(flashcards)
    .set(updates)
    .where(and(eq(flashcards.id, cardId), eq(flashcards.userId, session.user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ flashcard: updated });
}

// DELETE /api/flashcards/[id] - ลบ flashcard
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cardId = parseInt(params.id);
  if (isNaN(cardId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const [deleted] = await db
    .delete(flashcards)
    .where(and(eq(flashcards.id, cardId), eq(flashcards.userId, session.user.id)))
    .returning({ id: flashcards.id });

  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
