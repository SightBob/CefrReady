import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { testSetQuestions, questions, testSets } from '@/db/schema';
import { eq, asc, count as drizzleCount } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** POST /api/admin/test-sets/[id]/questions — add a question to a set */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const setId = parseInt(params.id);
  if (isNaN(setId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
    const { questionId } = await request.json();
    if (!questionId) return NextResponse.json({ success: false, error: 'questionId required' }, { status: 400 });

    // Check set exists
    const [set] = await db.select().from(testSets).where(eq(testSets.id, setId)).limit(1);
    if (!set) return NextResponse.json({ success: false, error: 'Set not found' }, { status: 404 });

    // Get current max orderIndex
    const [countRow] = await db
      .select({ cnt: drizzleCount() })
      .from(testSetQuestions)
      .where(eq(testSetQuestions.testSetId, setId));

    const nextOrder = (countRow?.cnt ?? 0);

    const [inserted] = await db
      .insert(testSetQuestions)
      .values({ testSetId: setId, questionId: Number(questionId), orderIndex: nextOrder })
      .onConflictDoNothing()
      .returning();

    if (!inserted) {
      return NextResponse.json({ success: false, error: 'Question already in this set' }, { status: 409 });
    }

    return NextResponse.json({ success: true, data: inserted }, { status: 201 });
  } catch (err) {
    console.error('[admin/test-sets/id/questions] POST error:', err);
    return NextResponse.json({ success: false, error: 'Failed to add question' }, { status: 500 });
  }
}

/** GET /api/admin/test-sets/[id]/questions — list questions in set with pool info */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const setId = parseInt(params.id);
  if (isNaN(setId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
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

    return NextResponse.json({ success: true, data: setQs });
  } catch (err) {
    console.error('[admin/test-sets/id/questions] GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch questions' }, { status: 500 });
  }
}
