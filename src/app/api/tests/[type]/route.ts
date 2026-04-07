import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const testType = params.type;
    const searchParams = request.nextUrl.searchParams;
    const count = parseInt(searchParams.get('count') || '20');
    const cefrLevel = searchParams.get('cefrLevel');

    // Build query conditions
    const whereCondition = cefrLevel
      ? and(eq(questions.testTypeId, testType), eq(questions.cefrLevel, cefrLevel))
      : eq(questions.testTypeId, testType);

    // Fetch random questions, excluding correct_answer (will be shown after submission)
    const fetchedQuestions = await db
      .select({
        id: questions.id,
        testTypeId: questions.testTypeId,
        questionText: questions.questionText,
        optionA: questions.optionA,
        optionB: questions.optionB,
        optionC: questions.optionC,
        optionD: questions.optionD,
        cefrLevel: questions.cefrLevel,
        difficulty: questions.difficulty,
        orderIndex: questions.orderIndex,
      })
      .from(questions)
      .where(whereCondition)
      .orderBy(sql`RANDOM()`)
      .limit(count);

    return NextResponse.json({
      success: true,
      data: fetchedQuestions,
      count: fetchedQuestions.length,
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch questions',
      },
      { status: 500 }
    );
  }
}
