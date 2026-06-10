import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { testFeedback, testAttempts, testTypes, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const rows = await db
      .select({
        id: testFeedback.id,
        attemptId: testFeedback.attemptId,
        rating: testFeedback.rating,
        comment: testFeedback.comment,
        createdAt: testFeedback.createdAt,
        testTypeId: testAttempts.testTypeId,
        testTypeName: testTypes.name,
        score: testAttempts.score,
        totalQuestions: testAttempts.totalQuestions,
        userId: testFeedback.userId,
        userName: users.name,
        userEmail: users.email,
      })
      .from(testFeedback)
      .innerJoin(testAttempts, eq(testFeedback.attemptId, testAttempts.id))
      .leftJoin(testTypes, eq(testAttempts.testTypeId, testTypes.id))
      .leftJoin(users, eq(testFeedback.userId, users.id))
      .orderBy(desc(testFeedback.createdAt));

    return NextResponse.json(rows);
  } catch (err) {
    console.error('[GET /api/admin/test-feedback] error:', err);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await req.json();
    if (!id || typeof id !== 'number') {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const deleted = await db.delete(testFeedback).where(eq(testFeedback.id, id)).returning();
    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/admin/test-feedback] error:', err);
    return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
  }
}
