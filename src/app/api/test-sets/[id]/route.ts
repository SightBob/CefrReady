import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { testSets, testSetQuestions, questions, testTypes } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/test-sets/[id]
 * Auth-required endpoint: returns a test set with all its questions in order.
 * Used by the student test-taking page.
 */
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const setId = parseInt(params.id);
  if (isNaN(setId)) {
    return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
  }

  try {
    // Both queries depend only on setId. Drizzle starts them together when
    // Promise.all awaits the builders; authentication still runs before any I/O.
    const [[set], setQuestions] = await Promise.all([
      db
      .select({
        id: testSets.id,
        sectionId: testSets.sectionId,
        name: testSets.name,
        description: testSets.description,
        isActive: testSets.isActive,
        duration: testTypes.duration,
      })
      .from(testSets)
      .innerJoin(testTypes, eq(testTypes.id, testSets.sectionId))
      .where(eq(testSets.id, setId))
      .limit(1),
      db
      .select({
        orderIndex: testSetQuestions.orderIndex,
        id: questions.id,
        testTypeId: questions.testTypeId,
        questionText: questions.questionText,
        optionA: questions.optionA,
        optionB: questions.optionB,
        optionC: questions.optionC,
        optionD: questions.optionD,
        correctAnswer: questions.correctAnswer,
        explanation: questions.explanation,
        grammarTopic: questions.grammarTopic,
        conversation: questions.conversation,
        audioUrl: questions.audioUrl,
        transcript: questions.transcript,
        article: questions.article,
        tapExercise: questions.tapExercise,
        cefrLevel: questions.cefrLevel,
        difficulty: questions.difficulty,
      })
      .from(testSetQuestions)
      .innerJoin(questions, eq(questions.id, testSetQuestions.questionId))
      .where(eq(testSetQuestions.testSetId, setId))
      .orderBy(asc(testSetQuestions.orderIndex)),
    ]);

    if (!set || !set.isActive) {
      return NextResponse.json({ success: false, error: 'Test set not found' }, { status: 404 });
    }

    // PRODUCT DECISION (owner-approved): Tap & Select ใช้ flow
    // เลือกคำตอบ → เฉลยคำตอบ → พิมพ์เหตุผล → กดตรวจคำตอบ → เหตุผลจาก AI
    // จึงต้องส่ง item.correct มาพร้อม payload เพื่อให้หน้าเว็บขึ้นสีถูก/ผิดได้ทันทีโดยไม่รอ
    // เซิร์ฟเวอร์ (ไม่มี request เพิ่ม) — endpoint นี้ถูกส่ง correctAnswer/explanation
    // ของข้อปกติอยู่แล้ว จึงสอดคล้องกัน
    const publicQuestions = setQuestions;

    return NextResponse.json({
      success: true,
      data: {
        id: set.id,
        sectionId: set.sectionId,
        name: set.name,
        description: set.description,
        duration: set.duration,
        questions: publicQuestions,
      },
    });
  } catch (err) {
    console.error('[api/test-sets/id] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch test set' }, { status: 500 });
  }
}
