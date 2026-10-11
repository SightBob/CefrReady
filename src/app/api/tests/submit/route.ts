import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, testAttempts, userAnswers, testTypes, testSets, testSetQuestions, tapReasonSubmissions } from '@/db/schema';
import { eq, inArray, and, sql, asc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
import { calculateScore, parseStructuredAnswer } from '@/lib/score-utils';
import { filterQuestionsForLearners } from '@/lib/tap-visibility';
import { isAdminRequest } from '@/lib/admin-auth';
import { MAX_TAP_REASON_LENGTH, collectTapReasonRows, computeTapReasonRewardPoints } from '@/lib/tap-reason-rewards';
import { getTapReasonRewardSettingsSafe } from '@/lib/tap-reason-settings';
import { checkIpThrottle, checkUserRateLimit } from '@/lib/api-security';
import { rateLimit, rateLimitResponse, getRateLimitIdentifier } from '@/lib/rate-limit';
import { z } from 'zod';

const submitBodySchema = z.object({
  testTypeId: z.string().min(1),
  testSetId: z.union([z.string().regex(/^[1-9]\d*$/).transform(Number), z.number().int().positive()]).optional(),
  preview: z.boolean().default(false),
  answers: z.array(z.object({
    questionId: z.number().int().positive(),
    selectedAnswer: z.string().max(20_000),
  })).min(1).max(1000),
  isDemo: z.boolean().optional().default(false),
  startedAt: z.string().datetime().optional(),
  // Tap & Select เหตุผลที่ผู้เรียนพิมพ์ keyed โดย questionId → itemIndex
  // (เก็บเฉพาะที่มีข้อความจริง — ว่างไม่ถูกบันทึก)
  tapReasons: z
    .record(z.string(), z.record(z.string(), z.string().max(MAX_TAP_REASON_LENGTH)))
    .optional(),
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
  try { return await submitRequest(request); }
  catch (error) {
    console.error('[submit] Failed to submit:', error);
    const conflict = error instanceof Error && error.message === 'Submission already committed';
    return NextResponse.json({ success: false, error: conflict ? 'Submission already committed' : 'Failed to save test results' }, { status: conflict ? 409 : 500 });
  }
}

async function submitRequest(request: NextRequest) {
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

  const { testTypeId, testSetId, answers, isDemo, preview, startedAt: clientStartedAt, tapReasons: clientReasons } = parsedBody.data;
  if (testTypeId === 'tap-select' || testTypeId === 'full-test') {
    return NextResponse.json({ success: false, error: 'Tap & Select must be submitted as part of its parent test set' }, { status: 400 });
  }

  // Authenticate before any question-bank work; real submissions require an authored set.
  const user = isDemo ? null : await getCurrentUser();
  if (!isDemo && !user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  if (!isDemo && testSetId === undefined) return NextResponse.json({ success: false, error: 'Test set is required' }, { status: 400 });
  if (user) {
    const limit = await checkUserRateLimit(user.id, { windowMs: 60_000, maxRequests: 5, keySuffix: 'submit' });
    if (limit) return limit;
  }
  // Fetch questions to validate answers
  const questionIds = [...new Set(answers.map((a: { questionId: number }) => a.questionId))];
  if (questionIds.length !== answers.length) return NextResponse.json({ success: false, error: 'Duplicate question IDs' }, { status: 400 });
  if (preview && !(await isAdminRequest())) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  let dbQuestions = await db
    .select()
    .from(questions)
    .where(and(eq(questions.testTypeId, testTypeId), inArray(questions.id, questionIds)));

  if (testSetId !== undefined) {
    const [set] = await db.select().from(testSets).where(and(eq(testSets.id, testSetId), eq(testSets.sectionId, testTypeId), eq(testSets.isActive, true))).limit(1);
    if (!set) return NextResponse.json({ success: false, error: 'Invalid test set' }, { status: 400 });
    const rows = await db.select({ question: questions }).from(testSetQuestions)
      .innerJoin(questions, eq(questions.id, testSetQuestions.questionId))
      .where(eq(testSetQuestions.testSetId, testSetId)).orderBy(asc(testSetQuestions.orderIndex));
    dbQuestions = rows.map((row) => row.question);
  }
  if (!preview) dbQuestions = filterQuestionsForLearners(dbQuestions);
  if (!dbQuestions.length || questionIds.some((id) => !dbQuestions.some((question) => question.id === id))) {
    return NextResponse.json({ success: false, error: 'Questions do not belong to this test' }, { status: 400 });
  }
  for (const answer of answers) {
    const question = dbQuestions.find((entry) => entry.id === answer.questionId)!;
    if ((question.tapExercise?.items.length || question.testTypeId === 'form-meaning') && !parseStructuredAnswer(answer.selectedAnswer)) {
      return NextResponse.json({ success: false, error: 'Invalid structured answer' }, { status: 400 });
    }
  }
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

  // Real mode has already authenticated above.
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

  const now = new Date();
  // SECURITY (report L2): client-supplied startedAt is forgeable — never
  // trust a future timestamp, and reject set/type mismatches that pollute stats.
  const actualStartedAt =
    clientStartedAt && new Date(clientStartedAt) <= now ? new Date(clientStartedAt) : now;

  const reviewSnapshot = results.map((result, index) => ({
    questionId: result.questionId, userAnswer: result.userAnswer, isCorrect: result.isCorrect,
    question: { ...dbQuestions[index], orderIndex: index },
  }));
  // Commit attempt, answers and progress together; a failed write rolls all back.
  const newAttempt = await db.transaction(async (tx) => {
  // Save test attempt
  let newAttempt;
  try {
    if (clientStartedAt) {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${user.id}:${testTypeId}:${testSetId ?? ''}:${clientStartedAt}`}, 0))`);
      const [existing] = await tx.select().from(testAttempts).where(and(
        eq(testAttempts.userId, user.id), eq(testAttempts.testTypeId, testTypeId), eq(testAttempts.startedAt, actualStartedAt),
        sql`${testAttempts.testSetId} IS NOT DISTINCT FROM ${testSetId ?? null}`,
      )).limit(1);
      if (existing) {
        if (existing.currentLevels?.__review !== JSON.stringify(reviewSnapshot)) throw new Error('Submission already committed');
        return existing;
      }
    }
    [newAttempt] = await tx
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
        currentLevels: { __review: JSON.stringify(reviewSnapshot) },
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
    await tx.insert(userAnswers).values(userAnswerRecords);
  } catch (error) {
    console.error('[submit] Failed to save user answers:', error);
    throw error;
  }

  // Tap & Select: เก็บเหตุผลที่ผู้เรียนพิมพ์ (เฉพาะที่มีข้อความเท่านั้น)
  // ถ้าแอดมินเปิด "คะแนนเหมา" จะให้คะแนนทันทีที่ส่ง — ไม่ต้องประเมินทีละคำตอบ
  // ถ้าปิดไว้ rewardPoints = null แล้วรอแอดมินให้คะแนนเองที่หน้า admin/tap-reasons
  try {
    const reasonRows = collectTapReasonRows({
      attemptId: newAttempt.id,
      userId: user.id,
      createdAt: now,
      results,
      questions: dbQuestions,
      clientReasons,
    });
    if (reasonRows.length > 0) {
      // ให้คะแนนเป็นงานเสริม: อ่านค่าตั้งไม่สำเร็จ = เก็บเหตุผลไว้แบบยังไม่ให้คะแนน
      // (ต้องไม่ทำให้เหตุผลที่ผู้เรียนเขียนหายไป)
      let rewards: Array<number | null> = reasonRows.map(() => null);
      try {
        rewards = computeTapReasonRewardPoints(await getTapReasonRewardSettingsSafe(), reasonRows);
      } catch (error) {
        console.warn('[submit] อ่านค่าคะแนนเหมาไม่สำเร็จ — เก็บเหตุผลไว้แบบยังไม่ให้คะแนน:', error);
      }
      const rowsToInsert = reasonRows.map((row, index) => {
        const points = rewards[index] ?? null;
        return { ...row, rewardPoints: points, scoredAt: points === null ? null : now };
      });
      // onConflictDoNothing: unique (attempt, question, item) กัน submit ซ้ำไม่ให้การส่งล้มทั้งก้อน
      await tx.insert(tapReasonSubmissions).values(rowsToInsert).onConflictDoNothing();
    }
  } catch (error) {
    console.error('[submit] Failed to save tap reasons:', error);
    throw error;
  }

  // Update or create user progress — atomic upsert (ON CONFLICT) computes
  // the weighted average inside Postgres, so concurrent submits can no
  // longer race on a read-then-write and skew the average.
  try {
    await tx.execute(sql`
      INSERT INTO user_progress (user_id, test_type_id, average_score, tests_taken, last_attempt_at)
      VALUES (${user.id}, ${testTypeId}, ${score}, 1, now())
      ON CONFLICT (user_id, test_type_id) DO UPDATE SET
        tests_taken = COALESCE(user_progress.tests_taken, 0) + 1,
        average_score = (
          (COALESCE(user_progress.average_score, 0)
            * COALESCE(user_progress.tests_taken, 0)) + ${score}
        ) / (COALESCE(user_progress.tests_taken, 0) + 1),
        last_attempt_at = now(),
        updated_at = now()
    `);
  } catch (error) {
    console.error('[submit] Failed to update userProgress:', error);
    throw error;
  }
  return newAttempt;
  });
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