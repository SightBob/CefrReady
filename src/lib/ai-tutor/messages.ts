import { and, desc, eq, isNull } from 'drizzle-orm';

import { db } from '@/db';
import { aiTutorFeedback, aiTutorMessages } from '@/db/schema';

import type { ChatMessage } from './provider';
import { AI_TUTOR_SYSTEM_PROMPT, buildQuestionContextBlock, wrapLearnerMessage, type AiTutorQuestionContext } from './prompt';

export type ThreadMessage = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  status: 'ok' | 'failed' | 'pending';
  createdAt: Date;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  model: string | null;
};

/** จำนวนข้อความสูงสุดที่คืนให้ client (เอาของใหม่สุด 100 ข้อความ) */
export const THREAD_MESSAGE_LIMIT = 100;

/**
 * เธรดของข้อนั้นในรอบการทำข้อสอบนี้ (ไม่รวมที่ถูกเก็บถัง)
 *
 * ผูกกับ attemptKey: รอบใหม่ (ทำซ้ำ/ส่งแล้วเริ่มใหม่) จะไม่เห็นบทสนทนาของรอบก่อน
 * แถวที่ attempt_key เป็น null (ข้อมูลเก่าก่อนมีรอบ) จะไม่แสดงในเธรด
 *
 * attemptKey **ต้องส่งมาเสมอ** (บังคับที่ระดับ type) — ถ้าลืมส่งแล้วไปกรองด้วย
 * `IS NULL` จะเผยแถวเก่าที่ไม่ผูกกับรอบเข้ามาในประวัติของโมเดลโดยไม่ตั้งใจ
 */
export async function getThreadMessages(params: {
  userId: string;
  questionId: number;
  attemptKey: string;
}): Promise<ThreadMessage[]> {
  const rows = await db
    .select({
      id: aiTutorMessages.id,
      role: aiTutorMessages.role,
      content: aiTutorMessages.content,
      status: aiTutorMessages.status,
      createdAt: aiTutorMessages.createdAt,
      latencyMs: aiTutorMessages.latencyMs,
      inputTokens: aiTutorMessages.inputTokens,
      outputTokens: aiTutorMessages.outputTokens,
      model: aiTutorMessages.model,
    })
    .from(aiTutorMessages)
    .where(and(
      eq(aiTutorMessages.userId, params.userId),
      eq(aiTutorMessages.questionId, params.questionId),
      eq(aiTutorMessages.archived, false),
      // รอบของผู้เรียนเท่านั้น — แถว attempt_key IS NULL (ข้อมูลเก่า) ไม่เข้ามา
      eq(aiTutorMessages.attemptKey, params.attemptKey),
    ))
    // เอาของใหม่สุด N ข้อความ (แล้วกลับลำดับให้เป็นเก่า→ใหม่อีกครั้งด้านล่าง)
    .orderBy(desc(aiTutorMessages.createdAt), desc(aiTutorMessages.id))
    .limit(THREAD_MESSAGE_LIMIT);

  return (rows as ThreadMessage[]).slice().reverse();
}

/**
 * สร้าง history สำหรับส่งให้โมเดล — มาจาก DB เท่านั้น ห้ามเชื่อ client
 *
 * โครงสร้าง: [system] → [ผู้ใช้: context ของข้อ] → [ผู้ช่วย: คำอธิบายเดิมจาก DB]
 * → [บทสนทนาที่บันทึกไว้ของ (user, question) ที่ยังไม่ archived] → [ผู้ใช้: คำถามใหม่]
 *
 * เทิร์นแรก (คำอธิบายเดิม) ดึงสดจาก questions.explanation ทุกครั้ง ไม่เก็บลงตาราง
 */
export function buildProviderMessages(params: {
  context: AiTutorQuestionContext;
  thread: ThreadMessage[];
  learnerMessage: string;
}): ChatMessage[] {
  const messages: ChatMessage[] = [
    { role: 'system', content: AI_TUTOR_SYSTEM_PROMPT },
    { role: 'user', content: buildQuestionContextBlock(params.context) },
  ];

  // เทิร์นแรก = คำอธิบายเดิมจาก DB (แสดงในแชทอยู่แล้ว จึงไม่ต้องเก็บซ้ำ)
  if (params.context.explanation) {
    messages.push({ role: 'assistant', content: params.context.explanation });
  }

  for (const message of params.thread) {
    if (message.status === 'failed') continue;
    if (message.role === 'user') {
      messages.push({ role: 'user', content: wrapLearnerMessage(message.content) });
    } else {
      messages.push({ role: 'assistant', content: message.content });
    }
  }

  messages.push({ role: 'user', content: wrapLearnerMessage(params.learnerMessage) });
  return messages;
}

/** ปิดแถวของผู้เรียน (จองโควตาไว้) เมื่อเรียกโมเดลสำเร็จ */
export async function markUserMessageOk(params: {
  messageId: number;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  model: string;
  /** คำตอบที่ผู้เรียนเลือก (จาก proof) + ผลถูก/ผิด (เทียบกับเฉลยใน DB) */
  selectedAnswer?: string | null;
  isCorrect?: boolean | null;
}): Promise<void> {
  await db
    .update(aiTutorMessages)
    .set({
      status: 'ok',
      latencyMs: params.latencyMs,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      model: params.model,
      ...(params.selectedAnswer !== undefined ? { selectedAnswer: params.selectedAnswer } : {}),
      ...(params.isCorrect !== undefined ? { isCorrect: params.isCorrect } : {}),
    })
    .where(eq(aiTutorMessages.id, params.messageId));
}

/** ล้มเหลวก่อนมีเนื้อหา → คืนโควตา (failed ไม่ถูกนับ) */
export async function markUserMessageFailed(params: {
  messageId: number;
  selectedAnswer?: string | null;
  isCorrect?: boolean | null;
}): Promise<void> {
  await db
    .update(aiTutorMessages)
    .set({
      status: 'failed',
      ...(params.selectedAnswer !== undefined ? { selectedAnswer: params.selectedAnswer } : {}),
      ...(params.isCorrect !== undefined ? { isCorrect: params.isCorrect } : {}),
    })
    .where(eq(aiTutorMessages.id, params.messageId));
}

/**
 * ค่าที่ใช้ insert ลงตาราง ai_tutor_messages
 *
 * ⚠️ `questionId` **ต้องเป็น number เสมอ** (ไม่ใช่ null)
 *   หลัง migration 0050 คอลัมน์ในฐานเป็น nullable (ลบข้อสอบแล้วค่าเป็น NULL) → ถ้าใคร
 *   insert โดยไม่ใส่ค่า จะได้แถวที่ "ไม่ผูกกับข้อสอบ" ตั้งแต่ตอนเขียน (ไม่ใช่เพราะข้อสอบถูกลบ)
 *   → ตัวช่วย insert นี้เป็นจุดเดียวที่บังคับ (type + runtime assert)
 */
export type AiTutorMessageInsert = {
  userId: string;
  questionId: number;
  role: 'user' | 'assistant';
  content: string;
  status: 'pending' | 'ok' | 'failed';
  createdAt?: Date;
  attemptKey?: string | null;
  selectedAnswer?: string | null;
  isCorrect?: boolean | null;
  latencyMs?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  model?: string | null;
  fallbackUsed?: boolean | null;
  finishReason?: string | null;
};

/** ข้อความ error ตอนใส่ questionId ผิด (ไม่มีค่า PII) */
export const AI_TUTOR_QUESTION_ID_REQUIRED_MESSAGE =
  'ai_tutor_messages: ต้องระบุ questionId เป็นเลขข้อสอบเสมอ (ห้ามเป็น null)';

/**
 * insert ข้อความลง ai_tutor_messages — จุดเดียวที่ทุกข้อความต้องผ่าน
 *
 * - บังคับ questionId เป็นเลข (runtime assert) → ไม่มีแถว NULL โดยบังเอิญ
 * - คืน id ของแถวที่เพิ่งเขียน
 */
export async function insertAiTutorMessage(
  values: AiTutorMessageInsert,
  executor: Pick<typeof db, 'insert'> = db,
): Promise<number> {
  if (!Number.isInteger(values.questionId) || values.questionId <= 0) {
    throw new Error(AI_TUTOR_QUESTION_ID_REQUIRED_MESSAGE);
  }
  const [row] = await executor
    .insert(aiTutorMessages)
    .values({
      userId: values.userId,
      questionId: values.questionId,
      role: values.role,
      content: values.content,
      status: values.status,
      createdAt: values.createdAt,
      attemptKey: values.attemptKey ?? null,
      selectedAnswer: values.selectedAnswer ?? null,
      isCorrect: values.isCorrect ?? null,
      latencyMs: values.latencyMs ?? null,
      inputTokens: values.inputTokens ?? null,
      outputTokens: values.outputTokens ?? null,
      model: values.model ?? null,
      fallbackUsed: values.fallbackUsed ?? null,
      finishReason: values.finishReason ?? null,
    })
    .returning({ id: aiTutorMessages.id });
  return row?.id ?? 0;
}

/** บันทึกคำตอบของโมเดล */
export async function insertAssistantMessage(params: {
  userId: string;
  questionId: number;
  content: string;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  model: string;
  /** สลับไปใช้โมเดลสำรองหรือไม่ (วัดอัตราสลับ) */
  fallbackUsed?: boolean | null;
  /** finish_reason ของโมเดล (stop / length …) */
  finishReason?: string | null;
  /** รหัสรอบการทำข้อสอบ (แยกบทสนทนาต่อรอบ) */
  attemptKey?: string | null;
}): Promise<number> {
  return insertAiTutorMessage({
    userId: params.userId,
    questionId: params.questionId,
    role: 'assistant',
    content: params.content,
    status: 'ok',
    latencyMs: params.latencyMs,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    model: params.model,
    fallbackUsed: params.fallbackUsed ?? null,
    finishReason: params.finishReason ?? null,
    attemptKey: params.attemptKey ?? null,
  });
}

/** feedback ของผู้เรียนต่อข้อความในเธรด (ไว้แสดงสถานะปุ่ม 👍/👎) */
export async function getThreadFeedback(params: {
  userId: string;
  questionId: number;
}): Promise<Record<number, 'up' | 'down'>> {
  const rows = await db
    .select({ messageId: aiTutorFeedback.messageId, value: aiTutorFeedback.value })
    .from(aiTutorFeedback)
    .innerJoin(
      aiTutorMessages,
      and(
        eq(aiTutorMessages.id, aiTutorFeedback.messageId),
        eq(aiTutorMessages.userId, params.userId),
        eq(aiTutorMessages.questionId, params.questionId),
      ),
    );

  const result: Record<number, 'up' | 'down'> = {};
  for (const row of rows) {
    if (row.value === 'up' || row.value === 'down') result[row.messageId] = row.value;
  }
  return result;
}

/**
 * ปุ่ม reset — เก็บถังข้อความของรอบนี้เท่านั้น (ไม่ลบ และไม่คืนโควตา)
 * attemptKey ต้องส่งมาเสมอ (type-level) → เก็บถังผิดรอบไม่ได้
 */
export async function archiveThread(params: {
  userId: string;
  questionId: number;
  attemptKey: string;
}): Promise<number> {
  const archived = await db
    .update(aiTutorMessages)
    .set({ archived: true })
    .where(and(
      eq(aiTutorMessages.userId, params.userId),
      eq(aiTutorMessages.questionId, params.questionId),
      eq(aiTutorMessages.archived, false),
      eq(aiTutorMessages.attemptKey, params.attemptKey),
    ))
    .returning({ id: aiTutorMessages.id });
  return archived.length;
}

/**
 * ปิดบทสนทนาทั้งรอบ (ทุกข้อที่ถามในรอบนั้น) — ใช้ตอน "ทำจบ/ออกจากการทำข้อสอบ"
 *
 * ต่างจาก archiveThread ตรงที่ครอบทุกข้อของรอบ (ไม่ใช่แค่ข้อเดียว) → ประวัติการคุย
 * ของรอบที่จบแล้วไม่ค้างเป็น "รอบที่ยังไม่จบ" และกลับมาทำชุดเดิมภายหลังจะได้แชทใหม่
 *
 * - เก็บถัง (archived) ไม่ลบ → ข้อมูลยังอยู่ใน DB เพื่อวิเคราะห์/ส่งออก CSV
 * - **ไม่คืนโควตา** (แถวที่เรียกโมเดลจริงยังถูกนับเหมือนเดิม)
 * - จำกัดขอบเขตด้วย userId เสมอ → ผู้เรียนปิดรอบของตัวเองเท่านั้น
 */
export async function archiveAttempt(params: {
  userId: string;
  attemptKey: string;
}): Promise<number> {
  const archived = await db
    .update(aiTutorMessages)
    .set({ archived: true })
    .where(and(
      eq(aiTutorMessages.userId, params.userId),
      eq(aiTutorMessages.archived, false),
      eq(aiTutorMessages.attemptKey, params.attemptKey),
    ))
    .returning({ id: aiTutorMessages.id });
  return archived.length;
}
