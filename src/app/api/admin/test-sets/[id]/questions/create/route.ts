import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, testSetQuestions, testSets, testTypes } from '@/db/schema';
import { eq, count as drizzleCount } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/test-sets/[id]/questions/create
 * Creates a new question AND assigns it to the test set atomically
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const setId = parseInt(params.id);
  if (isNaN(setId)) {
    return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
  }

  try {
    // Check set exists and get section info
    const [set] = await db
      .select()
      .from(testSets)
      .where(eq(testSets.id, setId))
      .limit(1);

    if (!set) {
      return NextResponse.json({ success: false, error: 'Set not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctAnswer,
      explanation,
      difficulty,
      cefrLevel,
      orderIndex: questionOrderIndex,
      conversation,
      article,
      audioUrl,
      transcript,
    } = body;

    // Use set's sectionId as testTypeId
    const testTypeId = set.sectionId;

    if (!questionText || !difficulty || !cefrLevel) {
      return NextResponse.json(
        { error: 'Missing required fields: questionText, difficulty, cefrLevel are required' },
        { status: 400 }
      );
    }

    const isFormMeaning = testTypeId === 'form-meaning';
    const isMcq = !isFormMeaning;

    if (isMcq && (!optionA || !optionB || !optionC || !correctAnswer)) {
      return NextResponse.json(
        { error: 'Missing required fields: optionA, optionB, optionC, correctAnswer are required for MCQ questions' },
        { status: 400 }
      );
    }

    if (isFormMeaning && (!article?.title || !article?.text)) {
      return NextResponse.json(
        { error: 'Missing required fields: article.title and article.text are required for form-meaning questions' },
        { status: 400 }
      );
    }

    // Create the question
    const [newQuestion] = await db
      .insert(questions)
      .values({
        testTypeId,
        questionText,
        optionA: optionA || null,
        optionB: optionB || null,
        optionC: optionC || null,
        optionD: optionD || null,
        correctAnswer: correctAnswer || null,
        explanation: explanation || null,
        difficulty,
        cefrLevel,
        orderIndex: questionOrderIndex || 0,
        active: 'true',
        ...(conversation ? { conversation } : {}),
        ...(article ? { article } : {}),
        ...(audioUrl ? { audioUrl } : {}),
        ...(transcript ? { transcript } : {}),
      })
      .returning();

    // Get next order index in the set
    const [countRow] = await db
      .select({ cnt: drizzleCount() })
      .from(testSetQuestions)
      .where(eq(testSetQuestions.testSetId, setId));

    const nextOrder = countRow?.cnt ?? 0;

    // Assign to the test set
    const [assignment] = await db
      .insert(testSetQuestions)
      .values({
        testSetId: setId,
        questionId: newQuestion.id,
        orderIndex: nextOrder,
      })
      .returning();

    return NextResponse.json(
      { success: true, data: { question: newQuestion, assignment } },
      { status: 201 }
    );
  } catch (err) {
    console.error('[admin/test-sets/id/questions/create] POST error:', err);
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}
