import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { questions, testSetQuestions, testSets } from '@/db/schema';
import { checkUserRateLimit } from '@/lib/api-security';
import { isAdminRequest } from '@/lib/admin-auth';
import { isTapExerciseVisibleToLearners } from '@/lib/tap-visibility';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  testSetId: z.number().int().positive(),
  questionId: z.number().int().positive(),
  itemIndex: z.number().int().nonnegative(),
  selectedAnswer: z.enum(['A', 'B']),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  const rateLimitError = await checkUserRateLimit(session.user.id, {
    keySuffix: 'tap-answer-check',
    maxRequests: 60,
  });
  if (rateLimitError) return rateLimitError;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const { testSetId, questionId, itemIndex, selectedAnswer } = parsed.data;
  const [row] = await db
    .select({ tapExercise: questions.tapExercise })
    .from(testSetQuestions)
    .innerJoin(questions, eq(questions.id, testSetQuestions.questionId))
    .innerJoin(testSets, eq(testSets.id, testSetQuestions.testSetId))
    .where(and(
      eq(testSetQuestions.testSetId, testSetId),
      eq(testSetQuestions.questionId, questionId),
      eq(testSets.isActive, true),
    ))
    .limit(1);

  // CONTENT STATUS: กิจกรรมที่ยังไม่เผยแพร่ให้ผู้เรียนทำไม่ได้ — แอดมินทำได้เพื่อตรวจในโหมดพรีวิว
  if (row?.tapExercise && !isTapExerciseVisibleToLearners(row.tapExercise) && !(await isAdminRequest())) {
    return NextResponse.json({ success: false, error: 'Tap & Select item not found' }, { status: 404 });
  }

  const items = row?.tapExercise?.items;
  const item = Array.isArray(items) ? items[itemIndex] : undefined;
  if (!item || (item.correct !== 0 && item.correct !== 1)) {
    return NextResponse.json({ success: false, error: 'Tap & Select item not found' }, { status: 404 });
  }

  const correctAnswer = item.correct === 0 ? 'A' : 'B';
  return NextResponse.json({
    success: true,
    data: { isCorrect: selectedAnswer === correctAnswer },
  });
}
