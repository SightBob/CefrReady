import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { articles } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/** GET /api/articles — list published articles (public) */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const conditions = [eq(articles.isPublished, true)];
    if (category) conditions.push(eq(articles.category, category));

    const rows = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        category: articles.category,
        cefrLevel: articles.cefrLevel,
        tags: articles.tags,
        createdAt: articles.createdAt,
      })
      .from(articles)
      .where(and(...conditions))
      .orderBy(desc(articles.createdAt));

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error('[api/articles] GET error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
