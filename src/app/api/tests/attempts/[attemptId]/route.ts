import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { testAttempts, userAnswers, questions, testTypes } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import type { DbQuestion } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tests/attempts/[attemptId]
 * Fetch a test attempt with full question details and user answers for review.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const attemptId = parseInt(params.attemptId);
    if (isNaN(attemptId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid attempt ID' },
        { status: 400 }
      );
    }

    // Fetch attempt and verify ownership
    const attempt = await db
      .select()
      .from(testAttempts)
      .where(and(
        eq(testAttempts.id, attemptId),
        eq(testAttempts.userId, user.id)
      ))
      .limit(1)
      .then(rows => rows[0]);

    if (!attempt) {
      return NextResponse.json(
        { success: false, error: 'Attempt not found' },
        { status: 404 }
      );
    }

    // Fetch test type info
    const testType = await db
      .select()
      .from(testTypes)
      .where(eq(testTypes.id, attempt.testTypeId))
      .limit(1)
      .then(rows => rows[0]);

    // Fetch user answers for this attempt
    const answers = await db
      .select()
      .from(userAnswers)
      .where(eq(userAnswers.attemptId, attemptId));

    // Fetch all questions referenced by the answers
    const questionIds = answers.map(a => a.questionId);
    let dbQuestions: DbQuestion[] = [];
    if (questionIds.length > 0) {
      dbQuestions = await db
        .select()
        .from(questions)
        .where(inArray(questions.id, questionIds));
    }

    // Build review items: question + user answer merged
    const reviewItems = answers.map(answer => {
      const question = dbQuestions.find(q => q.id === answer.questionId);
      return {
        questionId: answer.questionId,
        question: question ? {
          id: question.id,
          testTypeId: question.testTypeId,
          questionText: question.questionText,
          optionA: question.optionA,
          optionB: question.optionB,
          optionC: question.optionC,
          optionD: question.optionD,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          conversation: question.conversation,
          audioUrl: question.audioUrl,
          transcript: question.transcript,
          article: question.article,
          cefrLevel: question.cefrLevel,
          difficulty: question.difficulty,
          orderIndex: question.orderIndex,
        } : null,
        userAnswer: answer.selectedAnswer,
        isCorrect: answer.isCorrect,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        attempt: {
          id: attempt.id,
          testTypeId: attempt.testTypeId,
          testTypeName: testType?.name || attempt.testTypeId,
          score: parseFloat(attempt.score || '0'),
          totalQuestions: attempt.totalQuestions,
          correctAnswers: attempt.correctAnswers,
          startedAt: attempt.startedAt,
          completedAt: attempt.completedAt,
        },
        reviewItems,
      },
    });
  } catch (error) {
    console.error('Error fetching attempt review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attempt' },
      { status: 500 }
    );
  }
}
