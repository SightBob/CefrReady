import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const questionId = parseInt(params.id);
    const [question] = await db.select().from(questions).where(eq(questions.id, questionId));

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    return NextResponse.json({ error: 'Failed to fetch question' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const questionId = parseInt(params.id);
    const body = await request.json();

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
    // Note: Do NOT include createdAt, updatedAt, or any other fields

    // Validate required fields
    if (!updateData.testTypeId || !updateData.questionText || !updateData.correctAnswer) {
      return NextResponse.json({ error: 'Missing required fields: testTypeId, questionText, and correctAnswer are required' }, { status: 400 });
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
