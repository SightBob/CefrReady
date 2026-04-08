import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, testTypes } from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const testTypeName = params.type;
    const searchParams = request.nextUrl.searchParams;
    const count = parseInt(searchParams.get('count') || '20');
    const cefrLevel = searchParams.get('cefrLevel');

    // Find test type by name to get its ID
    const testType = await db
      .select({ id: testTypes.id })
      .from(testTypes)
      .where(eq(testTypes.name, testTypeName))
      .limit(1)
      .then(rows => rows[0]);

    if (!testType) {
      return NextResponse.json(
        { success: false, error: 'Test type not found' },
        { status: 404 }
      );
    }

    // Build query conditions
    const whereCondition = cefrLevel
      ? and(eq(questions.testTypeId, testType.id.toString()), eq(questions.cefrLevel, cefrLevel))
      : eq(questions.testTypeId, testType.id.toString());

    // Fetch random questions with structured data fields
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
        // Structured data fields for complex question types
        conversation: questions.conversation,
        audioUrl: questions.audioUrl,
        transcript: questions.transcript,
        article: questions.article,
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
