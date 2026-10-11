import { NextResponse } from 'next/server';
import { db } from '@/db';
import { testAttempts, questions } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
import { checkIpThrottle, checkUserRateLimit } from '@/lib/api-security';
import { calculateFullTestResult } from '@/lib/full-test/result';
import type { AttemptPathEntry } from '@/lib/full-test/state';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const ipError = await checkIpThrottle(request, { keySuffix: 'full-result' });
  if (ipError) return ipError;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const limitError = await checkUserRateLimit(user.id, { maxRequests: 30, keySuffix: 'result' });
  if (limitError) return limitError;
  const { attemptId: rawId } = await params;
  const attemptId = Number(rawId);
  if (!Number.isSafeInteger(attemptId) || attemptId <= 0) return NextResponse.json({ success: false, error: 'Invalid attempt ID' }, { status: 400 });
  try {
    const [attempt] = await db.select().from(testAttempts)
      .where(and(eq(testAttempts.id, attemptId), eq(testAttempts.userId, user.id), eq(testAttempts.testTypeId, 'full-test')));
    if (!attempt) return NextResponse.json({ success: false, error: 'Attempt not found' }, { status: 404 });
    if (attempt.status !== 'completed') return NextResponse.json({ success: false, error: 'Attempt not completed' }, { status: 400 });
    const path = (attempt.adaptivePath ?? []) as AttemptPathEntry[];
    const legacyIds = path.filter((entry) => !entry.questionSnapshot).map((entry) => entry.questionId);
    const legacyQuestions = legacyIds.length ? await db.select().from(questions).where(inArray(questions.id, legacyIds)) : [];
    const result = calculateFullTestResult(path, legacyQuestions);
    return NextResponse.json({ success: true, data: { ...result, attemptId, adaptivePath: path } }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[full/result] Failed to read result:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch test result' }, { status: 500 });
  }
}
