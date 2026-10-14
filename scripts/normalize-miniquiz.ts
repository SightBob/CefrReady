/**
 * ปรับจำนวนข้อ Mini Quiz ให้ทุกชุดมี 3 ข้อเท่ากัน
 *
 * A) ตัด 6 explain ที่มี 4 ข้อ เหลือ 3 ข้อ (เอาข้อจาก Figma ออก เก็บข้อเดิมที่ครอบคลุมการ์ด)
 * B) เพิ่ม Mini Quiz 3 ข้อ ให้ 3 explain ที่ยังไม่มี (#37 #38 #39)
 *
 * รัน:  npx tsx scripts/normalize-miniquiz.ts
 * รัน:  npx tsx scripts/normalize-miniquiz.ts --apply
 */
import 'dotenv/config';
import { existsSync, writeFileSync } from 'node:fs';
import { db } from '../src/db';
import { testExplains } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

const APPLY = process.argv.includes('--apply');
const ROLLBACK_FILE = 'tmp/miniquiz-normalize-rollback.json';

// ── A) ตัด "ข้อจาก Figma" ออกจาก 6 ชุด — ระบุด้วยข้อความเฉพาะ ไม่ใช่ตำแหน่ง ──
const DROP_FROM_FIGMA: Array<{ id: number; match: string }> = [
  { id: 27, match: "We don’t have ____ time left before the exam." },
  { id: 29, match: "______ the heavy rain, the football match was cancelled." },
  { id: 31, match: "Passengers ____ smoke inside the airport." },
  { id: 36, match: "______ did you finish your homework last night?" },
  { id: 40, match: "The laptop ______ I bought yesterday is already broken." },
  { id: 43, match: "She wants to be ______ engineer when she grows up." },
];
const TRIM_IDS = DROP_FROM_FIGMA.map((d) => d.id);

// ── B) quiz ใหม่สำหรับ 3 ตัวที่ไม่มี ──
const NEW_QUIZZES: Record<number, any[]> = {
  37: [
    {
      sentence: 'Man: Has Ben ____ you the new classroom rules yet? Woman: Yes, he sent them this morning.',
      options: ['sent', 'send', 'sends'],
      answerIndex: 0,
      explanation:
        'ประโยคบอกเล่าว่า "he sent them this morning" (ส่งไปแล้ว) และมีคำว่า yet บอกว่าถึงตอนนี้ จึงต้องใช้ Present Perfect → "Has Ben sent you…?"',
    },
    {
      sentence: 'Woman: Which city do you call home? Man: Chiang Mai. I ____ here since 2019.',
      options: ['have', 'has', 'am'],
      answerIndex: 0,
      explanation:
        'ประธาน I ต้องใช้ have และมีคำว่า since (ตั้งแต่) ซึ่งเป็นคีย์เวิร์ดของ Present Perfect → "I have lived here since 2019."',
    },
    {
      sentence: 'She ____ her report ____.',
      options: ["hasn't finished", "hasn't finish", "didn't finished"],
      answerIndex: 0,
      explanation:
        'yet ใช้วางหลังประโยคปฏิเสธและต้องใช้ Present Perfect กับ has/have + V.3 → "She hasn’t finished her report yet."',
    },
  ],
  38: [
    {
      sentence: 'When did you notice ____ your phone? — When I went to pay at the shop.',
      options: ['lose', 'had lost', 'has lost'],
      answerIndex: 1,
      explanation:
        'การทำหายโทรศัพท์เกิดขึ้นก่อนการไปจ่ายเงิน จึงต้องใช้ Past Perfect → "notice had lost" (lose ไม่มีรูป had และ has lost เป็น Present Perfect)',
    },
    {
      sentence: 'She ____ dinner before I arrived.',
      options: ['had eaten', 'has eaten', 'eat'],
      answerIndex: 0,
      explanation:
        'before I arrived บอกว่าการกินเสร็จเกิดขึ้นก่อนการมาถึง จึงใช้ Past Perfect → "She had eaten" (has eaten เป็น Present Perfect)',
    },
    {
      sentence: 'By the time he came, we ____.',
      options: ['had left', 'have left', 'left'],
      answerIndex: 0,
      explanation:
        'by the time + กริยาอดีต บอกว่าเราไปก่อนที่เขาจะมาถึง จึงใช้ Past Perfect → "we had left"',
    },
  ],
  39: [
    {
      sentence: 'Man: Do you know Ploy? Woman: Yes, we first met about three weeks ____.',
      options: ['ago', 'since', 'for'],
      answerIndex: 0,
      explanation:
        'ago ใช้บอกระยะเวลาที่ผ่านมานับจากตอนนี้ และใช้กับ Past Simple → "about three weeks ago" (for/since ใช้กับ Present Perfect)',
    },
    {
      sentence: 'Man: Do you know Suchada? Woman: Yes, we first met a few years ____ at a conference.',
      options: ['ago', 'since', 'during'],
      answerIndex: 0,
      explanation:
        'ระยะเวลาสิ้นสุดแล้วต้องลงท้ายด้วย ago → "a few years ago" (since ใช้นำหน้าจุดเวลาที่ยังดำเนินอยู่)',
    },
    {
      sentence: 'I met him ____.',
      options: ['two years ago', 'for two years', 'since two years'],
      answerIndex: 0,
      explanation:
        'ago = นับย้อนจากตอนนี้ และวางไว้ท้ายประโยค → "two years ago" (for/since ใช้กับ Present Perfect เท่านั้น)',
    },
  ],
};

async function main() {
  const ids = [...TRIM_IDS, ...Object.keys(NEW_QUIZZES).map(Number)];
  const rows = await db.select().from(testExplains).where(inArray(testExplains.id, ids));

  const plan: Array<{ id: number; title: string; before: unknown; after: any[]; action: string }> = [];

  for (const { id, match } of DROP_FROM_FIGMA) {
    const row = rows.find((r) => r.id === id);
    if (!row) throw new Error(`ไม่พบ id=${id}`);
    const sections = structuredClone((row.sections ?? []) as any[]);
    const pi = sections.findIndex((s) => (s.practice?.questions?.length ?? 0) === 4);
    if (pi < 0) throw new Error(`#${id} ไม่พบ quiz ที่มี 4 ข้อ`);
    const qi = sections[pi].practice.questions.findIndex((q: any) => q.sentence.includes(match));
    if (qi < 0) throw new Error(`#${id} ไม่พบข้อที่จะตัด: "${match}" — หยุดก่อน`);
    const dropped = sections[pi].practice.questions[qi].sentence;
    sections[pi].practice.questions.splice(qi, 1);
    plan.push({
      id,
      title: row.title,
      before: row.sections,
      after: sections,
      action: `ตัดข้อจาก Figma (ข้อที่ ${qi + 1}) → เหลือ 3 ข้อ | ตัด: "${dropped}"`,
    });
  }

  for (const [idStr, questions] of Object.entries(NEW_QUIZZES)) {
    const id = Number(idStr);
    const row = rows.find((r) => r.id === id);
    if (!row) throw new Error(`ไม่พบ id=${id}`);
    const sections = structuredClone((row.sections ?? []) as any[]);
    if (sections.some((s) => (s.practice?.questions?.length ?? 0) > 0)) {
      throw new Error(`#${id} มี quiz อยู่แล้ว — หยุดก่อน`);
    }
    sections.push({
      type: 'practice',
      heading: 'ลองทำโจทย์เพื่อทบทวนความเข้าใจ',
      practice: { questions },
    });
    plan.push({
      id,
      title: row.title,
      before: row.sections,
      after: sections,
      action: `เพิ่ม Mini Quiz ${questions.length} ข้อ (ไม่มีอยู่เดิม)`,
    });
  }

  console.log('=== แผน ===');
  for (const p of plan) console.log(`#${p.id} "${p.title}"\n   ${p.action}\n   sections: ${(p.before as any[]).length} → ${p.after.length}`);

  if (!APPLY) {
    console.log('\n--- DRY RUN ---');
    console.log('ยังไม่ได้เขียนลง DB (ใส่ --apply เพื่อบันทึก)');
    return;
  }

  if (existsSync(ROLLBACK_FILE)) throw new Error(`${ROLLBACK_FILE} มีอยู่แล้ว — ย้ายออกก่อนรัน`);
  writeFileSync(
    ROLLBACK_FILE,
    JSON.stringify(plan.map((p) => ({ id: p.id, sections: p.before })), null, 2),
    'utf8',
  );
  console.log(`\nเขียน rollback: ${ROLLBACK_FILE}`);

  for (const p of plan) {
    await db
      .update(testExplains)
      .set({ sections: p.after as typeof testExplains.$inferInsert['sections'], updatedAt: new Date() })
      .where(eq(testExplains.id, p.id));
  }

  console.log('\n--- APPLIED ---');
  for (const p of plan) console.log(` * #${p.id} ${p.action}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });