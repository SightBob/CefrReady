import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, testSetQuestions, testSets } from '@/db/schema';
import { eq, sql, asc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const questionId = parseInt(params.id);
    const [question] = await db.select().from(questions).where(eq(questions.id, questionId));

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Fetch test set memberships for this question
    const memberships = await db
      .select({
        id: testSets.id,
        name: testSets.name,
        sectionId: testSets.sectionId,
        orderIndex: testSetQuestions.orderIndex,
      })
      .from(testSetQuestions)
      .innerJoin(testSets, eq(testSetQuestions.testSetId, testSets.id))
      .where(eq(testSetQuestions.questionId, questionId))
      .orderBy(asc(testSetQuestions.orderIndex));

    return NextResponse.json({ ...question, testSets: memberships });
  } catch (error) {
    console.error('Error fetching question:', error);
    return NextResponse.json({ error: 'Failed to fetch question' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const questionId = parseInt(params.id);
    const body = await request.json();

    const { error: putErr } = await requireAdmin();
    if (putErr) return putErr;

    // Explicitly pick only the fields we want to update to avoid timestamp issues
    const updateData: Partial<typeof questions.$inferInsert> = {};

    if (body.testTypeId !== undefined) updateData.testTypeId = body.testTypeId;
    if (body.questionText !== undefined) updateData.questionText = body.questionText;
    if (body.optionA !== undefined) updateData.optionA = body.optionA || null;
    if (body.optionB !== undefined) updateData.optionB = body.optionB || null;
    if (body.optionC !== undefined) updateData.optionC = body.optionC || null;
    if (body.optionD !== undefined) updateData.optionD = body.optionD || null;
    if (body.correctAnswer !== undefined) updateData.correctAnswer = body.correctAnswer;
    if (body.explanation !== undefined) updateData.explanation = body.explanation || null;
    if (body.difficulty !== undefined) updateData.difficulty = body.difficulty || 'medium';
    if (body.cefrLevel !== undefined) updateData.cefrLevel = body.cefrLevel;
    if (body.active !== undefined) updateData.active = body.active || 'true';
    if (body.orderIndex !== undefined) {
      updateData.orderIndex = typeof body.orderIndex === 'string'
        ? parseInt(body.orderIndex, 10)
        : (body.orderIndex || 0);
    }
    if (body.isDemo !== undefined) updateData.isDemo = body.isDemo === true;
    if (body.demoOrder !== undefined) {
      updateData.demoOrder = body.demoOrder === null || body.demoOrder === ''
        ? null
        : parseInt(String(body.demoOrder), 10);
    }
    if (body.conversation !== undefined) {
      updateData.conversation = body.conversation;
    }
    if (body.article !== undefined) {
      updateData.article = body.article;
    }
    if (body.audioUrl !== undefined) {
      updateData.audioUrl = body.audioUrl || null;
    }
    if (body.transcript !== undefined) {
      updateData.transcript = body.transcript || null;
    }
    if (body.tapExercise !== undefined) {
      const tapExercise = body.tapExercise as {
        title?: unknown;
        hint?: unknown;
        items?: Array<{ prompt?: unknown; choiceA?: unknown; choiceB?: unknown; correct?: unknown }>;
      } | null;
      if (tapExercise !== null && (
        typeof tapExercise?.title !== 'string'
        || !tapExercise.title.trim()
        || !Array.isArray(tapExercise.items)
        || tapExercise.items.length === 0
        || !tapExercise.items.every(item =>
          typeof item.prompt === 'string'
          && Boolean(item.prompt.trim())
          && typeof item.choiceA === 'string'
          && Boolean(item.choiceA.trim())
          && typeof item.choiceB === 'string'
          && Boolean(item.choiceB.trim())
          && (item.correct === 0 || item.correct === 1)
        )
      )) {
        return NextResponse.json({ error: 'Invalid Tap & Select exercise' }, { status: 400 });
      }
      updateData.tapExercise = tapExercise as typeof questions.$inferInsert.tapExercise;
    }
    // Note: Do NOT include createdAt, updatedAt, or any other fields

    // Validate required fields
    if (!updateData.testTypeId || (!updateData.questionText && !updateData.tapExercise)) {
      return NextResponse.json({ error: 'Missing required fields: testTypeId and questionText are required' }, { status: 400 });
    }
    if (updateData.tapExercise) updateData.questionText = updateData.tapExercise.title;

    const isFormMeaning = updateData.testTypeId === 'form-meaning';
    const isMcq = !isFormMeaning;

    if (isMcq && !updateData.correctAnswer && !updateData.tapExercise) {
      return NextResponse.json({ error: 'Missing required field: correctAnswer is required for MCQ questions' }, { status: 400 });
    }

    const [updatedQuestion] = await db
      .update(questions)
      .set(updateData)
      .where(eq(questions.id, questionId))
      .returning();

    if (!updatedQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json(updatedQuestion);
  } catch (error) {
    console.error('Error updating question:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update question', details: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const questionId = parseInt(params.id);
    const [deletedQuestion] = await db
      .delete(questions)
      .where(eq(questions.id, questionId))
      .returning();

    if (!deletedQuestion) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
  }
}
