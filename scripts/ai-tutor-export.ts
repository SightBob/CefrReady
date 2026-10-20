import 'dotenv/config';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { eq, gte } from 'drizzle-orm';

import { db } from '../src/db';
import { aiTutorFeedback, aiTutorMessages, questions } from '../src/db/schema';
import { buildAiTutorCsv, type AiTutorExportRow } from '../src/lib/ai-tutor/export-csv';

/**
 * AI Tutor export — ออก CSV เพื่อนำไปวิเคราะห์ต่อ (อ่านอย่างเดียว)
 *
 * ความเป็นส่วนตัว: ไม่มีอีเมล/ชื่อ/รูปภาพออกไปเลย
 * user_id ถูก hash ด้วย salt จาก env (AI_TUTOR_EXPORT_SALT) → เทียบข้อมูลข้ามรอบได้
 * แต่ย้อนกลับหาเจ้าของไม่ได้ (เก็บ salt ไว้เป็นความลับ)
 *
 * ใช้:
 *   AI_TUTOR_EXPORT_SALT="..." npx tsx scripts/ai-tutor-export.ts [--days 30] [--out tmp/ai-tutor-export/วันนี้.csv]
 *   (ไฟล์ผลลัพธ์อยู่ใน tmp/ ซึ่งอยู่ใน .gitignore — ห้าม commit)
 */
function parseArgs(argv: string[]) {
  let days = Number.parseInt(process.env.AI_TUTOR_EXPORT_DAYS ?? '', 10);
  if (!Number.isFinite(days) || days <= 0) days = 30;
  let out: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--days' && argv[i + 1]) days = Number.parseInt(argv[i + 1], 10) || days;
    else if (argv[i].startsWith('--days=')) days = Number.parseInt(argv[i].split('=')[1], 10) || days;
    else if (argv[i] === '--out' && argv[i + 1]) { out = argv[i + 1]; i += 1; }
    else if (argv[i].startsWith('--out=')) out = argv[i].split('=')[1];
  }
  return { days, out };
}

async function main() {
  const salt = process.env.AI_TUTOR_EXPORT_SALT?.trim();
  if (!salt) {
    console.error('ยังไม่ได้ตั้ง AI_TUTOR_EXPORT_SALT (ใช้สำหรับ hash user_id) — ยกเลิกเพื่อความปลอดภัย');
    process.exit(1);
  }
  const { days, out } = parseArgs(process.argv.slice(2));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: aiTutorMessages.id,
      userId: aiTutorMessages.userId,
      questionId: aiTutorMessages.questionId,
      role: aiTutorMessages.role,
      content: aiTutorMessages.content,
      status: aiTutorMessages.status,
      selectedAnswer: aiTutorMessages.selectedAnswer,
      isCorrect: aiTutorMessages.isCorrect,
      category: aiTutorMessages.category,
      fallbackUsed: aiTutorMessages.fallbackUsed,
      finishReason: aiTutorMessages.finishReason,
      latencyMs: aiTutorMessages.latencyMs,
      inputTokens: aiTutorMessages.inputTokens,
      outputTokens: aiTutorMessages.outputTokens,
      model: aiTutorMessages.model,
      createdAt: aiTutorMessages.createdAt,
      grammarTopic: questions.grammarTopic,
      cefrLevel: questions.cefrLevel,
      questionText: questions.questionText,
    })
    .from(aiTutorMessages)
    .innerJoin(questions, eq(questions.id, aiTutorMessages.questionId))
    .where(gte(aiTutorMessages.createdAt, since))
    .orderBy(aiTutorMessages.createdAt);

  const feedbackRows = await db
    .select({ messageId: aiTutorFeedback.messageId, value: aiTutorFeedback.value })
    .from(aiTutorFeedback);
  const feedbackByMessage = new Map(feedbackRows.map((row) => [row.messageId, row.value]));

  const exportRows: AiTutorExportRow[] = rows.map((row) => ({
    ...row,
    feedback: feedbackByMessage.get(row.id) ?? null,
  }));
  const csv = buildAiTutorCsv(exportRows, salt);
  const lines = csv.split('\n');

  const outDir = join(process.cwd(), 'tmp', 'ai-tutor-export');
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const outPath = out ? join(process.cwd(), out) : join(outDir, `ai-tutor-${stamp}.csv`);
  writeFileSync(outPath, lines.join('\n'), 'utf8');

  console.log(`✅ export ${rows.length} แถว → ${outPath}`);
  console.log('   (user_id ถูก hash ด้วย salt · ไม่มีอีเมล/ชื่อในไฟล์)');
  process.exit(0);
}

void main();
