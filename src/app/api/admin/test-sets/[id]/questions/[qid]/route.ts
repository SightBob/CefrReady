import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { testSetQuestions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withAdmin } from '@/lib/admin-route';

export const dynamic = 'force-dynamic';

/** DELETE /api/admin/test-sets/[id]/questions/[qid] — remove question from set */
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string; qid: string }> }) {
  const params = await props.params;
  const { error } = await withAdmin({ keySuffix: 'admin:test-sets:[id]:questions:[qid]', maxRequests: 60 });
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
