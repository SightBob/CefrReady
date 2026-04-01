import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, testTypes } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const testTypeId = searchParams.get('testTypeId');

    let allQuestions;
    
    if (testTypeId) {
      allQuestions = await db
        .select({
          id: questions.id,
          testTypeId: questions.testTypeId,
          sentence: questions.sentence,
          options: questions.options,
          correctAnswer: questions.correctAnswer,
          explanation: questions.explanation,
          difficulty: questions.difficulty,
          cefrLevel: questions.cefrLevel,
          isActive: questions.isActive,
          orderIndex: questions.orderIndex,
          createdAt: questions.createdAt,
          testType: {
            id: testTypes.id,
            title: testTypes.title,
            slug: testTypes.slug,
          },
        })
        .from(questions)
        .leftJoin(testTypes, eq(questions.testTypeId, testTypes.id))
        .where(eq(questions.testTypeId, parseInt(testTypeId)))
        .orderBy(desc(questions.createdAt));
    } else {
      allQuestions = await db
        .select({
          id: questions.id,
          testTypeId: questions.testTypeId,
          sentence: questions.sentence,
          options: questions.options,
          correctAnswer: questions.correctAnswer,
          explanation: questions.explanation,
          difficulty: questions.difficulty,
          cefrLevel: questions.cefrLevel,
          isActive: questions.isActive,
          orderIndex: questions.orderIndex,
          createdAt: questions.createdAt,
          testType: {
            id: testTypes.id,
            title: testTypes.title,
            slug: testTypes.slug,
          },
        })
        .from(questions)
        .leftJoin(testTypes, eq(questions.testTypeId, testTypes.id))
        .orderBy(desc(questions.createdAt));
    }

    return NextResponse.json(allQuestions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testTypeId, sentence, options, correctAnswer, explanation, difficulty, cefrLevel, orderIndex } = body;

    if (!testTypeId || !sentence || !options || correctAnswer === undefined || !explanation || !difficulty || !cefrLevel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [newQuestion] = await db.insert(questions).values({
      testTypeId,
      sentence,
      options,
      correctAnswer,
      explanation,
      difficulty,
      cefrLevel,
      orderIndex: orderIndex || 0,
      isActive: true,
    }).returning();

    return NextResponse.json(newQuestion, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}
