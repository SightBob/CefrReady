import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { questions, testSetQuestions, testSets } from '@/db/schema';
import { checkUserRateLimit, validateOrigin } from '@/lib/api-security';
import { isAdminRequest } from '@/lib/admin-auth';
import { isTapExerciseVisibleToLearners } from '@/lib/tap-visibility';
import { MAX_TAP_REASON_LENGTH } from '@/lib/tap-ai';
import { getTapAiSettings } from '@/lib/tap-ai-settings';
import { evaluateTapReason, TapAiError } from '@/lib/openrouter';
import { AI_FEATURE_TAP_REASON, logAiUsage } from '@/lib/ai-usage';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const bodySchema = z.object({
  testSetId: z.number().int().positive(),
  questionId: z.number().int().positive(),
  itemIndex: z.number().int().nonnegative(),
  selectedAnswer: z.enum(['A', 'B']),
  // ข้อความตัวเลือกที่ผู้เรียนเห็นแล้วกด — ตัวเลือกถูกสลับด้วย seed ฝั่งเบราว์เซอร์
  // ป้าย A/B บนจอจึงไม่จำเป็นต้องตรงกับป้ายในฐานข้อมูล AI จึงต้องอ้างอิงด้วยข้อความ
  // (ไม่บังคับ: client เก่าไม่ส่งมา — เดาจาก selectedAnswer ซึ่งเป็นป้ายต้นฉบับแทน)
  selectedText: z.string().trim().min(1).max(1000).optional(),
  // เหตุผลของผู้เรียน — ว่างได้: ผู้เรียนกด “ตรวจคำตอบ” ทั้งที่ยังไม่ได้พิมพ์ เซิร์ฟเวอร์จะ prefill
  // วลีสำเร็จรูปให้ AI ช่วยอธิบายข้อนี้ตามปกติ (ไม่เรียกว่าเหตุผลของผู้เรียนเอง)
  reason: z.string().trim().max(MAX_TAP_REASON_LENGTH),
}).strict();

export async function POST(request: NextRequest) {
  const originError = validateOrigin(request);
  if (originError) return originError;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนตรวจคำตอบ' }, { status: 401 });
  }
  const rateLimitError = await checkUserRateLimit(session.user.id, {
    keySuffix: 'tap-reason-ai', maxRequests: 6,
  });
  if (rateLimitError) return rateLimitError;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: `กรุณาเลือกคำตอบก่อน (เหตุผลไม่เกิน ${MAX_TAP_REASON_LENGTH} ตัวอักษร)` }, { status: 400 });
  }
  try {
    const { testSetId, questionId, itemIndex, selectedAnswer, selectedText: submittedText, reason: submittedReason } = parsed.data;
    const [row] = await db
      .select({ tapExercise: questions.tapExercise, explanation: questions.explanation, grammarTopic: questions.grammarTopic })
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
    // CONTENT STATUS: กิจกรรมที่ยังไม่เผยแพร่ให้ผู้เรียนตรวจไม่ได้ — แอดมินทำได้เพื่อตรวจในโหมดพรีวิว
    if (row?.tapExercise && !isTapExerciseVisibleToLearners(row.tapExercise) && !(await isAdminRequest())) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อย่อย Tap & Select' }, { status: 404 });
    }
    const item = row?.tapExercise?.items[itemIndex];
    if (!item || (item.correct !== 0 && item.correct !== 1)) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อย่อย Tap & Select' }, { status: 404 });
    }
    const isCorrect = selectedAnswer === (item.correct === 0 ? 'A' : 'B');
    // ข้อความของตัวเลือกที่ผู้เรียนกด — ได้จากป้ายบนจอ (อาจสลับตำแหน่งกับฐานข้อมูล)
    // ต้องตรงกับป้ายต้นฉบับเสมอ ไม่งั้นแปลว่าข้อมูลไม่ตรงกับข้อนี้ที่เซิร์ฟเวอร์อ่าน
    const selectedText = (selectedAnswer === 'A' ? item.choiceA : item.choiceB).trim();
    if (submittedText !== undefined && submittedText !== selectedText) {
      return NextResponse.json({ success: false, error: 'เนื้อหาข้อนี้เปลี่ยนไปแล้ว กรุณารีเฟรชหน้าแล้วตรวจคำตอบอีกครั้ง' }, { status: 409 });
    }
    // เหตุผลว่าง = ผู้เรียนกดตรวจโดยไม่พิมพ์ — prefill วลีสำเร็จรูปให้ AI อธิบายข้อนี้ตามปกติ
    // (ไม่ตัดสินเหตุผลของผู้เรียน เพราะไม่มีเหตุผลส่งมา)
    const reason = submittedReason || 'ผู้เรียนยังไม่ได้เขียนเหตุผล กรุณาอธิบายเฉลยของข้อนี้ให้เข้าใจ';
    const settings = await getTapAiSettings();
    if (!settings.enabled) {
      return NextResponse.json({ success: true, data: {
        isCorrect, ai: null, message: 'ผู้ดูแลยังไม่ได้เปิด AI ตรวจเหตุผล แสดงผลตัวเลือกเท่านั้น',
      } });
    }
    const startedAt = Date.now();
    const logTapUsage = (usage: Parameters<NonNullable<Parameters<typeof evaluateTapReason>[2]>>[0]) => {
      if (!usage) return;
      void logAiUsage({
        userId: session.user.id,
        feature: AI_FEATURE_TAP_REASON,
        model: usage.model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        status: 'ok',
        latencyMs: usage.latencyMs,
      });
    };
    const ai = await evaluateTapReason(settings, {
      title: row.tapExercise!.title, hint: row.tapExercise!.hint,
      item, selectedAnswer, selectedText, reason, explanation: row.explanation, grammarTopic: row.grammarTopic,
    }, usage => logTapUsage(usage));
    return NextResponse.json({ success: true, data: { isCorrect, ai } });
  } catch (error) {
    if (error instanceof TapAiError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, error: 'โหลดการตั้งค่าหรือตรวจเหตุผลไม่สำเร็จ กรุณาลองอีกครั้ง' }, { status: 503 });
  }
}
