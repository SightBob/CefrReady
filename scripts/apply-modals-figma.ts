/**
 * เขียนทับ Explain #31 (Modals & Semi-modals) ตาม Figma node 504:10989
 *
 * - การ์ดเดียว (type rule) + ทริกสำคัญ + Mini Quiz
 * - ตัดการ์ดเดิม 5 ใบ (ขออนุญาต / คาดเดา-จำเป็น / Modal ในบทสนทนา / won't / used to) ออก
 * - Quiz = ข้อเดิมที่ตรงกับการ์ดใหม่ 3 ข้อ + ข้อจาก Figma 1 ข้อ
 *
 * รัน:  npx tsx scripts/apply-modals-figma.ts
 * รัน:  npx tsx scripts/apply-modals-figma.ts --apply
 */
import 'dotenv/config';
import { existsSync, writeFileSync } from 'node:fs';
import { db } from '../src/db';
import { testExplains } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const APPLY = process.argv.includes('--apply');
const EXPLAIN_ID = 31;
const ROLLBACK_FILE = 'tmp/explain-31-rollback.json';

const SECTIONS = [
  {
    type: 'rule',
    heading: 'Modals & Semi-modals (กริยาช่วยแสดงความสามารถ หน้าที่ และความจำเป็น)',
    rows: [
      { left: 'Must / Have to (ต้องทำ)', right: 'You ==must== submit this today.' },
      { left: 'Should / Ought to (ควรจะ)', right: 'You ==should== see a doctor.' },
      { left: 'Can / Could (สามารถทำได้)', right: 'She ==can== speak three languages.' },
      { left: 'May / Might (อาจจะ / ไม่แน่ใจ)', right: 'It ==might== rain this afternoon.' },
    ],
  },
  {
    type: 'importantNote',
    heading: 'ทริกสำคัญ',
    body: 'กริยาช่วยทุกตัว (Modal Verbs) ต้องตามด้วยกริยาช่องที่ 1 รูปเดิมเสมอ (V.1) ไม่มีผัน ไม่มีเติม s/ed! Have to ต้องเปลี่ยนรูปตามประธาน (has to / had to) ต่างจาก must ที่รูปเดิมตลอดกาล',
  },
  {
    type: 'practice',
    heading: 'ลองทำโจทย์เพื่อทบทวนความเข้าใจ',
    practice: {
      questions: [
        // ── ข้อเดิมจาก #31 ที่ตรงกับการ์ดใหม่ ──
        {
          sentence: 'Your soup smells strong. There ____ be plenty of chili in it.',
          options: ['must', "mustn't", "shouldn't"],
          answerIndex: 0,
          explanation:
            'ผู้พูดคาดเดาจากหลักฐาน (กลิ่นแรง) ว่าใส่พริกเยอะแน่ ๆ จึงใช้ must be → "There must be plenty of chili" (mustn’t / shouldn’t แปลว่าไม่น่าจะ/ไม่ควร ซึ่งขัดกับหลักฐาน)',
        },
        {
          sentence: "I've had no sleep for two nights. In that case you ____ rest at home today.",
          options: ["shouldn't", 'should', "can't"],
          answerIndex: 1,
          explanation:
            'อีกฝ่ายให้คำแนะนำว่าควรพักผ่อน จึงใช้ should → "you should rest" (can’t rest แปลว่าพักไม่ได้ ซึ่งขัดกับเจตนา)',
        },
        {
          sentence: "I'd be grateful if you could ____ the report before Friday.",
          options: ['checking', 'check', 'to check'],
          answerIndex: 1,
          explanation:
            'หลัง modal could กริยาเป็น V.1 ไม่ผันและไม่ต้องมี to → "could check the report" (checking และ to check ใช้หลัง modal ไม่ได้)',
        },
        // ── ข้อใหม่จาก Figma 504:11060 ──
        {
          sentence: "Passengers ____ smoke inside the airport. It's against the law.",
          options: ['must not', "don't have to", 'should'],
          answerIndex: 0,
          explanation:
            'ตัวบทระบุว่าผิดกฎหมาย = ห้ามอย่างเด็ดขาด จึงใช้ must not → "Passengers must not smoke" (don’t have to คือไม่จำเป็น และ should คือควร ซึ่งอ่อนเกินไป)',
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
  before.forEach((s, i) => console.log(`  ${i + 1}. [${s.type}] ${s.heading ?? '(ไม่มีหัวข้อ)'}`));
  console.log('--- ใหม่ ---');
  SECTIONS.forEach((s, i) => console.log(`  ${i + 1}. [${s.type}] ${(s as any).heading ?? '(ไม่มีหัวข้อ)'}${'practice' in s ? ` · quiz ${(s as any).practice.questions.length} ข้อ` : ''}`));

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
  console.log(` * #${EXPLAIN_ID} เขียนทับตาม Figma 504:10989 (1 การ์ด + ทริก + quiz 4 ข้อ)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });