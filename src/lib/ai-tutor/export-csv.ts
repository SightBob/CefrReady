import { createHash } from 'node:crypto';

/**
 * สร้าง CSV สำหรับวิเคราะห์คำถามของผู้เรียน (ต่อยอดจาก scripts/ai-tutor-export.ts)
 *
 * ความเป็นส่วนตัว: ไม่มีอีเมล/ชื่อ/รูปภาพออกไปเลย
 * user_id ถูก hash ด้วย salt → เทียบข้อมูลข้ามรอบได้ แต่ย้อนกลับหาเจ้าของไม่ได้
 */
export type AiTutorExportRow = {
  id: number;
  userId: string;
  /** null เมื่อข้อสอบถูกลบไปแล้ว (migration 0050 → ON DELETE SET NULL) */
  questionId: number | null;
  role: string;
  content: string;
  status: string;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  category: string | null;
  fallbackUsed: boolean | null;
  finishReason: string | null;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  model: string | null;
  createdAt: Date;
  grammarTopic: string | null;
  cefrLevel: string | null;
  /** null เมื่อข้อสอบถูกลบไปแล้ว (migration 0050 → leftJoin) */
  questionText: string | null;
  feedback?: string | null;
  /** รหัสรอบการทำข้อสอบ (แยกบทสนทนาต่อรอบ — migration 0049) */
  attemptKey?: string | null;
};

/** hash user_id ด้วย salt (คนละคนได้ค่าเดิมทุกครั้ง คนละคนไม่ซ้ำ) */
export function hashUserId(userId: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${userId}`).digest('hex').slice(0, 16);
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const AI_TUTOR_EXPORT_HEADER = [
  'message_id', 'user_hash', 'question_id', 'attempt_key', 'grammar_topic', 'cefr_level', 'role', 'status',
  'selected_answer', 'is_correct', 'category', 'fallback_used', 'finish_reason',
  'latency_ms', 'input_tokens', 'output_tokens', 'model', 'feedback', 'created_at', 'content',
] as const;

export function buildAiTutorCsv(rows: AiTutorExportRow[], salt: string): string {
  const lines = [AI_TUTOR_EXPORT_HEADER.join(',')];
  for (const row of rows) {
    lines.push([
      row.id,
      hashUserId(row.userId, salt),
      row.questionId,
      row.attemptKey ?? '',
      row.grammarTopic,
      row.cefrLevel,
      row.role,
      row.status,
      row.selectedAnswer,
      row.isCorrect,
      row.category,
      row.fallbackUsed,
      row.finishReason,
      row.latencyMs,
      row.inputTokens,
      row.outputTokens,
      row.model,
      row.feedback ?? '',
      row.createdAt.toISOString(),
      row.content,
    ].map(csvCell).join(','));
  }
  return lines.join('\n');
}
