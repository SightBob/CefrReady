import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { articles, articleQuestions, questions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** GET /api/admin/articles/[id] */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

    const row = await db.select().from(articles).where(eq(articles.id, id)).limit(1).then(r => r[0]);
    if (!row) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    // Also fetch linked question ids
    const linked = await db
      .select({ questionId: articleQuestions.questionId })
      .from(articleQuestions)
      .where(eq(articleQuestions.articleId, id));

    return NextResponse.json({ success: true, data: { ...row, linkedQuestionIds: linked.map(l => l.questionId) } });
  } catch (err) {
    console.error('[admin/articles/[id]] GET error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

/** PUT /api/admin/articles/[id] */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

    const body = await request.json();
    const { title, content, category, cefrLevel, tags, isPublished } = body;

    if (!title?.trim()) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    const normalizedTags = tags
      ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim()).filter(Boolean))
      : [];

    const [updated] = await db
      .update(articles)
      .set({
        title: title.trim(),
        content: content || '',
        category: category || null,
        cefrLevel: cefrLevel || null,
        tags: normalizedTags,
        isPublished: isPublished ?? false,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id))
      .returning();

    if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('[admin/articles/[id]] PUT error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

/** DELETE /api/admin/articles/[id] */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

    const [deleted] = await db.delete(articles).where(eq(articles.id, id)).returning();
    if (!deleted) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/articles/[id]] DELETE error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
