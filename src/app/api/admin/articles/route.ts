import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { articles } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** GET /api/admin/articles — list all articles with optional filters */
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const cefrLevel = searchParams.get('cefrLevel');

    const conditions = [];
    if (category) conditions.push(eq(articles.category, category));
    if (cefrLevel) conditions.push(eq(articles.cefrLevel, cefrLevel));

    const rows = await db
      .select()
      .from(articles)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(articles.createdAt));

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error('[admin/articles] GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch articles' }, { status: 500 });
  }
}

/** POST /api/admin/articles — create new article */
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { title, content, category, cefrLevel, tags, isPublished } = body;

    if (!title?.trim()) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    // Generate slug from title
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\u0E00-\u0E7F\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Ensure slug uniqueness
    const existing = await db
      .select({ slug: articles.slug })
      .from(articles)
      .where(sql`slug LIKE ${baseSlug + '%'}`);

    const slug = existing.length === 0 ? baseSlug : `${baseSlug}-${Date.now()}`;

    const [created] = await db
      .insert(articles)
      .values({
        title: title.trim(),
        slug,
        content: content || '',
        category: category || null,
        cefrLevel: cefrLevel || null,
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim()).filter(Boolean)) : [],
        isPublished: isPublished ?? false,
      })
      .returning();

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    console.error('[admin/articles] POST error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create article' }, { status: 500 });
  }
}
