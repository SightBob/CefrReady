import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { questions, testSetQuestions, testSets } from '@/db/schema';
import { checkUserRateLimit, validateOrigin } from '@/lib/api-security';
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
  reason: z.string().trim().min(1).max(MAX_TAP_REASON_LENGTH),
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
    return NextResponse.json({ success: false, error: `กรุณาเลือกคำตอบและเขียนเหตุผลไม่เกิน ${MAX_TAP_REASON_LENGTH} ตัวอักษร` }, { status: 400 });
  }
  try {
    const { testSetId, questionId, itemIndex, selectedAnswer, reason } = parsed.data;
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
    const item = row?.tapExercise?.items[itemIndex];
    if (!item || (item.correct !== 0 && item.correct !== 1)) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อย่อย Tap & Select' }, { status: 404 });
    }
    const isCorrect = selectedAnswer === (item.correct === 0 ? 'A' : 'B');
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
      item, selectedAnswer, reason, explanation: row.explanation, grammarTopic: row.grammarTopic,
    }, usage => logTapUsage(usage));
    return NextResponse.json({ success: true, data: { isCorrect, ai } });
  } catch (error) {
    if (error instanceof TapAiError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, error: 'โหลดการตั้งค่าหรือตรวจเหตุผลไม่สำเร็จ กรุณาลองอีกครั้ง' }, { status: 503 });
  }
}
