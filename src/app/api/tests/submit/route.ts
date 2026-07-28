import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, testAttempts, userAnswers, userProgress, testTypes } from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
import { calculateScore } from '@/lib/score-utils';
import { checkIpThrottle, checkUserRateLimit } from '@/lib/api-security';
import { rateLimit, rateLimitResponse, getRateLimitIdentifier } from '@/lib/rate-limit';
import { z } from 'zod';

const submitBodySchema = z.object({
  testTypeId: z.string().min(1),
  testSetId: z.union([z.string(), z.number()]).optional(),
  answers: z.array(z.object({
    questionId: z.number().int().positive(),
    selectedAnswer: z.string(),
  })).min(1),
  isDemo: z.boolean().optional().default(false),
  startedAt: z.string().datetime().optional(),
});

export const dynamic = 'force-dynamic';

/**
 * POST /api/tests/submit
 * Submit test answers and calculate/store results.
 *
 * Request body:
 * {
 *   testTypeId: string,           // e.g. 'focus-form'
 *   answers: Array<{              // array of submitted answers
 *     questionId: number,
 *     selectedAnswer: string
 *   }>,
 *   isDemo?: boolean              // optional, defaults to false
 * }
 */
export async function POST(request: NextRequest) {
  // IP throttle for DoS protection (applies to both demo and real)
  const ipThrottleError = await checkIpThrottle(request, { keySuffix: 'tests-submit' });
  if (ipThrottleError) return ipThrottleError;

  // Demo mode: IP-based rate limit only (no auth required)
  // Parse body first to check isDemo before deciding on rate limit strategy
  let parsedBody: z.SafeParseReturnType<typeof submitBodySchema._type, typeof submitBodySchema._type>;
  try {
    const body = await request.json();
    parsedBody = submitBodySchema.safeParse(body);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (!parsedBody.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body', details: parsedBody.error.flatten() },
      { status: 400 }
    );
  }

  const { testTypeId, testSetId, answers, isDemo, startedAt: clientStartedAt } = parsedBody.data;

  // Fetch questions to validate answers
  const questionIds = answers.map((a: { questionId: number }) => a.questionId);
  const dbQuestions = await db
    .select()
    .from(questions)
    .where(and(eq(questions.testTypeId, testTypeId), inArray(questions.id, questionIds)));

  const { results, correctCount, totalQuestions, score } = calculateScore(answers, dbQuestions);

  // For demo mode, skip authentication and database storage
  if (isDemo) {
    const demoRl = await rateLimit(
      getRateLimitIdentifier(request) + ':demo-submit',
      { windowMs: 60_000, maxRequests: 5 }
    );
    if (demoRl.limited) return rateLimitResponse(demoRl.retryAfterMs);

    // SECURITY: demo responses omit `results` (which carries correctAnswer + explanation)
    // — exposing these to unauthenticated clients lets attackers harvest the answer key
    // by iterating question IDs. Demo users only get an aggregate score.
    return NextResponse.json({
      success: true,
      data: {
        score: Math.round(score),
        totalQuestions,
        correctAnswers: correctCount,
        isDemo: true,
      },
    });
  }

  // Real mode — require authentication and per-user rate limit
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const userRlError = await checkUserRateLimit(user.id, { windowMs: 60_000, maxRequests: 5, keySuffix: 'submit' });
  if (userRlError) return userRlError;

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
  const actualStartedAt = clientStartedAt ? new Date(clientStartedAt) : now;

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
        startedAt: actualStartedAt,
        completedAt: now,
        // status column defaults to 'in_progress' — must set explicitly or the
        // attempt is invisible to /progress, which filters status='completed'
        status: 'completed',
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
}