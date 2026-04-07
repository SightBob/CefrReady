import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, testAttempts, userProgress } from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { testTypeId, answers } = body;

    if (!testTypeId || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: testTypeId and answers array' },
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
    const score = Math.round((correctCount / totalQuestions) * 100);

    const now = new Date();

    // Save test attempt
    const [newAttempt] = await db
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

    // Update or create user progress using upsert pattern
    const existingProgress = await db
      .select()
      .from(userProgress)
      .where(and(
        eq(userProgress.userId, user.id),
        eq(userProgress.testTypeId, testTypeId)
      ));

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
