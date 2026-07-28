import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { articles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { checkIpThrottle } from '@/lib/api-security';

export const dynamic = 'force-dynamic';

const getCachedArticle = unstable_cache(
  async (slug: string) => {
    return db
      .select()
      .from(articles)
      .where(and(eq(articles.slug, slug), eq(articles.isPublished, true)))
      .limit(1)
      .then(r => r[0] || null);
  },
  ['article-by-slug'],
  { revalidate: 3600, tags: ['articles'] }
);

/** GET /api/articles/[slug] — get single published article by slug (public) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // SECURITY: throttle public endpoint (report M3).
    const ipThrottleError = await checkIpThrottle(request, { keySuffix: 'article-slug' });
    if (ipThrottleError) return ipThrottleError;

    const { slug } = await params;
    const row = await getCachedArticle(slug);

    if (!row) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: row });
  } catch (err) {
    console.error('[api/articles/[slug]] GET error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
