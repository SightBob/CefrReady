/**
 * เขียนทับ Explain #36 (Question Forms) ตาม Figma node 504:11464
 *
 * - 4 การ์ด rule (Yes/No + be · Yes/No + do · Wh- · Subject question)
 * - ทริกสำคัญ 1 อัน
 * - Mini Quiz = ข้อ Figma 1 ข้อ + ข้อเดิมที่ตรงการ์ดใหม่ 3 ข้อ (ครอบคลุมครบ 4 การ์ด)
 *
 * รัน:  npx tsx scripts/apply-question-forms-figma.ts
 * รัน:  npx tsx scripts/apply-question-forms-figma.ts --apply
 */
import 'dotenv/config';
import { existsSync, writeFileSync } from 'node:fs';
import { db } from '../src/db';
import { testExplains } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const APPLY = process.argv.includes('--apply');
const EXPLAIN_ID = 36;
const ROLLBACK_FILE = 'tmp/explain-36-rollback.json';

const SECTIONS = [
  // ── การ์ด 1 (มีหัวเรื่อง) — Figma 504:11478 ──
  {
    type: 'rule',
    heading: 'Question Forms (โครงสร้างประโยคคำถาม Wh- และ Yes/No)',
    description: 'กลุ่มประโยคคำถาม Yes/No - ใช้ Verb to be',
    rows: [{ left: 'Is / Am / Are + Subject + ...?', right: '==Are== you ready for the test?' }],
  },
  // ── การ์ด 2 — Figma 504:11500 ──
  {
    type: 'rule',
    description: 'กลุ่มประโยคคำถาม Yes/No - ใช้ Verb to do',
    rows: [{ left: 'Do / Does / Did + Subject + V.1?', right: '==Do== you like coffee?' }],
  },
  // ── การ์ด 3 — Figma 504:11519 ──
  {
    type: 'rule',
    description: 'กลุ่มประโยคคำถาม Wh- Question - ถามข้อมูล',
    rows: [{ left: 'Wh- + Auxiliary + Subject + V.1?', right: '==Where do== you live?' }],
  },
  // ── การ์ด 4 — Figma 504:11538 ──
  {
    type: 'rule',
    description: 'กลุ่มประโยคคำถามประธาน - Wh- เป็น Subject',
    rows: [{ left: 'Who / What + V.s/es (ไม่ต้องใช้ do/does)', right: '==Who== breaks this window?' }],
  },
  // ── ทริกสำคัญ — Figma 504:11557 ──
  {
    type: 'importantNote',
    heading: 'ทริกสำคัญ',
    body: 'กฎเหล็กประโยคคำถามต้องสลับเอา Verb ช่วยขึ้นหน้าประธานเสมอ ถ้าขึ้นต้นด้วย Who / What แล้วถามหาตัวผู้กระทำเอง ไม่ต้องดึง do/does/did มาช่วย (กริยาตามหลังผันตามปกติ)',
  },
  // ── Mini Quiz — Figma 504:11563 (ข้อ 1) + ข้อเดิมที่ครอบคลุมการ์ด 1-4 ──
  {
    type: 'practice',
    heading: 'ลองทำโจทย์เพื่อทบทวนความเข้าใจ',
    practice: {
      questions: [
        {
          sentence: '______ did you finish your homework last night?',
          options: ['Where', 'When', 'Who'],
          answerIndex: 1,
          explanation:
            'คำตอบคือ “last night” ซึ่งเป็นช่วงเวลา จึงต้องถามด้วย When → "When did you finish…?" (Where ถามสถานที่ ส่วน Who ถามตัวบุคคล)',
        },
        {
          sentence: '____ there any biscuits in the box?',
          options: ['Have', 'Are', 'Do'],
          answerIndex: 1,
          explanation:
            'คำถามว่า “มีไหม” กับนามพหูพจน์ใช้ Are there → “Are there any biscuits…?” (Have there และ Do there ไม่ใช้ในความหมายนี้)',
        },
        {
          sentence: '____ your father speak English? — Yes, just a little.',
          options: ['Is', 'Does', 'Do'],
          answerIndex: 1,
          explanation:
            'ประธาน your father เป็นเอกพจน์และกริยาหลักคือ speak จึงต้องใช้ Does → “Does your father speak English?”',
        },
        {
          sentence: '____ gloves are these? — I don’t know. They aren’t mine.',
          options: ['Who', 'Whose', 'Which'],
          answerIndex: 1,
          explanation:
            'ถามว่า gloves เป็นของใคร และตามด้วยคำนาม gloves จึงต้องใช้ whose → “Whose gloves are these?” (who ไม่ได้ตามด้วยคำนาม)',
        },
      ],
    },
  },
];

async function main() {
  const [row] = await db.select().from(testExplains).where(eq(testExplains.id, EXPLAIN_ID)).limit(1);
  if (!row) throw new Error(`ไม่พบ test_explains id=${EXPLAIN_ID}`);

  const before = (row.sections ?? []) as any[];
  console.log(`#${EXPLAIN_ID} "${row.title}" (${row.status}) · sets ${JSON.stringify(row.testSetIds)}`);
  console.log(`sections เดิม ${before.length} → ใหม่ ${SECTIONS.length}`);
  before.forEach((s, i) => console.log(`  ${i + 1}. [${s.type}] ${s.heading ?? s.description ?? '(ไม่มีหัวข้อ)'}`));
  console.log('--- ใหม่ ---');
  SECTIONS.forEach((s, i) =>
    console.log(`  ${i + 1}. [${s.type}] ${(s as any).heading ?? (s as any).description ?? '(ไม่มีหัวข้อ)'}${'practice' in s ? ` · quiz ${(s as any).practice.questions.length} ข้อ` : ''}`),
  );

  if (!APPLY) {
    console.log('\n--- DRY RUN ---');
    console.log(JSON.stringify(SECTIONS, null, 2));
    console.log('\nยังไม่ได้เขียนลง DB (ใส่ --apply เพื่อบันทึก)');
    return;
  }

  if (existsSync(ROLLBACK_FILE)) throw new Error(`${ROLLBACK_FILE} มีอยู่แล้ว — ย้ายออกก่อนรัน`);
  writeFileSync(ROLLBACK_FILE, JSON.stringify({ id: EXPLAIN_ID, sections: row.sections }, null, 2), 'utf8');
  console.log(`\nเขียน rollback: ${ROLLBACK_FILE}`);

  await db
    .update(testExplains)
    .set({ sections: SECTIONS as typeof testExplains.$inferInsert['sections'], updatedAt: new Date() })
    .where(eq(testExplains.id, EXPLAIN_ID));

  console.log('\n--- APPLIED ---');
  console.log(` * #${EXPLAIN_ID} เขียนทับตาม Figma 504:11464 (4 การ์ด + ทริก + quiz 4 ข้อ)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });