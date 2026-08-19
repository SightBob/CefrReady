import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { testAttempts, questions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { validateOrigin, checkIpThrottle, checkUserRateLimit } from '@/lib/api-security';
import {
  FULL_TEST_PART_DISTRIBUTION,
  FULL_TEST_TOTAL_QUESTIONS,
  FULL_TEST_TOTAL_SECONDS,
  type CefrLevel,
  type PerTypeLevels,
  cefrIndex,
  CEFR_LEVELS,
} from '@/lib/full-test/constants';
import { getNextLevel, selectQuestion, getPerTypeAnswerHistory, getInitialLevels } from '@/lib/full-test/algorithm';
import { determineSelectionMode, logQuestionSelection } from '@/lib/full-test/log-selection';
import { sanitizeQuestionForClient } from '@/lib/sanitize-question';

const bodySchema = z.object({
  attemptId: z.number().int(),
  questionId: z.number().int(),
  selectedAnswer: z.string(),
  timeRemaining: z.number().int().min(0).max(FULL_TEST_TOTAL_SECONDS),
});

// Adaptive selection only needs id/type/level metadata — avoids transferring
// the whole pool's heavy columns (article jsonb, transcript, explanation) on
// every question. The selected question is hydrated separately.
const poolSelection = { id: questions.id, testTypeId: questions.testTypeId, cefrLevel: questions.cefrLevel };

interface PathEntry {
  questionId: number;
  testTypeId: string;
  cefrLevel: CefrLevel;
  difficulty: string | null;
  wasCorrect: boolean;
  selectedAnswer: string;
  orderIndex: number;
  reused?: boolean;
}

interface GradeableQuestion {
  testTypeId: string;
  cefrLevel: string;
  difficulty: string | null;
  correctAnswer: string | null;
  article: unknown;
}

function gradeAnswer(
  question: GradeableQuestion,
  selectedAnswer: string
): boolean {
  if (
    question.testTypeId === 'form-meaning' &&
    question.article &&
    typeof question.article === 'object'
  ) {
    const art = question.article as { blanks?: Array<{ id: number; correctAnswer: string }> };
    if (Array.isArray(art.blanks) && art.blanks.length > 0) {
      let parsed: Record<string, string> = {};
      try {
        parsed = JSON.parse(selectedAnswer);
      } catch {
        // Leave parsed empty; the blanks comparison below will fail gracefully.
      }
      const blanksCorrect = art.blanks.filter(
        (b) =>
          (parsed[String(b.id)] ?? '').toLowerCase().trim() ===
          b.correctAnswer.toLowerCase().trim()
      ).length;
      return blanksCorrect === art.blanks.length;
    }
  }
  return (
    selectedAnswer.toLowerCase().trim() ===
    (question.correctAnswer ?? '').toLowerCase().trim()
  );
}

// For adaptive purposes, treat form-meaning as a single aggregate entry.
// (Score granularity is per-blank in submit-attempt.ts, but adaptive
//  granularity is per-question — avoid multiple level jumps from one question.)
function applyAdaptiveLevel(
  path: PathEntry[],
  beforeLevels: PerTypeLevels,
  testTypeId: string
): PerTypeLevels {
  const levels = { ...beforeLevels };
  const history = getPerTypeAnswerHistory(path, testTypeId);
  levels[testTypeId] = getNextLevel((levels[testTypeId] as CefrLevel) ?? 'B1', history);
  return levels;
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const originError = validateOrigin(request);
  if (originError) return originError;

  // JWT session carries user.id — skips a users-table round trip per request.
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const [ipThrottleError, rateLimitError] = await Promise.all([
    checkIpThrottle(request, { keySuffix: 'full-next' }),
    checkUserRateLimit(userId, { windowMs: 60_000, maxRequests: 30, keySuffix: 'next' }),
  ]);
  if (ipThrottleError) return ipThrottleError;
  if (rateLimitError) return rateLimitError;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const { attemptId, questionId, selectedAnswer, timeRemaining } = parsed.data;

  const [attempt] = await db
    .select()
    .from(testAttempts)
    .where(and(eq(testAttempts.id, attemptId), eq(testAttempts.userId, userId)));

  if (!attempt || attempt.status !== 'in_progress') {
    return NextResponse.json({ success: false, error: 'Attempt not found' }, { status: 404 });
  }

  const currentPath = (attempt.adaptivePath ?? []) as PathEntry[];
  const beforeLevels: PerTypeLevels = (attempt.currentLevels as PerTypeLevels) ?? getInitialLevels('B1');

  // Idempotent: question already processed — return current state instead of erroring.
  // This handles double-clicks, React strict mode re-renders, and page refreshes.
  const isDuplicate = currentPath.some((p) => p.questionId === questionId);
  const nextIndex = isDuplicate ? currentPath.length : currentPath.length + 1;

  // The next part is fixed by position in the test and the grading fetch is
  // keyed by the request body — both can start before any adaptive logic runs,
  // so the pool and grade queries share one round-trip window.
  const isFinishing = nextIndex >= FULL_TEST_TOTAL_QUESTIONS;
  const nextPart = FULL_TEST_PART_DISTRIBUTION[nextIndex];
  const poolPromise = isFinishing
    ? null
    : db
        .select(poolSelection)
        .from(questions)
        .where(and(eq(questions.testTypeId, nextPart), eq(questions.active, 'true')));
  const gradePromise = isDuplicate
    ? null
    : db
        .select({
          testTypeId: questions.testTypeId,
          cefrLevel: questions.cefrLevel,
          difficulty: questions.difficulty,
          correctAnswer: questions.correctAnswer,
          article: questions.article,
        })
        .from(questions)
        .where(eq(questions.id, questionId))
        .limit(1);

  let newPath: PathEntry[] = currentPath;
  let levels: PerTypeLevels = beforeLevels;

  if (gradePromise) {
    const [question] = await gradePromise;

    if (!question) {
      return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 });
    }

    newPath = [
      ...currentPath,
      {
        questionId,
        testTypeId: question.testTypeId,
        cefrLevel: question.cefrLevel as CefrLevel,
        difficulty: question.difficulty,
        wasCorrect: gradeAnswer(question, selectedAnswer),
        selectedAnswer,
        orderIndex: currentPath.length,
        reused: false,
      },
    ];
    levels = applyAdaptiveLevel(newPath, beforeLevels, question.testTypeId);
  }

  if (isFinishing) {
    if (!isDuplicate) {
      await db
        .update(testAttempts)
        .set({
          adaptivePath: newPath,
          currentLevels: levels,
          timeRemainingSeconds: timeRemaining,
          lastActivityAt: new Date(),
        })
        .where(eq(testAttempts.id, attemptId));
    }
    return NextResponse.json({ success: true, data: { finished: true } });
  }

  const nextTypeLevel = (levels[nextPart] as CefrLevel) ?? 'B1';
  const prevLevel = (beforeLevels[nextPart] as CefrLevel) ?? 'B1';
  const direction: 'up' | 'down' | 'neutral' =
    cefrIndex(nextTypeLevel) > cefrIndex(prevLevel) ? 'up' :
    cefrIndex(nextTypeLevel) < cefrIndex(prevLevel) ? 'down' : 'neutral';

  const seenQuestionIds = new Set(newPath.map((p) => p.questionId));
  const pool = await poolPromise!;

  let selection = selectQuestion({
    questions: pool,
    seenQuestionIds,
    targetLevel: nextTypeLevel,
    requiredTestTypeId: nextPart,
    direction,
  });

  if (!selection) {
    if (!isDuplicate) {
      await db
        .update(testAttempts)
        .set({
          adaptivePath: newPath,
          timeRemainingSeconds: timeRemaining,
          lastActivityAt: new Date(),
        })
        .where(eq(testAttempts.id, attemptId));
    }
    return NextResponse.json({ success: true, data: { finished: true, reason: 'pool_exhausted' } });
  }

  // Guard: if selected question has an invalid cefrLevel, re-select
  if (!CEFR_LEVELS.includes(selection.question.cefrLevel as CefrLevel)) {
    seenQuestionIds.add(selection.question.id);
    const reselect = selectQuestion({
      questions: pool,
      seenQuestionIds,
      targetLevel: nextTypeLevel,
      requiredTestTypeId: nextPart,
      direction,
    });
    if (!reselect && isDuplicate) {
      return NextResponse.json({ success: true, data: { finished: true, reason: 'pool_exhausted' } });
    }
    if (reselect) selection = reselect;
  }

  const selMode = determineSelectionMode(selection.reused, selection.question.cefrLevel, nextTypeLevel);

  // Persist path, hydrate the selected question, and log the selection
  // concurrently — none of the three depends on another's result.
  const [questionRows] = await Promise.all([
    db.select().from(questions).where(eq(questions.id, selection.question.id)),
    isDuplicate
      ? Promise.resolve(null)
      : db
          .update(testAttempts)
          .set({
            adaptivePath: newPath,
            currentLevels: levels,
            timeRemainingSeconds: timeRemaining,
            lastActivityAt: new Date(),
          })
          .where(eq(testAttempts.id, attemptId)),
    logQuestionSelection({
      attemptId,
      testTypeId: nextPart,
      questionId: selection.question.id,
      targetLevel: nextTypeLevel,
      selectedLevel: selection.question.cefrLevel,
      mode: selMode,
    }),
  ]);
  const fullQuestion = questionRows[0];

  if (!fullQuestion) {
    return NextResponse.json({ success: false, error: 'Question not found' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      // SECURITY: never send correctAnswer/explanation pre-submission (C3).
      question: sanitizeQuestionForClient(fullQuestion),
      questionIndex: nextIndex,
      finished: false,
    },
  });
}
