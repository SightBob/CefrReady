import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { flashcards } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [stats] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      dueToday: sql<number>`COUNT(*) FILTER (WHERE next_review_at IS NULL OR next_review_at <= NOW())::int`,
      newCount: sql<number>`COUNT(*) FILTER (WHERE status = 'new')::int`,
      learningCount: sql<number>`COUNT(*) FILTER (WHERE status = 'learning')::int`,
      masteredCount: sql<number>`COUNT(*) FILTER (WHERE status = 'mastered')::int`,
      totalReviews: sql<number>`COALESCE(SUM(review_count), 0)::int`,
    })
    .from(flashcards)
    .where(eq(flashcards.userId, session.user.id));

  return NextResponse.json(stats);
}
