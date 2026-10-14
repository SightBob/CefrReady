/**
 * เขียนทับ Explain #43 (Articles & Determiners) ตาม Figma node 504:12330
 *
 * - 4 การ์ด rule (Indefinite / Definite / Zero Article + คำชี้เฉพาะใกล้-ไกล)
 * - ทริกสำคัญ 1 อัน
 * - Mini Quiz = ข้อ Figma 1 ข้อ + ข้อเดิมที่ตรงการ์ดใหม่ 3 ข้อ
 *
 * รัน:  npx tsx scripts/apply-articles-figma.ts
 * รัน:  npx tsx scripts/apply-articles-figma.ts --apply
 */
import 'dotenv/config';
import { existsSync, writeFileSync } from 'node:fs';
import { db } from '../src/db';
import { testExplains } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const APPLY = process.argv.includes('--apply');
const EXPLAIN_ID = 43;
const ROLLBACK_FILE = 'tmp/explain-43-rollback.json';

const SECTIONS = [
  // ── การ์ด 1 (มีหัวเรื่อง) — Figma 504:12344 ──
  {
    type: 'rule',
    heading: 'Articles & Determiners (การใช้ a, an, the และคำชี้เฉพาะ)',
    description: 'Indefinite Article - นามนับได้เอกพจน์ที่ไม่เจาะจง',
    rows: [{ left: 'A / An (ใช้นำหน้านามนับได้ เอกพจน์ ครั้งแรก)', right: 'I saw ==a== cat and ==an== apple.' }],
  },
  // ── การ์ด 2 — Figma 504:12369 ──
  {
    type: 'rule',
    description: 'Definite Article - นามที่เจาะจง / มีสิ่งเดียว',
    rows: [{ left: 'The (ใช้นำหน้านามที่รู้กัน / เจาะจง / มีหนึ่งเดียว)', right: '==The== sun rises in the east.' }],
  },
  // ── การ์ด 3 — Figma 504:12387 ──
  {
    type: 'rule',
    description: 'Zero Article - ไม่ต้องใช้ Article',
    rows: [{ left: 'No Article (ชื่อเฉพาะ, มื้ออาหาร, กีฬา, นามพหูพจน์ทั่วไป)', right: 'I play ==tennis== on Sundays.' }],
  },
  // ── การ์ด 4 — Figma 504:12406 ──
  {
    type: 'rule',
    description: 'คำชี้เฉพาะใกล้-ไกล',
    rows: [{ left: 'This / That / These / Those (ชี้เฉพาะเจาะจง)', right: '==This== book is mine.' }],
  },
  // ── ทริกสำคัญ — Figma 504:12424 ──
  {
    type: 'importantNote',
    heading: 'ทริกสำคัญ',
    body: 'ใช้ a นำหน้าคำขึ้นต้นด้วยเสียงพยัญชนะ ➔ ใช้ an นำหน้าคำขึ้นต้นด้วยเสียงสระ (a, e, i, o, u) สิ่งที่มีสิ่งเดียวในโลก (sun, moon) หรือพูดถึงซ้ำเป็นครั้งที่สอง ต้องใช้ the เสมอ',
  },
  // ── Mini Quiz — Figma 504:12430 (ข้อ 1) + ข้อเดิมที่ตรงการ์ดใหม่ ──
  {
    type: 'practice',
    heading: 'ลองทำโจทย์เพื่อทบทวนความเข้าใจ',
    practice: {
      questions: [
        {
          sentence: 'She wants to be ______ engineer when she grows up.',
          options: ['a', 'an', 'the'],
          answerIndex: 1,
          explanation:
            'engineer ออกเสียงขึ้นต้นด้วยเสียงสระ “เอ” (engine) จึงต้องใช้ an → “be an engineer” (a ใช้หน้าคำที่ออกเสียงพยัญชนะ และ the ใช้เมื่อระบุชัดว่าคนไหน)',
        },
        {
          sentence: 'This is ______ lovely garden near my house.',
          options: ['a', 'an', 'the'],
          answerIndex: 0,
          explanation:
            'garden เป็นนามนับได้เอกพจน์ที่พูดถึงครั้งแรก และ lovely ออกเสียงพยัญชนะ → "a lovely garden" (an ใช้กับเสียงสระ, the ใช้เมื่อทั้งคู่รู้จักสวนนั้นอยู่แล้ว)',
        },
        {
          sentence: 'I waited for ______ hour before the bus arrived.',
          options: ['a', 'an', 'the'],
          answerIndex: 1,
          explanation:
            'hour ขึ้นต้นด้วยเสียงสระ (อ่านว่า “เอาเวอร์”) จึงต้องใช้ an → "an hour" (ดูเสียงปลายคำ ไม่ใช่ตัว h ที่เป็นตัวอักษร)',
        },
        {
          sentence: "Nobody passed the exam. Honestly, it's ______ surprise to me.",
          options: ['a', 'an', 'no'],
          answerIndex: 2,
          explanation:
            'ความหมายคือ “ไม่แปลกใจเลย” ใช้ no + คำนาม → "no surprise" (a/an ใช้เมื่อพูดถึงของชิ้นที่ยังไม่เคยพูดถึงมาก่อน)',
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
  console.log(` * #${EXPLAIN_ID} เขียนทับตาม Figma 504:12330 (4 การ์ด + ทริก + quiz 4 ข้อ)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });