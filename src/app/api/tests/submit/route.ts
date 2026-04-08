import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, testAttempts, userAnswers, userProgress, testTypes } from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';

/**
 * POST /api/tests/submit
 * Submit test answers and calculate/store results.
 *
 * Request body:
 * {
 *   testTypeId: string,           // e.g. 'focus-form'
 *   answers: Array<{             // array of submitted answers
 *     questionId: number,
 *     selectedAnswer: string
 *   }>,
 *   isDemo?: boolean             // optional, defaults to false
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('=== TEST SUBMIT API CALLED ===');

    const body = await request.json();
    let { testTypeId, answers, isDemo = false } = body;
    console.log('Request body:', { testTypeId, answersCount: answers?.length, isDemo });

    if (!testTypeId || !answers || !Array.isArray(answers)) {
      console.log('Validation failed - missing fields');
      return NextResponse.json(
        { success: false, error: 'Missing required fields: testTypeId and answers array' },
        { status: 400 }
      );
    }

    // For demo mode, skip authentication and database storage
    if (isDemo) {
      // Fetch questions to validate answers
      const questionIds = answers.map((a: any) => a.questionId);
      const dbQuestions = await db
        .select()
        .from(questions)
        .where(and(
          eq(questions.testTypeId, testTypeId),
          inArray(questions.id, questionIds)
        ));

      // Calculate score
      let correctCount = 0;
      const results = answers.map((answer: any) => {
        const question = dbQuestions.find((q) => q.id === answer.questionId);
        if (!question) {
          return {
            questionId: answer.questionId,
            isCorrect: false,
            userAnswer: answer.selectedAnswer,
            correctAnswer: null,
            explanation: null,
          };
        }

        const isCorrect = answer.selectedAnswer === question.correctAnswer;
        if (isCorrect) correctCount++;

        return {
          questionId: answer.questionId,
          isCorrect,
          userAnswer: answer.selectedAnswer,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
        };
      });

      const totalQuestions = answers.length;
      const score = Math.round((correctCount / totalQuestions) * 100);

      return NextResponse.json({
        success: true,
        data: {
          score,
          totalQuestions,
          correctAnswers: correctCount,
          results,
          isDemo: true,
        },
      });
    }

    // Real mode - require authentication
    const user = await getCurrentUser();
    console.log('getCurrentUser result:', user ? { id: user.id, email: user.email } : null);

    if (!user) {
      console.log('Authentication failed - no user found');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate test type exists
    const testTypeExists = await db
      .select()
      .from(testTypes)
      .where(eq(testTypes.id, testTypeId))
      .limit(1)
      .then(rows => rows[0]);

    if (!testTypeExists) {
      console.log('Test type not found:', testTypeId);
      return NextResponse.json(
        { success: false, error: 'Invalid test type' },
        { status: 400 }
      );
    }

    // Fetch questions with correct answers
    const questionIds = answers.map((a: any) => a.questionId);
    const dbQuestions = await db
      .select()
      .from(questions)
      .where(and(
        eq(questions.testTypeId, testTypeId),
        inArray(questions.id, questionIds)
      ));

    if (dbQuestions.length !== questionIds.length) {
      console.warn('Some questions not found:', {
        requested: questionIds.length,
        found: dbQuestions.length
      });
    }

    // Calculate score
    let correctCount = 0;
    const results = answers.map((answer: any) => {
      const question = dbQuestions.find((q) => q.id === answer.questionId);
      if (!question) {
        return {
          questionId: answer.questionId,
          isCorrect: false,
          userAnswer: answer.selectedAnswer,
          correctAnswer: null,
          explanation: null,
        };
      }

      const isCorrect = answer.selectedAnswer === question.correctAnswer;
      if (isCorrect) correctCount++;

      return {
        questionId: answer.questionId,
        isCorrect,
        userAnswer: answer.selectedAnswer,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      };
    });

    const totalQuestions = answers.length;
    const score = (correctCount / totalQuestions) * 100; // Keep as decimal for numeric storage

    const now = new Date();

    // Save test attempt FIRST
    let newAttempt;
    try {
      [newAttempt] = await db
        .insert(testAttempts)
        .values({
          userId: user.id,
          testTypeId,
          score: score.toString(),
          totalQuestions,
          correctAnswers: correctCount,
          startedAt: now,
          completedAt: now,
        })
        .returning();
      console.log('Test attempt saved:', { attemptId: newAttempt?.id, userId: user.id, testTypeId, score });
    } catch (error) {
      console.error('Failed to save test attempt:', error);
      throw error;
    }

    // Save per-question answers
    try {
      const userAnswerRecords = results.map(result => ({
        attemptId: newAttempt.id,
        questionId: result.questionId,
        selectedAnswer: result.userAnswer,
        isCorrect: result.isCorrect,
        createdAt: now,
      }));

      await db.insert(userAnswers).values(userAnswerRecords);
      console.log('Saved', userAnswerRecords.length, 'user answers');
    } catch (error) {
      console.error('Failed to save user answers:', error);
      // Don't throw - we still want to return results even if per-answer storage fails
    }

    // Update or create user progress with proper upsert handling
    try {
      // First, try to find existing progress
      const existingProgress = await db
        .select()
        .from(userProgress)
        .where(and(
          eq(userProgress.userId, user.id),
          eq(userProgress.testTypeId, testTypeId)
        ));

      console.log('Existing progress found:', existingProgress.length, 'records');

      if (existingProgress.length > 0) {
        // Update existing progress
        const progress = existingProgress[0];
        const currentTestsTaken = progress.testsTaken || 0;
        const newTestsTaken = currentTestsTaken + 1;
        // Convert averageScore to number if it's a string
        const currentAvgScore = typeof progress.averageScore === 'string'
          ? parseFloat(progress.averageScore)
          : (progress.averageScore || 0);
        const newAvgScore = ((currentAvgScore * currentTestsTaken) + score) / newTestsTaken;

        await db
          .update(userProgress)
          .set({
            averageScore: newAvgScore.toString(),
            testsTaken: newTestsTaken,
            lastAttemptAt: now,
            updatedAt: now,
          })
          .where(eq(userProgress.id, progress.id));

        console.log('Progress updated:', { userId: user.id, testTypeId, newAvgScore, newTestsTaken });
      } else {
        // Create new progress record
        await db.insert(userProgress).values({
          userId: user.id,
          testTypeId,
          averageScore: score.toString(),
          testsTaken: 1,
          lastAttemptAt: now,
          createdAt: now,
          updatedAt: now,
        });

        console.log('Progress created:', { userId: user.id, testTypeId, score, testsTaken: 1 });
      }
    } catch (error: any) {
      console.error('Failed to update/create userProgress:', error);
      // Log the specific error for debugging
      if (error?.code === '23505') {
        console.error('Unique constraint violation - this should not happen with proper upsert logic');
      }
      // Don't throw - we still want to return the test results even if progress tracking fails
    }

    return NextResponse.json({
      success: true,
      data: {
        score: Math.round(score), // Return rounded integer for UI
        totalQuestions,
        correctAnswers: correctCount,
        results,
        attemptId: newAttempt.id,
      },
    });
  } catch (error) {
    console.error('Error submitting test:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit test' },
      { status: 500 }
    );
  }
}
