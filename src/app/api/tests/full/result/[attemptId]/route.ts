import { NextResponse } from 'next/server';
import { db } from '@/db';
import { testAttempts, questions } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
import { checkIpThrottle, checkUserRateLimit } from '@/lib/api-security';
import { estimateCefrLevel } from '@/lib/cefr-estimator';
import { calculateConfidence } from '@/lib/full-test/algorithm';
import { type CefrLevel } from '@/lib/full-test/constants';

export const dynamic = 'force-dynamic';

interface PathEntry {
  questionId: number;
  testTypeId: string;
  cefrLevel: CefrLevel;
  wasCorrect: boolean;
  selectedAnswer: string;
  orderIndex: number;
  reused?: boolean;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const ipThrottleError = await checkIpThrottle(request, { keySuffix: 'full-result' });
  if (ipThrottleError) return ipThrottleError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitError = await checkUserRateLimit(user.id, { windowMs: 60_000, maxRequests: 30, keySuffix: 'result' });
  if (rateLimitError) return rateLimitError;

  const { attemptId: attemptIdStr } = await params;
  const attemptId = parseInt(attemptIdStr);
  if (Number.isNaN(attemptId) || attemptId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid attempt ID' }, { status: 400 });
  }

  const [attempt] = await db
    .select()
    .from(testAttempts)
    .where(and(eq(testAttempts.id, attemptId), eq(testAttempts.userId, user.id)));

  if (!attempt) {
    return NextResponse.json({ success: false, error: 'Attempt not found' }, { status: 404 });
  }

  if (attempt.status !== 'completed') {
    return NextResponse.json({ success: false, error: 'Attempt not completed' }, { status: 400 });
  }

  const score = parseFloat(attempt.score ?? '0');
  const cefrLevel = attempt.score ? estimateCefrLevel(score) : null;
  const totalQuestions = attempt.totalQuestions ?? 0;
  const confidence = calculateConfidence(totalQuestions);
  const path = (attempt.adaptivePath ?? []) as PathEntry[];
  const reusedCount = path.filter((p) => p.reused).length;

  const formMeaningIds = path
    .filter((p) => p.testTypeId === 'form-meaning')
    .map((p) => p.questionId);

  const blankCounts = new Map<number, { total: number; correct: number }>();

  if (formMeaningIds.length > 0) {
    const fmQuestions = await db
      .select({ id: questions.id, article: questions.article })
      .from(questions)
      .where(inArray(questions.id, formMeaningIds));

    for (const q of fmQuestions) {
      const art = q.article as { blanks?: Array<{ id: number; correctAnswer: string }> } | null;
      const blanks = art?.blanks;
      if (!Array.isArray(blanks) || blanks.length === 0) continue;

      const pathEntry = path.find((p) => p.questionId === q.id);
      if (!pathEntry) continue;

      let parsed: Record<string, string> = {};
      try {
        parsed = JSON.parse(pathEntry.selectedAnswer);
      } catch { /* empty */ }

      const blanksCorrect = blanks.filter(
        (b) => (parsed[String(b.id)] ?? '').toLowerCase().trim() === b.correctAnswer.toLowerCase().trim()
      ).length;

      blankCounts.set(q.id, { total: blanks.length, correct: blanksCorrect });
    }
  }

  // Compute per-part stats with form-meaning expanded to per-blank
  const perPart: Record<string, { total: number; correct: number }> = {};
  for (const entry of path) {
    if (!perPart[entry.testTypeId]) {
      perPart[entry.testTypeId] = { total: 0, correct: 0 };
    }
    const blanks = blankCounts.get(entry.questionId);
    if (entry.testTypeId === 'form-meaning' && blanks && blanks.total > 0) {
      perPart[entry.testTypeId].total += blanks.total;
      perPart[entry.testTypeId].correct += blanks.correct;
    } else {
      perPart[entry.testTypeId].total++;
      if (entry.wasCorrect) perPart[entry.testTypeId].correct++;
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      attemptId: attempt.id,
      score,
      cefrLevel,
      correctAnswers: attempt.correctAnswers,
      totalQuestions,
      adaptivePath: attempt.adaptivePath ?? [],
      confidence,
      reusedCount,
      perPart,
    },
  });
}