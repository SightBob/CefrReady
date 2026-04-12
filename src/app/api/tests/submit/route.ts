import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, testAttempts, userAnswers, userProgress, testTypes } from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
import { calculateScore } from '@/lib/score-utils';

export const dynamic = 'force-dynamic';

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
    const body = await request.json();
    const { testTypeId, testSetId, answers, isDemo = false } = body;

    if (!testTypeId || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: testTypeId and answers array' },
        { status: 400 }
      );
    }

    // Fetch questions to validate answers
    const questionIds = answers.map((a: { questionId: number }) => a.questionId);
    const dbQuestions = await db
      .select()
      .from(questions)
      .where(and(eq(questions.testTypeId, testTypeId), inArray(questions.id, questionIds)));

    const { results, correctCount, totalQuestions, score } = calculateScore(answers, dbQuestions);

    // For demo mode, skip authentication and database storage
    if (isDemo) {
      return NextResponse.json({
        success: true,
        data: {
          score: Math.round(score),
          totalQuestions,
          correctAnswers: correctCount,
          results,
          isDemo: true,
        },
      });
    }

    // Real mode — require authentication
    const user = await getCurrentUser();

    if (!user) {
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
      .then((rows) => rows[0]);

    if (!testTypeExists) {
      return NextResponse.json(
        { success: false, error: 'Invalid test type' },
        { status: 400 }
      );
    }

    if (dbQuestions.length !== questionIds.length) {
      console.warn(`[submit] Some questions not found: requested=${questionIds.length}, found=${dbQuestions.length}`);
    }

    const now = new Date();

    // Save test attempt
    let newAttempt;
    try {
      [newAttempt] = await db
        .insert(testAttempts)
        .values({
          userId: user.id,
          testTypeId,
          testSetId: testSetId ? parseInt(String(testSetId)) : undefined,
          score: score.toString(),
          totalQuestions,
          correctAnswers: correctCount,
          startedAt: now,
          completedAt: now,
        })
        .returning();
    } catch (error) {
      console.error('[submit] Failed to save test attempt:', error);
      throw error;
    }

    // Save per-question answers
    try {
      const userAnswerRecords = results.map((result) => ({
        attemptId: newAttempt.id,
        questionId: result.questionId,
        selectedAnswer: result.userAnswer,
        isCorrect: result.isCorrect,
        createdAt: now,
      }));
      await db.insert(userAnswers).values(userAnswerRecords);
    } catch (error) {
      console.error('[submit] Failed to save user answers:', error);
      // Non-fatal — continue to return results
    }

    // Update or create user progress
    try {
      const existingProgress = await db
        .select()
        .from(userProgress)
        .where(
          and(eq(userProgress.userId, user.id), eq(userProgress.testTypeId, testTypeId))
        );

      if (existingProgress.length > 0) {
        const progress = existingProgress[0];
        const currentTestsTaken = progress.testsTaken || 0;
        const newTestsTaken = currentTestsTaken + 1;
        const currentAvgScore =
          typeof progress.averageScore === 'string'
            ? parseFloat(progress.averageScore)
            : progress.averageScore || 0;
        const safeAvg = Number.isFinite(currentAvgScore) ? currentAvgScore : 0;
        const newAvgScore = (safeAvg * currentTestsTaken + score) / newTestsTaken;

        await db
          .update(userProgress)
          .set({
            averageScore: newAvgScore.toString(),
            testsTaken: newTestsTaken,
            lastAttemptAt: now,
            updatedAt: now,
          })
          .where(eq(userProgress.id, progress.id));
      } else {
        await db.insert(userProgress).values({
          userId: user.id,
          testTypeId,
          averageScore: score.toString(),
          testsTaken: 1,
          lastAttemptAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch (error: unknown) {
      console.error('[submit] Failed to update userProgress:', error);
      // Non-fatal — results still returned
    }

    return NextResponse.json({
      success: true,
      data: {
        score: Math.round(score),
        totalQuestions,
        correctAnswers: correctCount,
        results,
        attemptId: newAttempt.id,
      },
    });
  } catch (error) {
    console.error('[submit] Unhandled error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit test' },
      { status: 500 }
    );
  }
}
