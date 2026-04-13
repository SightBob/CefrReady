import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

/**
 * Creates one test set per test type containing all existing active questions.
 * Run once to populate test_sets + test_set_questions from current data.
 */
async function seedTestSets() {
  console.log('Seeding test sets...\n');

  const types = await db.execute(sql`
    SELECT id, name FROM test_types WHERE active = 'true' ORDER BY id
  `);

  for (const type of types.rows as any[]) {
    // Get active questions for this type
    const questions = await db.execute(sql`
      SELECT id FROM questions
      WHERE test_type_id = ${type.id} AND active = 'true'
      ORDER BY id
    `);

    if (questions.rows.length === 0) {
      console.log(`  ${type.id}: no active questions, skipping`);
      continue;
    }

    const count = (questions.rows as any[]).length;

    // Create test set
    const created = await db.execute(sql`
      INSERT INTO test_sets (section_id, name, description, order_index, is_active)
      VALUES (${type.id}, ${`Set 1 — All Questions`}, ${`${count} questions for ${type.name}`}, 0, true)
      RETURNING id, name
    `);
    const setId = (created.rows[0] as any).id;
    console.log(`  Created: ${(created.rows[0] as any).name} (id=${setId}) for ${type.id} — ${count} questions`);

    // Link questions to set
    for (let i = 0; i < questions.rows.length; i++) {
      const qId = (questions.rows as any[])[i].id;
      await db.execute(sql`
        INSERT INTO test_set_questions (test_set_id, question_id, order_index)
        VALUES (${setId}, ${qId}, ${i})
      `);
    }
  }

  // Verify
  const sets = await db.execute(sql`
    SELECT ts.id, ts.section_id, ts.name,
           COUNT(tsq.question_id) as question_count
    FROM test_sets ts
    LEFT JOIN test_set_questions tsq ON tsq.test_set_id = ts.id
    GROUP BY ts.id, ts.section_id, ts.name
    ORDER BY ts.section_id
  `);
  console.log('\n=== RESULT ===');
  console.table(sets.rows);

  console.log('\nDone!');
  process.exit(0);
}

seedTestSets().catch((e) => { console.error(e); process.exit(1); });
