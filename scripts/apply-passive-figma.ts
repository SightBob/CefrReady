/**
 * เขียนทับ Explain #32 (Passive Voice) ตาม Figma node 504:12040
 *
 * - 4 การ์ด rule (Present / Past / Future / Continuous Simple)
 * - ทริกสำคัญ 1 อัน
 * - Mini Quiz = ข้อเดิมที่ตรงกับการ์ดใหม่ 2 ข้อ + ข้อจาก Figma 1 ข้อ (ครบ 3 ช่องตาม Figma)
 *
 * รัน:  npx tsx scripts/apply-passive-figma.ts
 * รัน:  npx tsx scripts/apply-passive-figma.ts --apply
 */
import 'dotenv/config';
import { existsSync, writeFileSync } from 'node:fs';
import { db } from '../src/db';
import { testExplains } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const APPLY = process.argv.includes('--apply');
const EXPLAIN_ID = 32;
const ROLLBACK_FILE = 'tmp/explain-32-rollback.json';

const SECTIONS = [
  // ── การ์ด 1 (มีหัวเรื่อง) — Figma 504:12054 ──
  {
    type: 'rule',
    heading: 'Passive Voice (เน้นผู้ถูกกระทำ: Subject + Be + V.3)',
    description: 'Present Simple Tense',
    rows: [{ left: 'is / am / are + V.3', right: 'English ==is spoken== here.' }],
  },
  // ── การ์ด 2 — Figma 504:12076 ──
  {
    type: 'rule',
    description: 'Past Simple Tense',
    rows: [{ left: 'was / were + V.3', right: 'The window ==was broken== yesterday.' }],
  },
  // ── การ์ด 3 — Figma 504:12095 ──
  {
    type: 'rule',
    description: 'Future Simple Tense',
    rows: [{ left: 'will be + V.3', right: 'The project ==will be finished== soon.' }],
  },
  // ── การ์ด 4 — Figma 504:12114 ──
  {
    type: 'rule',
    description: 'Continuous Tense',
    rows: [{ left: 'is / am / are + being + V.3', right: 'The car ==is being repaired== now.' }],
  },
  // ── ทริกสำคัญ — Figma 504:12133 ──
  {
    type: 'importantNote',
    heading: 'ทริกสำคัญ',
    body: 'หัวใจหลักของ Passive Voice คือต้องมี Verb to be + กริยาช่องที่ 3 (V.3) เสมอ ขาดตัวใดตัวหนึ่งไม่ได้ สังเกตประโยคหน้าช่องว่าง: ถ้าประธานทำเอง (Active) ใช้กริยาปกติ แต่ถ้าประธานถูกกระทำ (Passive) ต้องเลือกสูตร Be + V.3',
  },
  // ── Mini Quiz — Figma 504:12139 (วาดข้อ 1 · ข้อ 2-3 มาจากของเดิมที่ตรงการ์ดใหม่) ──
  {
    type: 'practice',
    heading: 'ลองทำโจทย์เพื่อทบทวนความเข้าใจ',
    practice: {
      questions: [
        {
          sentence: 'This novel ______ written by a famous Thai author last year.',
          options: ['is', 'was', 'has been'],
          answerIndex: 1,
          explanation:
            'novel เป็นผู้ถูกเขียน (ไม่ใช่ผู้เขียนเอง) และ last year บอกอดีต จึงใช้ was + V.3 → "was written" (is เป็นปัจจุบัน ส่วน has been ใช้กริยาช่อง 3 ที่เปลี่ยนรูปแล้ว ไม่ใช่รูปเดิม)',
        },
        {
          sentence: 'How many points ____ scored in the match last night?',
          options: ['was', 'were', 'are'],
          answerIndex: 1,
          explanation:
            'ประธาน points เป็นพหูพจน์ และ last night บอกอดีต จึงใช้ were + V.3 → "were scored" (was ใช้กับเอกพจน์ และ are เป็นปัจจุบัน)',
        },
        {
          sentence: 'I think her kitten ____ Moka.',
          options: ['call', 'is called', 'calls'],
          answerIndex: 1,
          explanation:
            'แมวเป็นตัวที่ถูกตั้งชื่อ (ไม่ใช่คนตั้งชื่อ) จึงต้องใช้ passive is called → "is called Moka" (call/calls เป็น active แปลว่าแมวเป็นผู้เรียกชื่อ ซึ่งไม่มีความหมาย)',
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
  console.log(` * #${EXPLAIN_ID} เขียนทับตาม Figma 504:12040 (4 การ์ด + ทริก + quiz 3 ข้อ)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });