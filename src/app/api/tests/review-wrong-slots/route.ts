import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { questions, testSetQuestions, testSets } from '@/db/schema';
import { checkUserRateLimit } from '@/lib/api-security';
import { expandTestSetSlots, findIncorrectTestSetSlots } from '@/lib/test-set-slots';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  testTypeId: z.string().min(1),
  testSetId: z.number().int().positive(),
  answers: z.array(z.object({
    questionId: z.number().int().positive(),
    selectedAnswer: z.string(),
  })).min(1),
});

/** Return only incorrect slot indexes; never expose answer keys. */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  const rateLimitError = await checkUserRateLimit(session.user.id, {
    keySuffix: 'review-wrong-slots',
    maxRequests: 30,
  });
  if (rateLimitError) return rateLimitError;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const { testTypeId, testSetId, answers } = parsed.data;
  const [set] = await db
    .select({ sectionId: testSets.sectionId })
    .from(testSets)
    .where(and(eq(testSets.id, testSetId), eq(testSets.sectionId, testTypeId), eq(testSets.isActive, true)))
    .limit(1);

  if (!set) {
    return NextResponse.json({ success: false, error: 'Test set not found' }, { status: 404 });
  }

  const setQuestions = await db
    .select({
      id: questions.id,
      testTypeId: questions.testTypeId,
      correctAnswer: questions.correctAnswer,
      article: questions.article,
      tapExercise: questions.tapExercise,
    })
    .from(testSetQuestions)
    .innerJoin(questions, eq(questions.id, testSetQuestions.questionId))
    .where(eq(testSetQuestions.testSetId, testSetId))
    .orderBy(asc(testSetQuestions.orderIndex));

  const submittedIds = answers.map(answer => answer.questionId);
  const expectedIds = setQuestions.map(question => question.id);
  if (
    submittedIds.length !== expectedIds.length
    || new Set(submittedIds).size !== submittedIds.length
    || expectedIds.some(id => !submittedIds.includes(id))
  ) {
    return NextResponse.json({ success: false, error: 'Answers do not match this test set' }, { status: 400 });
  }

  const typedQuestions = setQuestions.map(question => ({
    ...question,
    article: question.article as { title: string; text: string; blanks: { id: number; correctAnswer: string; hint?: string }[] } | null,
  }));
  const slots = expandTestSetSlots(typedQuestions);
  const wrongSlots = findIncorrectTestSetSlots(typedQuestions, slots, answers);
  return NextResponse.json({ success: true, data: { wrongSlots } });
}
