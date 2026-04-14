import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { articles, articleQuestions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/** GET /api/articles/[slug] — get single published article by slug (public) */
export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const row = await db
      .select()
      .from(articles)
      .where(and(eq(articles.slug, params.slug), eq(articles.isPublished, true)))
      .limit(1)
      .then(r => r[0]);

    if (!row) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: row });
  } catch (err) {
    console.error('[api/articles/[slug]] GET error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
