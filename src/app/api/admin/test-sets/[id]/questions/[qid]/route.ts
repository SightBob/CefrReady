import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { testSetQuestions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** DELETE /api/admin/test-sets/[id]/questions/[qid] — remove question from set */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; qid: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const setId = parseInt(params.id);
  const questionId = parseInt(params.qid);

  if (isNaN(setId) || isNaN(questionId)) {
    return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
  }

  try {
    await db
      .delete(testSetQuestions)
      .where(
        and(
          eq(testSetQuestions.testSetId, setId),
          eq(testSetQuestions.questionId, questionId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/test-sets/id/questions/qid] DELETE error:', err);
    return NextResponse.json({ success: false, error: 'Failed to remove question' }, { status: 500 });
  }
}

/** PATCH /api/admin/test-sets/[id]/questions/[qid] — update order */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; qid: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const setId = parseInt(params.id);
  const questionId = parseInt(params.qid);

  if (isNaN(setId) || isNaN(questionId)) {
    return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
  }

  try {
    const { orderIndex } = await request.json();
    await db
      .update(testSetQuestions)
      .set({ orderIndex })
      .where(
        and(
          eq(testSetQuestions.testSetId, setId),
          eq(testSetQuestions.questionId, questionId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/test-sets/id/questions/qid] PATCH error:', err);
    return NextResponse.json({ success: false, error: 'Failed to update order' }, { status: 500 });
  }
}
