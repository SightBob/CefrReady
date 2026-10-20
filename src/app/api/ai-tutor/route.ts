import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { questions } from '@/db/schema';
import { auth } from '@/lib/auth';
import { isAiTutorEnabled } from '@/lib/ai-tutor';
import { verifyAnswerProof, AiTutorProofError } from '@/lib/ai-tutor/proof';
import { rateLimit } from '@/lib/rate-limit';
import { checkUserRateLimit, validateOrigin } from '@/lib/api-security';
import {
  buildProviderMessages,
  getThreadFeedback,
  getThreadMessages,
  insertAssistantMessage,
  markUserMessageFailed,
  markUserMessageOk,
} from '@/lib/ai-tutor/messages';
import {
  getQuotaSnapshot,
  questionQuotaLimit,
  reserveQuestion,
  systemDailyLimit,
  userDailyLimit,
} from '@/lib/ai-tutor/quota';
import { AiTutorProviderError, streamAiTutorReply } from '@/lib/ai-tutor/provider';
import { trimToLastCompleteSentence } from '@/lib/ai-tutor/trim';
import { buildQuestionContext, type AiTutorQuestionContext } from '@/lib/ai-tutor/prompt';
import {
  AI_TUTOR_CHAT_RATE_LIMIT_MESSAGE,
  AI_TUTOR_NO_ACCESS_MESSAGE,
  AI_TUTOR_UNAVAILABLE_MESSAGE,
  localizedRateLimitError,
  warnWithSummary,
} from '@/lib/ai-tutor/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * เวลาสูงสุดของฟังก์ชัน (วินาที) — ค่าคงที่เพราะ Next.js อ่านจาก **build output**
 * ด้วย static analysis ของ route module (ดูเอกสาร nextjs.org route-segment-config)
 * → ค่าที่คำนวณจาก env จะถูกตรึงตอน build และอาจไม่ตรงกับตอนรันจริง
 *
 * ค่านี้ต้องตรงกับ AI_TUTOR_ROUTE_MAX_DURATION_S ใน src/lib/ai-tutor/limits.ts
 * (มีเทสยืนยัน — แก้ค่าหนึ่งแล้วลืมอีกค่า = เทสต้องล้ม)
 * และเพดาน timeout ที่ตั้งได้คำนวณจากค่านี้ (หลัก + สำรอง + เผื่อ 15 วิ)
 */
export const maxDuration = 75;

const bodySchema = z.object({
  questionId: z.number().int().positive(),
  message: z.string().trim().min(1).max(500),
  /** proof จาก /api/tests/check-answer — ยืนยันว่าผู้เรียนตอบข้อนี้แล้ว */
  proof: z.string().trim().min(1).max(2000),
}).strict();

/**
 * จำกัดจำนวนคำถามต่อนาที (10/นาที/คน) — กันยิงรวดจนเผาโควตารายวันและเผาเงินค่าโมเดล
 * (เพดานรายวันอยู่ที่ reserveQuestion + Redis ต่อวัน)
 */
const CHAT_MINUTE_LIMIT = { keySuffix: 'ai-tutor:chat', maxRequests: 10 } as const;

function jsonError(status: number, error: string, extra: Record<string, unknown> = {}) {
  return Response.json({ success: false, error, ...extra }, { status });
}

function sse(event: Record<string, unknown>): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * GET /api/ai-tutor?questionId=123
 * คืนเธรด (ไม่ archived) + โควตาคงเหลือ เพื่อให้กลับมาเปิดข้อเดิมในวันเดียวกัน
 * แล้วเห็นบทสนทนาเดิม (ไม่ต้องใช้ proof — เป็นข้อมูลของผู้เรียนเอง)
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError(401, 'กรุณาเข้าสู่ระบบก่อนใช้งาน AI Tutor');
  }
  if (!(await isAiTutorEnabled({ id: session.user.id }))) {
    return jsonError(403, AI_TUTOR_NO_ACCESS_MESSAGE);
  }

  const questionId = Number(new URL(request.url).searchParams.get('questionId'));
  if (!Number.isInteger(questionId) || questionId <= 0) {
    return jsonError(400, 'ไม่พบข้อคำถาม');
  }

  try {
    const [thread, quota, feedback] = await Promise.all([
      getThreadMessages({ userId: session.user.id, questionId }),
      getQuotaSnapshot({ userId: session.user.id, questionId }),
      getThreadFeedback({ userId: session.user.id, questionId }),
    ]);

    return Response.json({
      success: true,
      messages: thread.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        status: message.status,
        createdAt: message.createdAt.toISOString(),
        feedback: feedback[message.id] ?? null,
      })),
      quota,
    });
  } catch (error) {
    // ฐานข้อมูลล่ม/ยังไม่ได้รัน migration → บอกผู้เรียนว่าชั่วคราวใช้ไม่ได้ (ไม่ใช่ 500)
    warnWithSummary('ai-tutor] โหลดเธรดไม่สำเร็จ', error);
    return jsonError(503, AI_TUTOR_UNAVAILABLE_MESSAGE);
  }
}

/**
 * POST /api/ai-tutor — ถาม AI เกี่ยวกับข้อที่ผู้เรียนเพิ่งตอบไป
 *
 * ขั้นตอน (ทั้งหมดฝั่ง server):
 * 1. ล็อกอิน + ผ่าน feature flag (isAiTutorEnabled)
 * 2. ตรวจ proof — ผู้เรียนต้องกด "ตรวจคำตอบ" ของข้อนี้มาแล้ว
 * 3. เพดานซ่อน (Redis) ต่อผู้เรียน/วัน และรวมทั้งระบบ/วัน (kill switch)
 * 4. จองโควตา (นับ + insert แถว pending) ในทรานแซกชันที่ล็อก advisory
 * 5. ดึงโจทย์/ตัวเลือก/เฉลย/คำอธิบายจาก DB + ประวัติจาก DB เอง (ห้ามเชื่อ client)
 * 6. เรียกโมเดลแบบ stream → ส่ง delta ให้ client ทีละก้อน
 */
export async function POST(request: Request) {
  const originError = validateOrigin(request);
  if (originError) return originError;

  const session = await auth();
  if (!session?.user?.id) {
    return jsonError(401, 'กรุณาเข้าสู่ระบบก่อนใช้งาน AI Tutor');
  }
  const userId = session.user.id;
  if (!(await isAiTutorEnabled({ id: userId }))) {
    return jsonError(403, AI_TUTOR_NO_ACCESS_MESSAGE);
  }

  // จำกัดต่อนาที (กันยิงรวดจนเผาโควตารายวัน/เงินค่าโมเดล) — ตัดก่อนแตะ DB
  const minuteLimited = await checkUserRateLimit(userId, CHAT_MINUTE_LIMIT);
  if (minuteLimited) {
    return localizedRateLimitError(minuteLimited, AI_TUTOR_CHAT_RATE_LIMIT_MESSAGE);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path?.join('.') ?? '';
    const error = path.includes('message')
      ? 'คำถามยาวเกิน 500 ตัวอักษร'
      : path.includes('proof')
        ? 'ยังไม่ได้กด "ตรวจคำตอบ" ของข้อนี้ — กรุณากดตรวจคำตอบก่อนถาม AI'
        : 'คำขอไม่ถูกต้อง';
    return jsonError(400, error);
  }
  const { questionId, message, proof } = parsed.data;

  let selectedAnswer = '';
  try {
    // คำตอบที่ผู้เรียนเลือกมาจาก proof ที่ลงชื่อไว้ฝั่ง server (ไม่รับจาก client โดยตรง)
    selectedAnswer = verifyAnswerProof({ proof, userId, questionId }).selectedAnswer;
  } catch (error) {
    if (error instanceof AiTutorProofError) {
      return jsonError(403, error.message);
    }
    return jsonError(403, 'ยังไม่ได้ตั้งค่า AI Tutor (AI_TUTOR_PROOF_SECRET)');
  }

  // ─── เพดานซ่อน: ต่อผู้เรียน/วัน + รวมทั้งระบบ/วัน (kill switch) ───
  const userCap = userDailyLimit();
  const userLimit = await rateLimit(`user:${userId}:ai-tutor:day`, {
    windowMs: 86_400_000,
    maxRequests: userCap,
  });
  if (userLimit.limited) {
    return jsonError(429, 'คุณถาม AI วันนี้ครบโควตาทั้งหมดแล้ว ลองใช้คำถามพรุ่งนี้', {
      quota: { used: userCap, limit: userCap, remaining: 0 },
    });
  }
  const systemCap = systemDailyLimit();
  if (systemCap > 0) {
    const systemLimit = await rateLimit('system:ai-tutor:day', {
      windowMs: 86_400_000,
      maxRequests: systemCap,
    });
    if (systemLimit.limited) {
      return jsonError(429, 'ขณะนี้ระบบถาม AI ได้เต็มโควตาของวันนี้แล้ว กรุณาลองใหม่พรุ่งนี้');
    }
  }

  // ─── โจทย์/เฉลย/คำอธิบาย + จองโควตา + ประวัติ: คิวรี DB ───
  // ครอบ try/catch: ถ้าฐานข้อมูลล่มหรือยังไม่ได้รัน migration → 503 ที่ผู้เรียนอ่านรู้เรื่อง
  // (ไม่ใช่ 500 ที่หน้าเว็บไม่รู้จะโชว์อะไร)
  let isCorrect: boolean | null = null;
  let reservation: Awaited<ReturnType<typeof reserveQuestion>>;
  let providerMessages: ReturnType<typeof buildProviderMessages>;

  try {
    const rows = await db
      .select({
        questionText: questions.questionText,
        optionA: questions.optionA,
        optionB: questions.optionB,
        optionC: questions.optionC,
        optionD: questions.optionD,
        correctAnswer: questions.correctAnswer,
        explanation: questions.explanation,
        grammarTopic: questions.grammarTopic,
        cefrLevel: questions.cefrLevel,
      })
      .from(questions)
      .where(and(eq(questions.id, questionId), eq(questions.active, 'true')))
      .limit(1);
    const row = rows[0];

    if (!row) {
      return jsonError(404, 'ไม่พบข้อคำถาม');
    }

    const context = buildQuestionContext(row);

    // ผู้เรียนตอบถูกไหม — เทียบคำตอบใน proof กับเฉลยที่ดึงจาก DB (ฝั่ง server ทั้งหมด)
    isCorrect = context.correctAnswerText
      ? selectedAnswer.trim().toLocaleLowerCase() === context.correctAnswerText.trim().toLocaleLowerCase()
      : null;

    // ─── จองโควตา (กัน race) ───
    reservation = await reserveQuestion({ userId, questionId, message });
    if (!reservation.ok) {
      return jsonError(429, `โควตาคำถามของข้อนี้หมดแล้ว (${reservation.quota.used}/${reservation.quota.limit} ครั้งต่อวัน)`, {
        quota: reservation.quota,
      });
    }

    // ─── ประวัติจาก DB เอง (ห้ามเชื่อ client) ───
    const thread = await getThreadMessages({ userId, questionId });
    providerMessages = buildProviderMessages({ context, thread, learnerMessage: message });
  } catch (error) {
    warnWithSummary('ai-tutor] เตรียมคำถามไม่สำเร็จ', error);
    return jsonError(503, AI_TUTOR_UNAVAILABLE_MESSAGE);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sse(event)));
      };

      let answer = '';
      try {
        const result = await streamAiTutorReply({
          messages: providerMessages,
          cacheBoundaryIndex: 1,
          signal: request.signal,
          onDelta: (text) => {
            answer += text;
            send({ type: 'delta', text });
          },
        });

        // โมเดลตอบจบแต่ถูกตัด (finish_reason = length) → ตัดที่ประโยคสมบูรณ์สุดท้าย
        // แล้วใช้ฉบับที่ตัดแล้วทั้งใน DB และส่งกลับให้ client (ต้องเป็นฉบับเดียวกัน)
        let finalText = result.text;
        if (result.finishReason === 'length') {
          const trimmed = trimToLastCompleteSentence(result.text);
          finalText = trimmed.text;
          console.warn('[ai-tutor] คำตอบถูกตัด (finish_reason = length)', JSON.stringify({
            questionId,
            model: result.usage.model,
            outputTokens: result.usage.outputTokens,
            reasoningTokens: result.usage.reasoningTokens,
            trimmed: trimmed.trimmed,
            cutReason: trimmed.cutReason,
            removedChars: trimmed.removed.length,
          }));
        }

        await markUserMessageOk({
          messageId: reservation.messageId,
          latencyMs: result.usage.latencyMs,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          model: result.usage.model,
          selectedAnswer,
          isCorrect,
        });
        const assistantId = await insertAssistantMessage({
          userId,
          questionId,
          content: finalText,
          latencyMs: result.usage.latencyMs,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          model: result.usage.model,
          fallbackUsed: result.fallbackUsed,
          finishReason: result.finishReason,
        });

        const quota = await getQuotaSnapshot({ userId, questionId });
        send({
          type: 'done',
          messageId: assistantId,
          quota,
          /** ข้อความฉบับสุดท้าย (อาจถูกตัด) — client ต้องแสดงฉบับนี้ให้ตรงกับ DB */
          text: finalText,
          usage: {
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
            reasoningTokens: result.usage.reasoningTokens,
            model: result.usage.model,
            latencyMs: result.usage.latencyMs,
            ttftMs: result.ttftMs,
            finishReason: result.finishReason,
            fallbackUsed: result.fallbackUsed,
          },
        });
      } catch (error) {
        const errorMessage = error instanceof AiTutorProviderError
          ? error.message
          : 'AI ตอบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
        // ล้มเหลวก่อนมีเนื้อหา → คืนโควตา (failed ไม่ถูกนับ)
        if (!answer) {
          await markUserMessageFailed({ messageId: reservation.messageId, selectedAnswer, isCorrect });
        } else {
          await markUserMessageOk({
            messageId: reservation.messageId,
            latencyMs: 0,
            inputTokens: null,
            outputTokens: null,
            model: 'unknown',
            selectedAnswer,
            isCorrect,
          });
        }
        send({ type: 'error', error: errorMessage, canRetry: true });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
