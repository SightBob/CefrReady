import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { testSetQuestions, testSets } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await props.params;
  const setId = Number(id);
  if (!Number.isInteger(setId) || setId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid test set id' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const assignmentIds: unknown = body.assignmentIds;
    if (!Array.isArray(assignmentIds) || !assignmentIds.every((value) => Number.isInteger(value) && value > 0)) {
      return NextResponse.json({ success: false, error: 'assignmentIds must be positive integers' }, { status: 400 });
    }
    if (new Set(assignmentIds).size !== assignmentIds.length) {
      return NextResponse.json({ success: false, error: 'Duplicate assignment id' }, { status: 400 });
    }

    const [set] = await db.select({ id: testSets.id }).from(testSets).where(eq(testSets.id, setId)).limit(1);
    if (!set) return NextResponse.json({ success: false, error: 'Test set not found' }, { status: 404 });
    const assignments = await db.select({ id: testSetQuestions.id }).from(testSetQuestions)
      .where(eq(testSetQuestions.testSetId, setId)).orderBy(asc(testSetQuestions.orderIndex));
    const expected = new Set(assignments.map((assignment) => assignment.id));
    if (assignmentIds.length !== expected.size || assignmentIds.some((assignmentId) => !expected.has(assignmentId as number))) {
      return NextResponse.json({ success: false, error: 'Order must include every assignment in this set exactly once' }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      for (const [orderIndex, assignmentId] of assignmentIds.entries()) {
        await tx.update(testSetQuestions)
          .set({ orderIndex })
          .where(and(eq(testSetQuestions.testSetId, setId), eq(testSetQuestions.id, assignmentId as number)));
      }
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/test-sets/id/questions/reorder] PUT error:', err);
    return NextResponse.json({ success: false, error: 'Failed to reorder questions' }, { status: 500 });
  }
}
