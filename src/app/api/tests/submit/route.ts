import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, testAttempts, userProgress } from '@/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { testTypeId, answers } = body;

    if (!testTypeId || !answers) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: testTypeId and answers',
        },
        { status: 400 }
      );
    }

    // Fetch questions with correct answers
    const questionIds = answers.map((a: any) => a.questionId);
    const dbQuestions = await db
      .select()
      .from(questions)
      .where(inArray(questions.id, questionIds));

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

    // Save test attempt
    const [newAttempt] = await db
      .insert(testAttempts)
      .values({
        userId: user.id,
        testTypeId,
        score: score.toString(),
        totalQuestions,
        correctAnswers: correctCount,
        completedAt: new Date(),
      })
      .returning();

    // Update or create user progress
    const existingProgress = await db
      .select()
      .from(userProgress)
      .where(
        eq(userProgress.userId, user.id)
      );

    const userTestProgress = existingProgress.find(p => p.testTypeId === testTypeId);

    if (userTestProgress) {
      // Update existing progress
      const currentTestsTaken = userTestProgress.testsTaken || 0;
      const newTestsTaken = currentTestsTaken + 1;
      const currentAvgScore = parseFloat(userTestProgress.averageScore || '0');
      const newAvgScore = (
        (currentAvgScore * currentTestsTaken + score) /
        newTestsTaken
      ).toFixed(1);

      await db
        .update(userProgress)
        .set({
          averageScore: newAvgScore,
          testsTaken: newTestsTaken,
          lastAttemptAt: new Date(),
        })
        .where(eq(userProgress.id, userTestProgress.id));
    } else {
      // Create new progress record
      await db.insert(userProgress).values({
        userId: user.id,
        testTypeId,
        averageScore: score.toString(),
        testsTaken: 1,
        lastAttemptAt: new Date(),
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
      {
        success: false,
        error: 'Failed to submit test',
      },
      { status: 500 }
    );
  }
}
