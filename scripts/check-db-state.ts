import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function check() {
  // 1. Test types
  const types = await db.execute(sql`SELECT id, name, active FROM test_types ORDER BY id`);
  console.log('=== TEST TYPES ===');
  console.table(types.rows);

  // 2. Questions per type
  const qCount = await db.execute(sql`
    SELECT test_type_id, COUNT(*) as count, COUNT(*) FILTER (WHERE active = 'true') as active_count
    FROM questions GROUP BY test_type_id ORDER BY test_type_id
  `);
  console.log('\n=== QUESTIONS PER TYPE ===');
  console.table(qCount.rows);

  // 3. Test sets
  const sets = await db.execute(sql`SELECT * FROM test_sets`);
  console.log('\n=== TEST SETS ===');
  console.table(sets.rows);

  // 4. Test set questions
  const tsq = await db.execute(sql`SELECT COUNT(*) as count FROM test_set_questions`);
  console.log('\n=== TEST SET QUESTIONS ===');
  console.table(tsq.rows);

  // 5. Sample questions per type
  for (const row of types.rows as any[]) {
    const samples = await db.execute(sql`
      SELECT id, question_text, correct_answer, active
      FROM questions WHERE test_type_id = ${row.id}
      ORDER BY id LIMIT 3
    `);
    console.log(`\n=== SAMPLE QUESTIONS: ${row.id} ===`);
    console.table(samples.rows);
  }

  process.exit(0);
}

check().catch((e) => { console.error(e); process.exit(1); });
