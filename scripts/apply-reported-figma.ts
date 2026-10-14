/**
 * เขียนทับ Explain #41 (Reported Speech) ตาม Figma node 504:12476
 *
 * - 4 การ์ด rule (Tense / Modal / Time Words)
 * - ทริกสำคัญ 1 อัน
 * - Mini Quiz = ข้อ Figma 1 ข้อ + ข้อเดิมที่ตรงหัวข้อ 2 ข้อ
 *
 * รัน:  npx tsx scripts/apply-reported-figma.ts
 * รัน:  npx tsx scripts/apply-reported-figma.ts --apply
 */
import 'dotenv/config';
import { existsSync, writeFileSync } from 'node:fs';
import { db } from '../src/db';
import { testExplains } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const APPLY = process.argv.includes('--apply');
const EXPLAIN_ID = 41;
const ROLLBACK_FILE = 'tmp/explain-41-rollback.json';

const SECTIONS = [
  // ── การ์ด 1 (มีหัวเรื่อง) — Figma 504:12490 ──
  {
    type: 'rule',
    heading: 'Reported Speech (การเปลี่ยน Direct เป็น Indirect Speech)',
    description: 'Present Simple ➔ Past Simple',
    rows: [{ left: 'เปลี่ยน V.1 เป็น V.2', right: 'I ==am== ➔ He ==was==' }],
  },
  // ── การ์ด 2 — Figma 504:12514 ──
  {
    type: 'rule',
    description: 'Past Simple ➔ Past Perfect',
    rows: [{ left: 'เปลี่ยน V.2 เป็น had+V.3', right: 'I ==went== ➔ He ==had gone==' }],
  },
  // ── การ์ด 3 — Figma 504:12535 ──
  {
    type: 'rule',
    description: 'Modal Verbs เปลี่ยนรูป',
    rows: [{ left: 'เปลี่ยนกริยาช่วย', right: 'I ==can== ➔ He ==could==' }],
  },
  // ── การ์ด 4 — Figma 504:12556 ──
  {
    type: 'rule',
    description: 'การเปลี่ยนคำบอกเวลา',
    rows: [{ left: 'Time Words (เปลี่ยนคำบอกเวลา)', right: '==now== ➔ ==then==' }],
  },
  // ── ทริกสำคัญ — Figma 504:12576 ──
  {
    type: 'importantNote',
    heading: 'ทริกสำคัญ',
    body: 'กฎเหล็กเมื่อเปลี่ยนเป็นประโยคบอกเล่าทางอ้อมคือ “ถอยหลัง Tense ไป 1 ก้าวเสมอ” (V.1 เป็น V.2, V.2 เป็น had + V.3) ห้ามใช้เครื่องหมายอัญประกาศ ("...") และต้องเรียงประโยคใหม่เป็น Subject + Verb ปกติ (ไม่ต้องใช้ Question Mark หากเป็นประโยคคำถามเดิม)',
  },
  // ── Mini Quiz — Figma 504:12582 (ข้อ 1) + ข้อเดิม 2 ข้อ ──
  {
    type: 'practice',
    heading: 'ลองทำโจทย์เพื่อทบทวนความเข้าใจ',
    practice: {
      questions: [
        {
          sentence: "He said, 'I live here.' ➔ He said he ______ there.",
          options: ['live', 'lives', 'lived'],
          answerIndex: 2,
          explanation:
            'ประโยคตรงเป็น Present Simple (live) เมื่อเล่าต่อต้องถอย tense เป็น Past Simple → "said he lived" (live ไม่ถอย tense และ lives เป็นรูปเอกพจน์)',
        },
        {
          sentence: 'Has the nurse given you any diet advice? — Yes, she told me ____ I put on my plate.',
          options: ['what', 'that', 'whose'],
          answerIndex: 0,
          explanation:
            'คำถามเดิมคือ “ใส่อะไรลงจาน” เป็นคำถามวัตถุ จึงใฉายเป็น what → “she told me what I put on my plate” (that ใช้เมื่อเล่าใจความที่ไม่มีคำถามซ้อน)',
        },
        {
          sentence: 'Has Nok said when I should wait at the station? — Yes. She said she ____ you at platform two at six.',
          options: ['would meet', 'will meet', 'meets'],
          answerIndex: 0,
          explanation:
            'ประโยคเล่าต้องถอย tense จาก will → would → “she said she would meet you”',
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
  console.log(` * #${EXPLAIN_ID} เขียนทับตาม Figma 504:12476 (4 การ์ด + ทริก + quiz 3 ข้อ)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });