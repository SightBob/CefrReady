import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, testTypes } from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';

/**
 * GET /api/tests/[type]
 * Fetch random questions for a test type.
 *
 * Query params:
 * - count: number of questions (default: 20)
 * - cefrLevel: filter by CEFR level (optional)
 * - demo: if "true", include correctAnswer and explanation (default: false)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const testTypeName = params.type;
    const searchParams = request.nextUrl.searchParams;
    const count = parseInt(searchParams.get('count') || '20');
    const cefrLevel = searchParams.get('cefrLevel');
    const isDemo = searchParams.get('demo') === 'true';

    // Find test type by string ID (now the primary key)
    const testType = await db
      .select()
      .from(testTypes)
      .where(eq(testTypes.id, testTypeName))
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
      ? and(eq(questions.testTypeId, testTypeName), eq(questions.cefrLevel, cefrLevel))
      : eq(questions.testTypeId, testTypeName);

    // Select fields - always include all structured data fields
    const baseSelect = {
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
      conversation: questions.conversation,
      audioUrl: questions.audioUrl,
      transcript: questions.transcript,
      article: questions.article,
    };

    // In demo mode, include answers and explanations
    const selectWithAnswers = {
      ...baseSelect,
      correctAnswer: questions.correctAnswer,
      explanation: questions.explanation,
    };

    // Fetch random questions
    const fetchedQuestions = await db
      .select(isDemo ? selectWithAnswers : baseSelect)
      .from(questions)
      .where(whereCondition)
      .orderBy(sql`RANDOM()`)
      .limit(count);

    return NextResponse.json({
      success: true,
      data: fetchedQuestions,
      count: fetchedQuestions.length,
      isDemo,
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
