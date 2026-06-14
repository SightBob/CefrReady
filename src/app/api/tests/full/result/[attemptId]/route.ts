import { NextResponse } from 'next/server';
import { db } from '@/db';
import { testAttempts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth-utils';
import { normalizedScoreToCefr } from '@/lib/full-test/algorithm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { attemptId: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const attemptId = parseInt(params.attemptId);
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

  return NextResponse.json({
    success: true,
    data: {
      attemptId: attempt.id,
      score: parseFloat(attempt.score ?? '0'),
      cefrLevel: attempt.score ? normalizedScoreToCefr(parseFloat(attempt.score)) : null,
      correctAnswers: attempt.correctAnswers,
      totalQuestions: attempt.totalQuestions,
      adaptivePath: attempt.adaptivePath ?? [],
    },
  });
}
