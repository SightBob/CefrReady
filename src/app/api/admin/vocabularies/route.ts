import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { vocabularies } from '@/db/schema';
import { eq, desc, and, ilike, sql, count } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** GET /api/admin/vocabularies — list with filters + pagination */
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const cefrLevel = searchParams.get('cefrLevel') || '';
    const topic = searchParams.get('topic') || '';
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')));

    const conditions = [];
    if (cefrLevel) conditions.push(eq(vocabularies.cefrLevel, cefrLevel));
    if (topic) conditions.push(eq(vocabularies.topic, topic));
    if (search) {
      conditions.push(
        sql`(${ilike(vocabularies.word, `%${search}%`)} OR ${ilike(vocabularies.thaiMeaning, `%${search}%`)} OR ${ilike(vocabularies.definition, `%${search}%`)})`,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(vocabularies)
      .where(where);

    const data = await db
      .select()
      .from(vocabularies)
      .where(where)
      .orderBy(desc(vocabularies.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return NextResponse.json({
      success: true,
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[admin/vocabularies] GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch vocabularies' }, { status: 500 });
  }
}

/** POST /api/admin/vocabularies — create with duplicate warning */
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { word, phonetic, partOfSpeech, definition, example, thaiMeaning, cefrLevel, topic, isPublished } = body;

    if (!word?.trim()) {
      return NextResponse.json({ success: false, error: 'Word is required' }, { status: 400 });
    }
    if (!thaiMeaning?.trim()) {
      return NextResponse.json({ success: false, error: 'Thai meaning is required' }, { status: 400 });
    }
    if (!cefrLevel) {
      return NextResponse.json({ success: false, error: 'CEFR level is required' }, { status: 400 });
    }

    // Check for duplicates (same word + same cefrLevel)
    const duplicates = await db
      .select()
      .from(vocabularies)
      .where(
        and(
          ilike(vocabularies.word, word.trim()),
          eq(vocabularies.cefrLevel, cefrLevel),
        ),
      );

    const [created] = await db
      .insert(vocabularies)
      .values({
        word: word.trim(),
        phonetic: phonetic?.trim() || null,
        partOfSpeech: partOfSpeech?.trim() || null,
        definition: definition?.trim() || '',
        example: example?.trim() || null,
        thaiMeaning: thaiMeaning.trim(),
        cefrLevel,
        topic: topic?.trim() || null,
        isPublished: isPublished ?? true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: created,
      warnings: duplicates.length > 0 ? { duplicates } : undefined,
    }, { status: 201 });
  } catch (err) {
    console.error('[admin/vocabularies] POST error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create vocabulary' }, { status: 500 });
  }
}
