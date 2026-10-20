import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { questions, testSetQuestions, testSets } from '@/db/schema';
import { checkUserRateLimit, validateOrigin } from '@/lib/api-security';
import { canIssueAnswerProof, issueAnswerProof } from '@/lib/ai-tutor/proof';
import { localizedRateLimitError } from '@/lib/ai-tutor/errors';

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
  // article blank: id ของช่อง
  blankId: z.number().int().positive().optional(),
  selectedAnswer: z.string().trim().min(1).max(1500),
}).strict();

const normalize = (value: string) => value.trim().toLocaleLowerCase();

/**
 * ออก proof ให้ผู้เรียนที่ล็อกอินแล้ว (ยืนยันว่า "กดตรวจคำตอบแล้ว")
 *
 * สำคัญ: เส้นทางนี้ **ไม่อ่านตารางใหม่ของ AI Tutor เลย** (ไม่มี users.ai_tutor_access)
 * เงื่อนไขออก proof มีแค่ 2 ข้อที่มาจาก env:
 *   1. master switch เปิด (AI_TUTOR_ENABLED)
 *   2. มี AI_TUTOR_PROOF_SECRET
 * สิทธิ์ใช้งาน AI Tutor จริงตรวจซ้ำที่ /api/ai-tutor (และ feedback/reset) อยู่แล้ว
 * → ถ้า migration 0045 ยังไม่รัน หน้า "ตรวจคำตอบ" ยังทำงานปกติ
 *
 * ผู้เรียนทั่วไปได้ response เหมือนเดิมทุกประการ (ไม่มีฟิลด์ answerProof)
 * และไม่มีการเขียนลง DB ในเส้นทางนี้
 */
async function answerProofFields(
  userId: string,
  questionId: number,
  selectedAnswer: string,
): Promise<{ answerProof?: string }> {
  if (!canIssueAnswerProof()) return {};
  const proof = issueAnswerProof({ userId, questionId, selectedAnswer });
  return proof ? { answerProof: proof } : {};
}

/** 20/นาที กันยิงรัวในหนึ่งชุด + 600/วัน กันไล่เดาทีละข้อทั้งคลัง */
const MINUTE_LIMIT = { keySuffix: 'check-answer', maxRequests: 20 } as const;
const DAILY_LIMIT = {
  keySuffix: 'check-answer:day',
  maxRequests: 600,
  windowMs: 86_400_000,
} as const;

/** คงสถานะและ Retry-After จากระบบ rate limit เดิม แต่เปลี่ยนข้อความเป็นภาษาไทย */
function localizedLimitError(res: Response): Response {
  return localizedRateLimitError(res, 'ตรวจคำตอบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง');
}

export async function POST(request: NextRequest) {
  const originError = validateOrigin(request);
  if (originError) return originError;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนตรวจคำตอบ' }, { status: 401 });
  }
  // SECURITY: endpoint นี้คืนเฉลยจริงของข้อนั้น ๆ การจำกัดแค่รายนาทีเดียว
  // เปิดให้เดินไล่เฉลยทั้งคลังทีละข้อได้ จึงมีทั้งเพดานรายนาทีและรายวัน
  for (const limit of [MINUTE_LIMIT, DAILY_LIMIT]) {
    const limited = await checkUserRateLimit(session.user.id, limit);
    if (limited) return localizedLimitError(limited);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'คำขอตรวจคำตอบไม่ถูกต้อง' }, { status: 400 });
  }
  const { testSetId, questionId, blankId, selectedAnswer } = parsed.data;

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
        ...(await answerProofFields(session.user.id, questionId, selectedAnswer)),
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
      ...(await answerProofFields(session.user.id, questionId, selectedAnswer)),
    } });
  } catch {
    return NextResponse.json({ success: false, error: 'ตรวจคำตอบไม่สำเร็จ กรุณาลองอีกครั้ง' }, { status: 503 });
  }
}
