import { NextResponse } from 'next/server';
import { db } from '@/db';
import { testFeedback, users } from '@/db/schema';
import { desc, isNotNull, sql, eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const MAX_REVIEWS = 12;

export async function GET() {
  try {
    const rows = await db
      .select({
        id: testFeedback.id,
        rating: testFeedback.rating,
        comment: testFeedback.comment,
        createdAt: testFeedback.createdAt,
        name: users.name,
        image: users.image,
      })
      .from(testFeedback)
      .innerJoin(users, eq(users.id, testFeedback.userId))
      .where(and(isNotNull(testFeedback.comment), sql`length(btrim(${testFeedback.comment})) > 0`))
      .orderBy(desc(testFeedback.createdAt))
      .limit(MAX_REVIEWS);

    const data = rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      name: r.name?.trim() || 'นักเรียน CefrReady',
      image: r.image,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[GET /api/reviews] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
