import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { vocabularies } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** GET /api/admin/vocabularies/[id] */
export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

    const row = await db.select().from(vocabularies).where(eq(vocabularies.id, id)).limit(1).then(r => r[0]);
    if (!row) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: row });
  } catch (err) {
    console.error('[admin/vocabularies/[id]] GET error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

/** PUT /api/admin/vocabularies/[id] */
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

    const body = await request.json();
    const { word, phonetic, partOfSpeech, definition, example, thaiMeaning, cefrLevel, topic, isPublished } = body;

    // Check for duplicates (same word + same cefrLevel, excluding self)
    const duplicates = await db
      .select()
      .from(vocabularies)
      .where(
        and(
          eq(vocabularies.word, (word ?? '').trim()),
          eq(vocabularies.cefrLevel, cefrLevel ?? ''),
          sql`${vocabularies.id} != ${id}`,
        ),
      );

    const [updated] = await db
      .update(vocabularies)
      .set({
        ...(word !== undefined && { word: word.trim() }),
        ...(phonetic !== undefined && { phonetic: phonetic?.trim() || null }),
        ...(partOfSpeech !== undefined && { partOfSpeech: partOfSpeech?.trim() || null }),
        ...(definition !== undefined && { definition: definition?.trim() || '' }),
        ...(example !== undefined && { example: example?.trim() || null }),
        ...(thaiMeaning !== undefined && { thaiMeaning: thaiMeaning.trim() }),
        ...(cefrLevel !== undefined && { cefrLevel }),
        ...(topic !== undefined && { topic: topic?.trim() || null }),
        ...(isPublished !== undefined && { isPublished }),
        updatedAt: new Date(),
      })
      .where(eq(vocabularies.id, id))
      .returning();

    if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    return NextResponse.json({
      success: true,
      data: updated,
      warnings: duplicates.length > 0 ? { duplicates } : undefined,
    });
  } catch (err) {
    console.error('[admin/vocabularies/[id]] PUT error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

/** DELETE /api/admin/vocabularies/[id] — soft delete by default, hard with ?hard=true */
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const hard = searchParams.get('hard') === 'true';

    if (hard) {
      const [deleted] = await db.delete(vocabularies).where(eq(vocabularies.id, id)).returning();
      if (!deleted) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    // Soft delete: set isPublished = false
    const [updated] = await db
      .update(vocabularies)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(eq(vocabularies.id, id))
      .returning();

    if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('[admin/vocabularies/[id]] DELETE error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}