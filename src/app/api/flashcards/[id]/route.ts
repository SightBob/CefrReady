import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { flashcards } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { sm2, isValidQuality } from '@/lib/sm2';

const patchFlashcardSchema = z.object({
  userMeaning: z.string().max(2000).optional(),
  status: z.enum(['new', 'learning', 'mastered']).optional(),
  reviewCount: z.number().int().min(0).optional(),
  lastReviewedAt: z.string().datetime().optional(),
  action: z.enum(['review']).optional(),
  quality: z.number().int().min(1).max(5).optional(),
});

// PATCH /api/flashcards/[id] - อัปเดต (userMeaning, status, review)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // SM-2 review action
    if (data.action === 'review') {
      if (data.quality === undefined || !isValidQuality(data.quality)) {
        return NextResponse.json(
          { error: 'quality must be 1, 3, 4, or 5' },
          { status: 400 }
        );
      }

      const [card] = await db
        .select()
        .from(flashcards)
        .where(and(eq(flashcards.id, cardId), eq(flashcards.userId, session.user.id)))
        .limit(1);

      if (!card) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      const ef = card.easeFactor != null ? Number(card.easeFactor) : 2.5;
      const ri = card.reviewInterval != null ? Number(card.reviewInterval) : 0;
      const cc = card.consecutiveCorrect != null ? Number(card.consecutiveCorrect) : 0;
      const rc = card.reviewCount != null ? Number(card.reviewCount) : 0;

      const result = sm2(data.quality, ef, ri, cc);

      updates.easeFactor = result.easeFactor.toString();
      updates.reviewInterval = result.reviewInterval;
      updates.nextReviewAt = result.nextReviewAt;
      updates.status = result.status;
      updates.reviewCount = rc + 1;
      updates.lastReviewedAt = new Date();
      updates.consecutiveCorrect = data.quality >= 3 ? cc + 1 : 0;
      updates.updatedAt = new Date();
    } else {
      // Standard updates (backward compatible)
      if (data.userMeaning !== undefined) updates.userMeaning = data.userMeaning;
      if (data.status !== undefined) updates.status = data.status;
      if (data.reviewCount !== undefined) updates.reviewCount = data.reviewCount;
      if (data.lastReviewedAt !== undefined) updates.lastReviewedAt = new Date(data.lastReviewedAt);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Ensure all timestamp columns are Date objects
    const tsFields = ['lastReviewedAt', 'nextReviewAt'];
    for (const field of tsFields) {
      if (updates[field] !== undefined && !(updates[field] instanceof Date)) {
        console.warn(`[flashcard PATCH] ${field} is not a Date, converting:`, typeof updates[field], updates[field]);
        updates[field] = new Date(updates[field] as Date);
      }
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
  } catch (error) {
    console.error('[flashcard PATCH] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
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
