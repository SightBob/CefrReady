import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { testSetQuestions, questions, testSets } from '@/db/schema';
import { eq, asc, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** POST /api/admin/test-sets/[id]/questions — add one or more questions to a set */
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  const setId = parseInt(params.id);
  if (isNaN(setId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  try {
    const body = await request.json();
    const questionIds: number[] = body.questionIds
      ? (Array.isArray(body.questionIds) ? body.questionIds.map(Number) : [Number(body.questionIds)])
      : body.questionId
        ? [Number(body.questionId)]
        : [];

    if (questionIds.length === 0) {
      return NextResponse.json({ success: false, error: 'questionId or questionIds required' }, { status: 400 });
    }

    // Check set exists
    const [set] = await db.select().from(testSets).where(eq(testSets.id, setId)).limit(1);
    if (!set) return NextResponse.json({ success: false, error: 'Set not found' }, { status: 404 });

    // จุดเริ่มของ orderIndex ต้องเป็น max ไม่ใช่ count — count ผิดเมื่อชุดมีช่องว่าง
    // และ migration 0044 บังคับ unique (test_set_id, order_index) แล้ว
    const [maxRow] = await db
      .select({ maxOrder: sql<number | null>`max(${testSetQuestions.orderIndex})` })
      .from(testSetQuestions)
      .where(eq(testSetQuestions.testSetId, setId));
    const startOrder = (maxRow?.maxOrder ?? -1) + 1;

    // insert ทีเดียวทั้งชุด — เดิมยิงทีละแถวใน loop
    const inserted = await db
      .insert(testSetQuestions)
      .values(questionIds.map((qId, i) => ({ testSetId: setId, questionId: qId, orderIndex: startOrder + i })))
      .onConflictDoNothing()
      .returning();

    const insertedQuestionIds = new Set(inserted.map((r) => r.questionId));
    const skipped = questionIds.filter((qId) => !insertedQuestionIds.has(qId));

    return NextResponse.json({
      success: true,
      data: { inserted: inserted.length, skipped: skipped.length },
    }, { status: 201 });
  } catch (err) {
    console.error('[admin/test-sets/id/questions] POST error:', err);
    return NextResponse.json({ success: false, error: 'Failed to add question(s)' }, { status: 500 });
  }
}

/** GET /api/admin/test-sets/[id]/questions — list questions in set with pool info */
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
