/**
 * เขียนทับ Explain #40 (Relative Clauses) ตาม Figma node 504:11895
 *
 * - 4 การ์ด rule (Who / Which / That / Whose)
 * - ทริกสำคัญ 1 อัน
 * - Mini Quiz = ข้อ Figma 1 ข้อ + ข้อเดิมที่ตรงการ์ดใหม่ 3 ข้อ
 *
 * รัน:  npx tsx scripts/apply-relative-figma.ts
 * รัน:  npx tsx scripts/apply-relative-figma.ts --apply
 */
import 'dotenv/config';
import { existsSync, writeFileSync } from 'node:fs';
import { db } from '../src/db';
import { testExplains } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const APPLY = process.argv.includes('--apply');
const EXPLAIN_ID = 40;
const ROLLBACK_FILE = 'tmp/explain-40-rollback.json';

const SECTIONS = [
  // ── การ์ด 1 (มีหัวเรื่อง) — Figma 504:11909 ──
  {
    type: 'rule',
    heading: 'Relative Clauses (อนุประโยคขยายคำนาม: เลือกใช้ตามประเภทคำนาม)',
    description: 'ใช้ขยายคน - ทำหน้าที่เป็นประธานหรือกรรม',
    rows: [{ left: 'Who / Whom (ใช้แทนคน)', right: 'The man ==who== called you is my boss.' }],
  },
  // ── การ์ด 2 — Figma 504:11931 ──
  {
    type: 'rule',
    description: 'ใช้ขยายสิ่งของหรือสัตว์',
    rows: [{ left: 'Which (ใช้แทนสัตว์ สิ่งของ)', right: 'This is the car ==which== I bought' }],
  },
  // ── การ์ด 3 — Figma 504:11950 ──
  {
    type: 'rule',
    description: 'ใช้ได้ทั้งคน สิ่งของ และสัตว์',
    rows: [{ left: 'That (ใช้แทนได้ทั้งคนและสิ่งของ)', right: 'He is the best teacher ==that== I know.' }],
  },
  // ── การ์ด 4 — Figma 504:11969 ──
  {
    type: 'rule',
    description: 'ใช้แสดงความเป็นเจ้าของ',
    rows: [{ left: 'Whose (แสดงความเป็นเจ้าของของนามข้างหน้า)', right: 'I met a girl ==whose== car was stolen.' }],
  },
  // ── ทริกสำคัญ — Figma 504:11988 ──
  {
    type: 'importantNote',
    heading: 'ทริกสำคัญ',
    body: 'มองคำนามที่อยู่ข้างหน้าช่องว่าง ทันทีว่าเป็นคน (Who) หรือสิ่งของ (Which) ถ้าเจอเครื่องหมายคอมมา (,) ขั้นอยู่ ห้ามใช้ That เด็ดขาด (ต้องใช้ Who หรือ Which เท่านั้น)',
  },
  // ── Mini Quiz — Figma 504:11994 (ข้อ 1) + ข้อเดิมที่ตรงการ์ดใหม่ ──
  {
    type: 'practice',
    heading: 'ลองทำโจทย์เพื่อทบทวนความเข้าใจ',
    practice: {
      questions: [
        {
          sentence: 'The laptop ______ I bought yesterday is already broken.',
          options: ['who', 'which', 'whose'],
          answerIndex: 1,
          explanation:
            'คำนามที่ขยายคือ The laptop (สิ่งของ) จึงต้องใช้ which → "The laptop which I bought" (who ใช้กับคน ส่วน whose ต้องตามด้วยคำนามแบบเจ้าของ)',
        },
        {
          sentence: 'Have you met the chef ____ cooks the best noodles in town?',
          options: ['whose', 'who', 'which'],
          answerIndex: 1,
          explanation:
            'คำที่ขยายคือ the chef (คน) และคำที่ตามหลังเป็นกริยา cooks จึงต้องใช้ who → "the chef who cooks"',
        },
        {
          sentence: 'Is he the man ____ daughter is a vet?',
          options: ['whose', 'who', 'which'],
          answerIndex: 0,
          explanation:
            'ตามด้วยคำนาม daughter (เจ้าของลูกสาว) จึงต้องใช้ whose → "the man whose daughter" (who ต้องตามด้วยกริยา ไม่ใช่คำนาม)',
        },
        {
          sentence: 'Rice balls ____ my grandmother makes every festival are very popular.',
          options: ['who', 'whose', 'which'],
          answerIndex: 2,
          explanation:
            'คำที่ขยายคือ Rice balls (สิ่งของ) จึงใช้ which → "Rice balls which my grandmother makes…" (who ใช้กับคน)',
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
  console.log(` * #${EXPLAIN_ID} เขียนทับตาม Figma 504:11895 (4 การ์ด + ทริก + quiz 4 ข้อ)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });