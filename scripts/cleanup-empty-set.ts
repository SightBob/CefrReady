import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function cleanup() {
  await db.execute(sql`DELETE FROM test_sets WHERE id = 1`);
  console.log('Deleted empty test set id=1');

  const sets = await db.execute(sql`
    SELECT ts.id, ts.section_id, ts.name,
           COUNT(tsq.question_id) as question_count
    FROM test_sets ts
    LEFT JOIN test_set_questions tsq ON tsq.test_set_id = ts.id
    GROUP BY ts.id, ts.section_id, ts.name
    ORDER BY ts.section_id
  `);
  console.table(sets.rows);
  process.exit(0);
}

cleanup().catch((e) => { console.error(e); process.exit(1); });
