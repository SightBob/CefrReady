import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { questions, testSetQuestions, testSets } from '@/db/schema';
import { checkUserRateLimit, validateOrigin } from '@/lib/api-security';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tests/check-answer
 *
 * เฉลยหนึ่งข้อ เรียกครั้งเดียวตอนผู้เรียนกด "ตรวจคำตอบ" — payload ของชุดข้อสอบ
 * ไม่มีเฉลยติดไปด้วยแล้ว (ดู /api/test-sets/[id]) เฉลยจึงมาจากที่นี่ทางเดียว
 *
 * คืนป้ายเฉลยแบบ **ต้นฉบับ** (A/B/C/D ตามที่เก็บในฐานข้อมูล) เพราะหน้าเว็บสลับตัวเลือก
 * ด้วย seed ฝั่งผู้เรียน เซิร์ฟเวอร์จึงคำนวณป้ายที่ "ผู้เรียนเห็น" ไม่ได้
 * ฝั่ง client ต้องแปลงกลับด้วย answerKeys ของตัวเอง
 */
const bodySchema = z.object({
  testSetId: z.number().int().positive(),
  questionId: z.number().int().positive(),
  // Tap & Select: เลขข้อย่อยในกิจกรรม · article blank: id ของช่อง
  itemIndex: z.number().int().nonnegative().optional(),
  blankId: z.number().int().positive().optional(),
  selectedAnswer: z.string().trim().min(1).max(1500),
}).strict();

const normalize = (value: string) => value.trim().toLocaleLowerCase();

export async function POST(request: NextRequest) {
  const originError = validateOrigin(request);
  if (originError) return originError;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนตรวจคำตอบ' }, { status: 401 });
  }
  // ไม่จำกัดเข้มเหมือน AI (เรียกทุกข้อ) แต่ก็ไม่ปล่อยไว้ยิงรัว
  const rateLimitError = await checkUserRateLimit(session.user.id, {
    keySuffix: 'check-answer', maxRequests: 120,
  });
  if (rateLimitError) return rateLimitError;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'คำขอตรวจคำตอบไม่ถูกต้อง' }, { status: 400 });
  }
  const { testSetId, questionId, itemIndex, blankId, selectedAnswer } = parsed.data;

  try {
    const [row] = await db
      .select({
        correctAnswer: questions.correctAnswer,
        explanation: questions.explanation,
        tapExercise: questions.tapExercise,
        article: questions.article,
        active: questions.active,
      })
      .from(testSetQuestions)
      .innerJoin(questions, eq(questions.id, testSetQuestions.questionId))
      .innerJoin(testSets, eq(testSets.id, testSetQuestions.testSetId))
      .where(and(
        eq(testSetQuestions.testSetId, testSetId),
        eq(testSetQuestions.questionId, questionId),
        eq(testSets.isActive, true),
        eq(questions.active, 'true'),
      ))
      .limit(1);
    if (!row) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อคำถาม' }, { status: 404 });
    }

    // ─── Tap & Select: ข้อย่อยในกิจกรรม ────────────────────────────
    if (itemIndex !== undefined) {
      const item = row.tapExercise?.items[itemIndex];
      if (!item || (item.correct !== 0 && item.correct !== 1)) {
        return NextResponse.json({ success: false, error: 'ไม่พบข้อย่อย Tap & Select' }, { status: 404 });
      }
      const correctKey = item.correct === 0 ? 'A' : 'B';
      const correctText = item.correct === 0 ? item.choiceA : item.choiceB;
      return NextResponse.json({ success: true, data: {
        isCorrect: selectedAnswer === correctKey,
        correctKey,
        correctText,
        explanation: row.explanation ?? null,
      } });
    }

    // ─── ช่องกรอกคำในบทความ (form-meaning) ──────────────────────────
    if (blankId !== undefined) {
      const article = row.article as { blanks?: Array<{ id: number; correctAnswer: string }> } | null;
      const blank = article?.blanks?.find(entry => entry.id === blankId);
      if (!blank) {
        return NextResponse.json({ success: false, error: 'ไม่พบช่องคำตอบ' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: {
        isCorrect: normalize(selectedAnswer) === normalize(blank.correctAnswer),
        correctKey: null,
        correctText: blank.correctAnswer,
        explanation: row.explanation ?? null,
      } });
    }

    // ─── ข้อเลือก A–D ──────────────────────────────────────────────
    const correctAnswer = row.correctAnswer?.trim();
    if (!correctAnswer) {
      return NextResponse.json({ success: false, error: 'ข้อนี้ยังไม่ได้ตั้งเฉลย' }, { status: 409 });
    }
    return NextResponse.json({ success: true, data: {
      isCorrect: normalize(selectedAnswer) === normalize(correctAnswer),
      correctKey: correctAnswer,
      correctText: null,
      explanation: row.explanation ?? null,
    } });
  } catch {
    return NextResponse.json({ success: false, error: 'ตรวจคำตอบไม่สำเร็จ กรุณาลองอีกครั้ง' }, { status: 503 });
  }
}
