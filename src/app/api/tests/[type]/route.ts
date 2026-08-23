import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, testTypes } from '@/db/schema';
import { eq, sql, and, asc } from 'drizzle-orm';
import { checkIpThrottle } from '@/lib/api-security';
import { sanitizeArticleForClient } from '@/lib/sanitize-question';

/**
 * GET /api/tests/[type]
 * Fetch random questions for a test type.
 *
 * Query params:
 * - count: number of questions (default: 20, max: 50; max 10 in demo mode)
 * - cefrLevel: filter by CEFR level (optional)
 * - demo: if "true", include correctAnswer and explanation (default: false)
 */
export async function GET(request: NextRequest, props: { params: Promise<{ type: string }> }) {
  const params = await props.params;
  try {
    // SECURITY: throttle this public endpoint — it runs ORDER BY RANDOM() over
    // the questions table, which is CPU-heavy and otherwise a cheap DoS vector.
    const ipThrottleError = await checkIpThrottle(request, {
      keySuffix: 'tests-list',
      maxRequests: 30,
    });
    if (ipThrottleError) return ipThrottleError;

    const testTypeName = params.type;
    const searchParams = request.nextUrl.searchParams;
    const cefrLevel = searchParams.get('cefrLevel');
    const isDemo = searchParams.get('demo') === 'true';

    // SECURITY: clamp count — previously unbounded, so one request could dump
    // the entire question bank (with answers, in demo mode).
    const rawCount = parseInt(searchParams.get('count') || '20');
    if (isNaN(rawCount)) {
      return NextResponse.json(
        { success: false, error: 'Invalid count parameter' },
        { status: 400 }
      );
    }
    const maxCount = isDemo ? 10 : 50;
    const count = Math.min(Math.max(rawCount, 1), maxCount);

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

    // Demo mode: admin-curated questions only, ordered by demoOrder.
    // Regular mode: random questions.
    const fetchedQuestions = isDemo
      ? await db
          .select(selectWithAnswers)
          .from(questions)
          .where(and(whereCondition, eq(questions.isDemo, true)))
          .orderBy(sql`${questions.demoOrder} ASC NULLS LAST`, asc(questions.id))
          .limit(count)
      : await db
          .select(baseSelect)
          .from(questions)
          .where(whereCondition)
          .orderBy(sql`RANDOM()`)
          .limit(count);

    // SECURITY: in non-demo mode the article JSON of cloze (form-meaning)
    // questions still contains blanks[].correctAnswer — strip it so answers
    // never leave the server pre-submission (C3). Demo mode keeps answers
    // intentionally (public /demo/* feature, capped at 10 questions).
    const data = isDemo
      ? fetchedQuestions
      : fetchedQuestions.map((q) => ({
          ...q,
          article: sanitizeArticleForClient(q.article),
        }));

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
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
