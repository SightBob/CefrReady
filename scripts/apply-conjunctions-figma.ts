/**
 * เขียนทับ Explain #29 (Conjunctions & Connectors) ตาม Figma node 504:11752
 *
 * - 4 การ์ด rule (ขัดแย้ง / เหตุผล / ผลลัพธ์ / เพิ่มข้อมูล)
 * - ทริกสำคัญ 1 อัน
 * - Mini Quiz = ข้อ Figma 1 ข้อ + ข้อเดิมที่ตรงหัวข้อ 3 ข้อ
 *
 * รัน:  npx tsx scripts/apply-conjunctions-figma.ts
 * รัน:  npx tsx scripts/apply-conjunctions-figma.ts --apply
 */
import 'dotenv/config';
import { existsSync, writeFileSync } from 'node:fs';
import { db } from '../src/db';
import { testExplains } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const APPLY = process.argv.includes('--apply');
const EXPLAIN_ID = 29;
const ROLLBACK_FILE = 'tmp/explain-29-rollback.json';

const SECTIONS = [
  // ── การ์ด 1 (มีหัวเรื่อง) — Figma 504:11766 ──
  {
    type: 'rule',
    heading: 'Conjunctions & Connectors (คำเชื่อมประโยค: แบ่งตามความหมาย)',
    description: 'กลุ่มแสดงความขัดแย้ง - แม้ว่า/อย่างไรก็ตาม',
    rows: [{ left: 'Although / Even though / However', right: '==Although== it rained, we went out.' }],
  },
  // ── การ์ด 2 — Figma 504:11787 ──
  {
    type: 'rule',
    description: 'กลุ่มแสดงเหตุผล - เพราะว่า',
    rows: [{ left: 'Because / Since / Because of', right: 'She was late ==because== of traffic.' }],
  },
  // ── การ์ด 3 — Figma 504:11806 ──
  {
    type: 'rule',
    description: 'กลุ่มแสดงผลลัพธ์ - ดังนั้น',
    rows: [{ left: 'So / Therefore / Consequently', right: 'He studied hard, ==so== he passed.' }],
  },
  // ── การ์ด 4 — Figma 504:11825 ──
  {
    type: 'rule',
    description: 'กลุ่มแสดงการเพิ่มข้อมูล - นอกจากนี้',
    rows: [{ left: 'Moreover / Furthermore / In addition', right: "It's cheap; ==moreover==, it's good." }],
  },
  // ── ทริกสำคัญ — Figma 504:11844 ──
  {
    type: 'importantNote',
    heading: 'ทริกสำคัญ',
    body: 'ดูโครงสร้างหลังคำเชื่อม: ถ้าตามด้วยประโยค (Subject + Verb) ให้ใช้ Although, Because, So ถ้าตามด้วยคำนาม (Noun Phrase) เฉยๆ ให้ใช้กลุ่มคำบุพบท เช่น Despite, Because of, Due to',
  },
  // ── Mini Quiz — Figma 504:11850 (ข้อ 1) + ข้อเดิม 3 ข้อ ──
  {
    type: 'practice',
    heading: 'ลองทำโจทย์เพื่อทบทวนความเข้าใจ',
    practice: {
      questions: [
        {
          sentence: '______ the heavy rain, the football match was cancelled.',
          options: ['Although', 'Because of', 'Because'],
          answerIndex: 1,
          explanation:
            'หลังช่องว่างคือ the heavy rain ซึ่งเป็นนามวลี (Noun Phrase) ไม่ใช่ประโยค จึงต้องใช้ because of → "Because of the heavy rain" (ถ้าเป็นประโยค Subject + Verb ค่อยใช้ Because / Although)',
        },
        {
          sentence: "What's the best part of your new job? — Mostly ____ my colleagues. They are so kind.",
          options: ['because of', 'because', 'so'],
          answerIndex: 0,
          explanation:
            'คำที่ตามหลังคือ my colleagues (นามวลี) ไม่ใช่ประโยค จึงใช้ because of → "because of my colleagues" (ถ้าเป็น because ต้องมีประธาน + กริยาตามหลัง)',
        },
        {
          sentence: 'Nok ____ her cousin are best friends.',
          options: ['or', 'and', 'but'],
          answerIndex: 1,
          explanation:
            'ประธานสองคนทำกริยาเดียวกัน จึงต้องเชื่อมด้วย and → "Nok and her cousin are…" (or ใช้เมื่อเลือกอย่างใดอย่างหนึ่ง และ but ใช้เมื่อขัดแย้งกัน)',
        },
        {
          sentence: "Is your name Ann ____ Anya? — It's Ann, with an 'e' at the end.",
          options: ['so', 'and', 'or'],
          answerIndex: 2,
          explanation:
            'ผู้พูดถามว่าเป็นชื่อใดชื่อหนึ่งจากสองตัวเลือก จึงใช้ or → "Ann or Anya?"',
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
  console.log(` * #${EXPLAIN_ID} เขียนทับตาม Figma 504:11752 (4 การ์ด + ทริก + quiz 4 ข้อ)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });