import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { testSets, testSetQuestions, questions } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/test-sets/[id]
 * Auth-required endpoint: returns a test set with all its questions in order.
 * Used by the student test-taking page.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const setId = parseInt(params.id);
  if (isNaN(setId)) {
    return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
  }

  try {
    const [set] = await db
      .select()
      .from(testSets)
      .where(eq(testSets.id, setId))
      .limit(1);

    if (!set || !set.isActive) {
      return NextResponse.json({ success: false, error: 'Test set not found' }, { status: 404 });
    }

    const setQuestions = await db
      .select({
        orderIndex: testSetQuestions.orderIndex,
        id: questions.id,
        testTypeId: questions.testTypeId,
        questionText: questions.questionText,
        optionA: questions.optionA,
        optionB: questions.optionB,
        optionC: questions.optionC,
        optionD: questions.optionD,
        correctAnswer: questions.correctAnswer,
        explanation: questions.explanation,
        conversation: questions.conversation,
        audioUrl: questions.audioUrl,
        transcript: questions.transcript,
        article: questions.article,
        cefrLevel: questions.cefrLevel,
        difficulty: questions.difficulty,
      })
      .from(testSetQuestions)
      .innerJoin(questions, eq(questions.id, testSetQuestions.questionId))
      .where(eq(testSetQuestions.testSetId, setId))
      .orderBy(asc(testSetQuestions.orderIndex));

    return NextResponse.json({
      success: true,
      data: {
        id: set.id,
        sectionId: set.sectionId,
        name: set.name,
        description: set.description,
        questions: setQuestions,
      },
    });
  } catch (err) {
    console.error('[api/test-sets/id] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch test set' }, { status: 500 });
  }
}
