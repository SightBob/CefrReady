import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, testTypes, testSetQuestions, testSets } from '@/db/schema';
import { eq, desc, inArray, and, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const searchParams = request.nextUrl.searchParams;
    const testTypeId = searchParams.get('testTypeId');

    let allQuestions;

    if (testTypeId) {
      allQuestions = await db
        .select({
          id: questions.id,
          testTypeId: questions.testTypeId,
          questionText: questions.questionText,
          optionA: questions.optionA,
          optionB: questions.optionB,
          optionC: questions.optionC,
          optionD: questions.optionD,
          correctAnswer: questions.correctAnswer,
          explanation: questions.explanation,
          difficulty: questions.difficulty,
          cefrLevel: questions.cefrLevel,
          active: questions.active,
          orderIndex: questions.orderIndex,
          createdAt: questions.createdAt,
          conversation: questions.conversation,
          article: questions.article,
          audioUrl: questions.audioUrl,
          transcript: questions.transcript,
          testType: {
            id: testTypes.id,
            name: testTypes.name,
          },
        })
        .from(questions)
        .leftJoin(testTypes, eq(questions.testTypeId, testTypes.id))
        .where(eq(questions.testTypeId, testTypeId))
        .orderBy(desc(questions.createdAt));
    } else {
      allQuestions = await db
        .select({
          id: questions.id,
          testTypeId: questions.testTypeId,
          questionText: questions.questionText,
          optionA: questions.optionA,
          optionB: questions.optionB,
          optionC: questions.optionC,
          optionD: questions.optionD,
          correctAnswer: questions.correctAnswer,
          explanation: questions.explanation,
          difficulty: questions.difficulty,
          cefrLevel: questions.cefrLevel,
          active: questions.active,
          orderIndex: questions.orderIndex,
          createdAt: questions.createdAt,
          conversation: questions.conversation,
          article: questions.article,
          audioUrl: questions.audioUrl,
          transcript: questions.transcript,
          testType: {
            id: testTypes.id,
            name: testTypes.name,
          },
        })
        .from(questions)
        .leftJoin(testTypes, eq(questions.testTypeId, testTypes.id))
        .orderBy(desc(questions.createdAt));
    }

    // Fetch test set memberships for all returned questions
    const questionIds = allQuestions.map((q) => q.id);
    let membershipMap: Record<number, { id: number; name: string; sectionId: string }[]> = {};
    if (questionIds.length > 0) {
      const memberships = await db
        .select({
          questionId: testSetQuestions.questionId,
          setId: testSets.id,
          setName: testSets.name,
          sectionId: testSets.sectionId,
        })
        .from(testSetQuestions)
        .innerJoin(testSets, eq(testSetQuestions.testSetId, testSets.id))
        .where(inArray(testSetQuestions.questionId, questionIds));
      membershipMap = memberships.reduce(
        (acc, m) => {
          if (!acc[m.questionId]) acc[m.questionId] = [];
          acc[m.questionId].push({ id: m.setId, name: m.setName, sectionId: m.sectionId });
          return acc;
        },
        {} as Record<number, { id: number; name: string; sectionId: string }[]>
      );
    }

    const questionsWithSets = allQuestions.map((q) => ({
      ...q,
      testSets: membershipMap[q.id] || [],
    }));

    return NextResponse.json(questionsWithSets);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const body = await request.json();
    const { testTypeId, questionText, optionA, optionB, optionC, optionD, correctAnswer, explanation, difficulty, cefrLevel, orderIndex, conversation, article, audioUrl, transcript } = body;

    if (!testTypeId || !questionText || !difficulty || !cefrLevel) {
      return NextResponse.json({ error: 'Missing required fields: testTypeId, questionText, difficulty, cefrLevel are required' }, { status: 400 });
    }

    const isFormMeaning = testTypeId === 'form-meaning';
    const isMcq = !isFormMeaning;

    if (isMcq && (!optionA || !optionB || !optionC || !correctAnswer)) {
      return NextResponse.json({ error: 'Missing required fields: optionA, optionB, optionC, correctAnswer are required for MCQ questions' }, { status: 400 });
    }

    if (isFormMeaning && (!article?.title || !article?.text)) {
      return NextResponse.json({ error: 'Missing required fields: article.title and article.text are required for form-meaning questions' }, { status: 400 });
    }

    // ── Duplicate check ───────────────────────────────────────────────
    const [duplicate] = await db
      .select({ id: questions.id, questionText: questions.questionText })
      .from(questions)
      .where(
        and(
          eq(questions.testTypeId, testTypeId),
          sql`LOWER(TRIM(${questions.questionText})) = LOWER(TRIM(${questionText}))`
        )
      )
      .limit(1);

    if (duplicate) {
      return NextResponse.json(
        {
          error: 'DUPLICATE_QUESTION',
          message: 'พบข้อสอบที่มีเนื้อหาเหมือนกันในระบบแล้ว',
          existingId: duplicate.id,
        },
        { status: 409 }
      );
    }

    const [newQuestion] = await db.insert(questions).values({
      testTypeId,
      questionText,
      optionA: optionA || null,
      optionB: optionB || null,
      optionC: optionC || null,
      optionD: optionD || null,
      correctAnswer: correctAnswer || null,
      explanation: explanation || null,
      difficulty,
      cefrLevel,
      orderIndex: orderIndex || 0,
      active: 'true',
      ...(conversation ? { conversation } : {}),
      ...(article ? { article } : {}),
      ...(audioUrl ? { audioUrl } : {}),
      ...(transcript ? { transcript } : {}),
    }).returning();

    return NextResponse.json(newQuestion, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}
