import 'dotenv/config';

import { and, eq, gte, sql } from 'drizzle-orm';

import { db } from '../src/db';
import { aiTutorFeedback, aiTutorMessages, questions, users } from '../src/db/schema';

/**
 * AI Tutor report — อ่านอย่างเดียว ไม่เขียนอะไรลง DB
 *
 * ใช้: npx tsx scripts/ai-tutor-report.ts [--days 30]
 *   --days N = ดูข้อมูลย้อนหลัง N วัน (ค่าเริ่มต้น 30)
 *
 * หมายเหตุ: รายงานนี้รวมตัวเลขของผู้เรียน แต่ไม่แสดงอีเมล/ชื่อ (ใช้ id เท่านั้น)
 */
type Args = { days: number };

function parseArgs(argv: string[]): Args {
  const days = Number.parseInt(process.env.AI_TUTOR_REPORT_DAYS ?? '', 10);
  let value = Number.isFinite(days) && days > 0 ? days : 30;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--days' && argv[i + 1]) value = Number.parseInt(argv[i + 1], 10) || value;
    else if (argv[i].startsWith('--days=')) value = Number.parseInt(argv[i].split('=')[1], 10) || value;
  }
  return { days: value };
}

function pct(part: number, total: number): string {
  if (!total) return '—';
  return `${((part / total) * 100).toFixed(1)}%`;
}

async function main() {
  const { days } = parseArgs(process.argv.slice(2));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  console.log(`\n=== รายงาน AI Tutor (${days} วันที่ผ่านมา) ===\n`);

  // ─── ผู้ใช้ที่มีสิทธิ์ ───
  const [granted] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  const grantedCount = granted?.count ?? 0;

  const askers = await db
    .select({ userId: aiTutorMessages.userId, asks: sql<number>`count(*)::int` })
    .from(aiTutorMessages)
    .where(and(eq(aiTutorMessages.role, 'user'), gte(aiTutorMessages.createdAt, since)))
    .groupBy(aiTutorMessages.userId);
  const askerCount = askers.length;
  const totalAsks = askers.reduce((sum, row) => sum + row.asks, 0);

  console.log('## ผู้เรียน');
  console.log(`- มีสิทธิ์ใช้ AI Tutor ทั้งหมด: ${grantedCount} คน`);
  console.log(`- ผู้ที่ถามอย่างน้อย 1 ครั้งใน ${days} วัน: ${askerCount} คน (${pct(askerCount, grantedCount)} ของผู้มีสิทธิ์)`);
  console.log(`- คำถามเฉลี่ยต่อคนที่ถาม: ${askerCount ? (totalAsks / askerCount).toFixed(2) : '0'} คำถาม`);
  console.log(`- คำถามรวม: ${totalAsks}`);

  // ─── โควตาหมด ───
  const quotaRows = await db.execute(sql`
    select count(*)::int as users_at_limit
    from (
      select user_id, question_id, count(*)::int as asks
      from ai_tutor_messages
      where role = 'user' and status in ('ok','pending') and created_at >= ${since}
      group by user_id, question_id
    ) t
    where t.asks >= 5
  `);
  const atLimit = (quotaRows.rows[0] as { users_at_limit: number } | undefined)?.users_at_limit ?? 0;
  console.log(`- คนที่โควตาของข้อนั้นหมด (≥5 ครั้ง): ${atLimit} คน-ข้อ`);

  // ─── หัวข้อที่ถามบ่อย ───
  const topics = await db
    .select({
      questionId: aiTutorMessages.questionId,
      grammarTopic: questions.grammarTopic,
      cefrLevel: questions.cefrLevel,
      questionText: questions.questionText,
      asks: sql<number>`count(*)::int`,
    })
    .from(aiTutorMessages)
    .innerJoin(questions, eq(questions.id, aiTutorMessages.questionId))
    .where(and(eq(aiTutorMessages.role, 'user'), gte(aiTutorMessages.createdAt, since)))
    .groupBy(aiTutorMessages.questionId, questions.grammarTopic, questions.cefrLevel, questions.questionText)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  console.log('\n## ข้อสอบ/หัวข้อที่ถูกถามบ่อยที่สุด');
  for (const row of topics) {
    console.log(`- ${row.asks} ครั้ง · id ${row.questionId} · ${row.grammarTopic ?? '-'} (${row.cefrLevel ?? '-'}) · ${row.questionText.slice(0, 60)}`);
  }

  // ─── เทียบคำถามของคนตอบผิด กับ ตอบถูก ───
  const byCorrectness = await db
    .select({
      isCorrect: aiTutorMessages.isCorrect,
      content: aiTutorMessages.content,
      count: sql<number>`count(*)::int`,
    })
    .from(aiTutorMessages)
    .where(and(
      eq(aiTutorMessages.role, 'user'),
      gte(aiTutorMessages.createdAt, since),
      sql`${aiTutorMessages.isCorrect} is not null`,
    ))
    .groupBy(aiTutorMessages.isCorrect, aiTutorMessages.content)
    .orderBy(sql`count(*) desc`)
    .limit(20);

  const wrong = byCorrectness.filter((row) => row.isCorrect === false);
  const right = byCorrectness.filter((row) => row.isCorrect === true);
  console.log('\n## เปรียบเทียบคำถาม: ตอบถูก vs ตอบผิด');
  console.log(`- คำถามจากผู้เรียนที่ตอบถูก: ${right.reduce((s, r) => s + r.count, 0)} คำถาม`);
  console.log(`- คำถามจากผู้เรียนที่ตอบผิด: ${wrong.reduce((s, r) => s + r.count, 0)} คำถาม`);
  if (wrong.length) {
    console.log('\n  ตัวอย่างคำถามของคนตอบผิด:');
    for (const row of wrong.slice(0, 8)) console.log(`   - (${row.count}) ${row.content.slice(0, 80)}`);
  }
  if (right.length) {
    console.log('\n  ตัวอย่างคำถามของคนตอบถูก:');
    for (const row of right.slice(0, 8)) console.log(`   - (${row.count}) ${row.content.slice(0, 80)}`);
  }

  // ─── feedback ───
  const feedbackRows = await db
    .select({ value: aiTutorFeedback.value, count: sql<number>`count(*)::int` })
    .from(aiTutorFeedback)
    .groupBy(aiTutorFeedback.value);
  const up = feedbackRows.find((r) => r.value === 'up')?.count ?? 0;
  const down = feedbackRows.find((r) => r.value === 'down')?.count ?? 0;
  const totalFeedback = up + down;

  console.log('\n## feedback (👍/👎)');
  console.log(`- 👍 ${up} · 👎 ${down} · สัดส่วน 👍 ${pct(up, totalFeedback)} / 👎 ${pct(down, totalFeedback)}`);

  if (down > 0) {
    const downMessages = await db
      .select({
        content: aiTutorMessages.content,
        questionText: questions.questionText,
        grammarTopic: questions.grammarTopic,
        model: aiTutorMessages.model,
      })
      .from(aiTutorFeedback)
      .innerJoin(aiTutorMessages, eq(aiTutorMessages.id, aiTutorFeedback.messageId))
      .innerJoin(questions, eq(questions.id, aiTutorMessages.questionId))
      .where(eq(aiTutorFeedback.value, 'down'))
      .orderBy(aiTutorFeedback.createdAt)
      .limit(10);
    console.log('\n  ข้อความที่ได้ 👎 (พร้อมโจทย์):');
    for (const row of downMessages) {
      console.log(`   - [${row.grammarTopic ?? '-'}] โจทย์: ${row.questionText.slice(0, 50)}`);
      console.log(`     คำตอบ: ${row.content.slice(0, 90).replace(/\n/g, ' ')} (${row.model ?? '-'})`);
    }
  }

  // ─── token / latency / ค่าใช้จ่าย แยกตามโมเดลที่ตอบจริง ───
  const byModel = await db
    .select({
      model: aiTutorMessages.model,
      count: sql<number>`count(*)::int`,
      inputTokens: sql<number>`coalesce(sum(${aiTutorMessages.inputTokens}), 0)::int`,
      outputTokens: sql<number>`coalesce(sum(${aiTutorMessages.outputTokens}), 0)::int`,
      avgLatency: sql<number>`coalesce(round(avg(${aiTutorMessages.latencyMs})), 0)::int`,
    })
    .from(aiTutorMessages)
    .where(and(eq(aiTutorMessages.role, 'assistant'), gte(aiTutorMessages.createdAt, since)))
    .groupBy(aiTutorMessages.model)
    .orderBy(sql`count(*) desc`);

  console.log('\n## โมเดลที่ตอบจริง (token / latency / ค่าใช้จ่ายโดยประมาณ)');
  console.log('| โมเดล | คำตอบ | input tok | output tok | latency เฉลี่ย (ms) | ค่าใช้จ่ายโดยประมาณ |');
  console.log('|---|---|---|---|---|---|');
  // ราคาต่อ 1M token (ประมาณ) — ตั้งค่าได้ผ่าน env
  const prices: Record<string, { in: number; out: number }> = {
    'deepseek/deepseek-v4.1-flash': { in: 0.0352, out: 0.0112 },
  };
  for (const row of byModel) {
    const key = row.model ?? 'ไม่ทราบ';
    const price = row.model ? prices[row.model] : undefined;
    const cost = price
      ? `$${(((row.inputTokens / 1_000_000) * price.in) + ((row.outputTokens / 1_000_000) * price.out)).toFixed(4)}`
      : 'ฟรี/ไม่ทราบราคา';
    console.log(`| ${key} | ${row.count} | ${row.inputTokens} | ${row.outputTokens} | ${row.avgLatency} | ${cost} |`);
  }

  // ─── อัตรา fallback ───
  const fallbackRows = await db
    .select({
      fallbackUsed: aiTutorMessages.fallbackUsed,
      count: sql<number>`count(*)::int`,
    })
    .from(aiTutorMessages)
    .where(and(eq(aiTutorMessages.role, 'assistant'), gte(aiTutorMessages.createdAt, since)))
    .groupBy(aiTutorMessages.fallbackUsed);
  const used = fallbackRows.find((r) => r.fallbackUsed === true)?.count ?? 0;
  const notUsed = fallbackRows.find((r) => r.fallbackUsed === false)?.count ?? 0;
  const totalAssistant = used + notUsed;
  console.log(`\n## อัตราการสลับโมเดลสำรอง: ${used}/${totalAssistant} (${pct(used, totalAssistant)})`);

  // ─── สัดส่วน failed / ว่าง / ถูกตัด ───
  const statusRows = await db
    .select({
      status: aiTutorMessages.status,
      count: sql<number>`count(*)::int`,
    })
    .from(aiTutorMessages)
    .where(and(eq(aiTutorMessages.role, 'user'), gte(aiTutorMessages.createdAt, since)))
    .groupBy(aiTutorMessages.status);
  const failed = statusRows.find((r) => r.status === 'failed')?.count ?? 0;
  const okRows = statusRows.find((r) => r.status === 'ok')?.count ?? 0;
  const pending = statusRows.find((r) => r.status === 'pending')?.count ?? 0;

  const emptyRows = await db.execute(sql`
    select count(*)::int as n
    from ai_tutor_messages
    where role = 'assistant' and created_at >= ${since} and (content is null or trim(content) = '')
  `);
  const empty = (emptyRows.rows[0] as { n: number } | undefined)?.n ?? 0;

  const truncatedRows = await db.execute(sql`
    select count(*)::int as n
    from ai_tutor_messages
    where role = 'assistant' and created_at >= ${since} and finish_reason = 'length'
  `);
  const truncated = (truncatedRows.rows[0] as { n: number } | undefined)?.n ?? 0;

  console.log('\n## สถานะคำตอบ');
  console.log(`- สำเร็จ (ok): ${okRows} · ล้มเหลว/คืนโควตา (failed): ${failed} · ค้าง (pending): ${pending}`);
  console.log(`- คำตอบว่าง: ${empty} · ถูกตัด (finish_reason = length): ${truncated}`);
  console.log('');
  process.exit(0);
}

void main();
