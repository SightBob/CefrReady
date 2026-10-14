/**
 * เขียนทับ Explain #27 (Quantifiers) ตาม Figma node 504:11329
 *
 * - 3 การ์ด type ใหม่ `patternBreakdown` (ป้ายเงื่อนไข → แถบตัวอย่าง → ทริก)
 * - การ์ด enough / all / none / neither ถูกตัดออกตามที่สั่ง
 * - Mini Quiz = ข้อเดิม 3 ข้อ + ข้อจาก Figma (We don't have ___ time left)
 *
 * รัน:  npx tsx scripts/apply-quantifiers-figma.ts          (dry run)
 * รัน:  npx tsx scripts/apply-quantifiers-figma.ts --apply
 */
import 'dotenv/config';
import { existsSync, writeFileSync } from 'node:fs';
import { db } from '../src/db';
import { testExplains } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const APPLY = process.argv.includes('--apply');
const EXPLAIN_ID = 27;
const ROLLBACK_FILE = 'tmp/explain-27-rollback.json';

const SECTIONS = [
  // ── การ์ด 1 (มีหัวเรื่อง) — Figma 504:11343 ──
  {
    type: 'patternBreakdown',
    heading: 'Quantifiers (คำบอกปริมาณ: แบ่งตามชนิดของคำนาม)',
    rows: [
      {
        left: 'ใช้นำหน้านามนับได้ (มีรูป -s / เติมจำนวนได้)',
        right: 'I have ==many books==, but I have ==few friends==.',
      },
    ],
    tip: 'ใช้ Many (มาก) และ Few (น้อย-แทบไม่มี)',
  },
  // ── การ์ด 2 (ไม่มีหัวเรื่อง) — Figma 504:11368 ──
  {
    type: 'patternBreakdown',
    rows: [
      {
        left: 'ใช้นำหน้านามนับไม่ได้ (ของเหลว, นามธรรม, ก้อนเล็กๆ)',
        right: 'She drinks ==much water==, but has ==little time==.',
      },
    ],
    tip: 'ใช้ Much (มาก) และ Little (น้อย-แทบไม่มี)',
  },
  // ── การ์ด 3 (ไม่มีหัวเรื่อง) — Figma 504:11390 ──
  {
    type: 'patternBreakdown',
    rows: [
      {
        left: 'ใช้ได้ทั้งนามนับได้และนับไม่ได้',
        right: 'I want ==some== water. / Do you have ==any== questions?',
      },
    ],
    tip: 'Some ใช้บอกเล่า, Any ใช้ปฏิเสธ/คำถาม',
  },
  // ── ทริกสำคัญ — Figma 504:11413 ──
  {
    type: 'importantNote',
    heading: 'ทริกสำคัญ',
    body: 'นับได้ใช้ Many / Few ➔ นับไม่ได้ใช้ Much / Little\nSome เจอในประโยคบอกเล่า (+) ➔ Any เจอในประโยคปฏิเสธ (-) และคำถาม (?)',
  },
  // ── Mini Quiz — ข้อเดิม 3 ข้อ + ข้อจาก Figma 504:11419 ──
  {
    type: 'practice',
    heading: 'ลองทำโจทย์เพื่อทบทวนความเข้าใจ',
    practice: {
      questions: [
        {
          sentence: 'Our family saves a lot ____ money for travel every year.',
          options: ['of', 'in', 'from'],
          answerIndex: 0,
          explanation:
            'a lot of เป็นวลีบอกปริมาณที่ต้องมี of ตามหลังเสมอเมื่อตามด้วยนาม → "a lot of money"',
        },
        {
          sentence: 'Do you know how ____ a taxi from the airport to the city costs?',
          options: ['much', 'many', 'long'],
          answerIndex: 0,
          explanation:
            'ราคาเป็นสิ่งที่ตวงหรือนับเป็นหน่วยไม่ได้ จึงใช้ much → "How much … costs?" (many ใช้กับนามนับได้พหูพจน์เท่านั้น)',
        },
        {
          sentence: 'I don’t want any more rice, thank you.',
          options: ['no', 'some', 'none'],
          answerIndex: 0,
          explanation:
            'ไม่เอาอีก = ไม่มีเอย ใช้ no + คำนาม → "no more rice" (some ใช้ในประโยคบอกเล่า และ none ใช้เมื่อตามด้วย of เสมอ)',
        },
        {
          sentence: 'We don’t have ____ time left before the exam.',
          options: ['many', 'much', 'few'],
          answerIndex: 1,
          explanation:
            'time เป็นนามนับไม่ได้ จึงต้องใช้ much ไม่ใช่ many หรือ few → "We don’t have much time"',
        },
      ],
    },
  },
];

async function main() {
  const [row] = await db.select().from(testExplains).where(eq(testExplains.id, EXPLAIN_ID)).limit(1);
  if (!row) throw new Error(`ไม่พบ test_explains id=${EXPLAIN_ID}`);

  const before = (row.sections ?? []) as unknown[];
  console.log(`#${EXPLAIN_ID} "${row.title}" (${row.status}) · sets ${JSON.stringify(row.testSetIds)}`);
  console.log(`sections เดิม ${before.length} → ใหม่ ${SECTIONS.length}`);
  before.forEach((s, i) => console.log(`  ${i + 1}. [${(s as any).type}] ${(s as any).heading ?? '(ไม่มีหัวข้อ)'}`));
  console.log('--- ใหม่ ---');
  SECTIONS.forEach((s, i) => console.log(`  ${i + 1}. [${s.type}] ${(s as any).heading ?? '(ไม่มีหัวข้อ)'}${'rows' in s ? ` · ${(s as any).rows.length} แถว` : ''}`));

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
  console.log(` * #${EXPLAIN_ID} เขียนทับเป็น Pattern Breakdown ตาม Figma 504:11329`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });