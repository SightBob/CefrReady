import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

/**
 * Updates descriptions for Focus on Form test sets, ordered by order_index.
 */
const DESCRIPTIONS = [
  'Present Simple, คำถาม-ปฏิเสธ, There is/are, คำศัพท์ที่ใช้บ่อย',
  'บุพบทสถานที่/เวลา (in/on/at), คำเชื่อม, Phrasal Verbs พื้นฐาน',
  'some/any/a lot of, คำคำถาม, Adverbs บอกความถี่-ระดับ',
  'เปรียบเทียบขั้นกว่า-สุด, คำเชื่อม, Modal Verbs (ขอร้อง/แนะนำ/คาดเดา)',
  'สรรพนามทุกประเภท, กริยาให้สอดคล้องประธาน',
  'Past Simple, Past Perfect, Future, Present Perfect',
  'Passive อดีต, First Conditional, Reported Speech, Tag Questions',
  'Verb Patterns ขั้นสูง, Phrasal Verbs, Second Conditional, Subjunctive (B1)',
];

async function updateDescriptions() {
  const sets = await db.execute(sql`
    SELECT id, name FROM test_sets
    WHERE section_id = 'focus-form'
    ORDER BY order_index
  `);

  const rows = sets.rows as Array<{ id: number; name: string }>;
  console.log(`Found ${rows.length} focus-form sets\n`);

  for (let i = 0; i < rows.length; i++) {
    const description = DESCRIPTIONS[i];
    if (!description) {
      console.log(`  Skipping ${rows[i].name} (id=${rows[i].id}) — no description mapped`);
      continue;
    }
    await db.execute(sql`
      UPDATE test_sets SET description = ${description}
      WHERE id = ${rows[i].id}
    `);
    console.log(`  ${rows[i].name} (id=${rows[i].id}) → ${description}`);
  }

  console.log('\nDone');
  process.exit(0);
}

updateDescriptions().catch((err) => {
  console.error(err);
  process.exit(1);
});
