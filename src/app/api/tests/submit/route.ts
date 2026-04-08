import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, testAttempts, userProgress, testTypes } from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    console.log('=== TEST SUBMIT API CALLED ===');

    // Check authentication
    const user = await getCurrentUser();
    console.log('getCurrentUser result:', user ? { id: user.id, email: user.email } : null);

    if (!user) {
      console.log('Authentication failed - no user found');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    let { testTypeId, answers } = body;
    console.log('Request body:', { testTypeId, answersCount: answers?.length });

    if (!testTypeId || !answers || !Array.isArray(answers)) {
      console.log('Validation failed - missing fields');
      return NextResponse.json(
        { success: false, error: 'Missing required fields: testTypeId and answers array' },
        { status: 400 }
      );
    }

    // Convert test type name to ID (e.g., 'focus-form' -> '1')
    const testTypeRecord = await db
      .select({ id: testTypes.id })
      .from(testTypes)
      .where(eq(testTypes.name, testTypeId))
      .limit(1)
      .then(rows => rows[0]);

    if (!testTypeRecord) {
      console.log('Test type not found:', testTypeId);
      return NextResponse.json(
        { success: false, error: 'Invalid test type' },
        { status: 400 }
      );
    }

    const testTypeDbId = testTypeRecord.id.toString();
    console.log('Test type ID resolved:', { name: testTypeId, dbId: testTypeDbId });

    // Fetch questions with correct answers using the numeric ID
    const questionIds = answers.map((a: any) => a.questionId);
    const dbQuestions = await db
      .select()
      .from(questions)
      .where(and(
        eq(questions.testTypeId, testTypeDbId),
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
    const score = Math.round((correctCount / totalQuestions) * 100);

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
        const currentAvgScore = parseFloat(progress.averageScore || '0') || 0;
        const newAvgScore = ((currentAvgScore * currentTestsTaken) + score) / newTestsTaken;

        await db
          .update(userProgress)
          .set({
            averageScore: newAvgScore.toFixed(1),
            testsTaken: newTestsTaken,
            lastAttemptAt: now,
            updatedAt: now,
          })
          .where(eq(userProgress.id, progress.id));

        console.log('Progress updated:', { userId: user.id, testTypeId, newAvgScore: newAvgScore.toFixed(1), newTestsTaken });
      } else {
        // Create new progress record
        await db.insert(userProgress).values({
          userId: user.id,
          testTypeId,
          averageScore: score.toFixed(1),
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
        score,
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
