import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { aiTutorMessages } from '@/db/schema';

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

/** เธรดของข้อนั้น (ไม่รวมที่ถูกเก็บถัง) */
export async function getThreadMessages(params: {
  userId: string;
  questionId: number;
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
    ))
    .orderBy(asc(aiTutorMessages.createdAt), asc(aiTutorMessages.id));

  return rows as ThreadMessage[];
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
}): Promise<void> {
  await db
    .update(aiTutorMessages)
    .set({
      status: 'ok',
      latencyMs: params.latencyMs,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      model: params.model,
    })
    .where(eq(aiTutorMessages.id, params.messageId));
}

/** ล้มเหลวก่อนมีเนื้อหา → คืนโควตา (failed ไม่ถูกนับ) */
export async function markUserMessageFailed(params: { messageId: number }): Promise<void> {
  await db
    .update(aiTutorMessages)
    .set({ status: 'failed' })
    .where(eq(aiTutorMessages.id, params.messageId));
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
}): Promise<number> {
  const [row] = await db
    .insert(aiTutorMessages)
    .values({
      userId: params.userId,
      questionId: params.questionId,
      role: 'assistant',
      content: params.content,
      status: 'ok',
      latencyMs: params.latencyMs,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      model: params.model,
    })
    .returning({ id: aiTutorMessages.id });
  return row?.id ?? 0;
}

/** ปุ่ม reset — เก็บถังข้อความเดิมของข้อนั้น (ไม่ลบ และไม่คืนโควตา) */
export async function archiveThread(params: {
  userId: string;
  questionId: number;
}): Promise<number> {
  const archived = await db
    .update(aiTutorMessages)
    .set({ archived: true })
    .where(and(
      eq(aiTutorMessages.userId, params.userId),
      eq(aiTutorMessages.questionId, params.questionId),
      eq(aiTutorMessages.archived, false),
    ))
    .returning({ id: aiTutorMessages.id });
  return archived.length;
}
