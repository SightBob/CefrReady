import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { testSets, testSetQuestions, questions } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** GET /api/admin/test-sets/[id] — get set detail with questions */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const setId = parseInt(params.id);
  if (isNaN(setId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
    const [set] = await db.select().from(testSets).where(eq(testSets.id, setId)).limit(1);
    if (!set) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const setQs = await db
      .select({
        assignmentId: testSetQuestions.id,
        orderIndex: testSetQuestions.orderIndex,
        question: questions,
      })
      .from(testSetQuestions)
      .innerJoin(questions, eq(questions.id, testSetQuestions.questionId))
      .where(eq(testSetQuestions.testSetId, setId))
      .orderBy(asc(testSetQuestions.orderIndex));

    return NextResponse.json({ success: true, data: { ...set, questions: setQs } });
  } catch (err) {
    console.error('[admin/test-sets/id] GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}

/** PATCH /api/admin/test-sets/[id] — update set metadata */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const setId = parseInt(params.id);
  if (isNaN(setId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
    const body = await request.json();
    const updates: Partial<{ name: string; description: string; isActive: boolean; orderIndex: number }> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() ?? null;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.orderIndex !== undefined) updates.orderIndex = body.orderIndex;

    const [updated] = await db.update(testSets).set(updates).where(eq(testSets.id, setId)).returning();
    if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('[admin/test-sets/id] PATCH error:', err);
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
  }
}

/** DELETE /api/admin/test-sets/[id] — delete set (cascade removes questions) */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const setId = parseInt(params.id);
  if (isNaN(setId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
    await db.delete(testSets).where(eq(testSets.id, setId));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/test-sets/id] DELETE error:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}
