import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { flashcards } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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
  const updates: Record<string, unknown> = {};

  if (body.userMeaning !== undefined) updates.userMeaning = body.userMeaning;
  if (body.status !== undefined) updates.status = body.status;
  if (body.reviewCount !== undefined) updates.reviewCount = body.reviewCount;
  if (body.lastReviewedAt !== undefined) updates.lastReviewedAt = new Date(body.lastReviewedAt);

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
