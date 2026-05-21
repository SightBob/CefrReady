import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { articles } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

const getCachedArticles = unstable_cache(
  async (category?: string) => {
    const conditions = [eq(articles.isPublished, true)];
    if (category) conditions.push(eq(articles.category, category));

    return db
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
  },
  ['articles-list'],
  { revalidate: 3600, tags: ['articles'] }
);

/** GET /api/articles — list published articles (public) */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const rows = await getCachedArticles(category);
    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error('[api/articles] GET error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
