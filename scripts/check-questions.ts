import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function check() {
  const q = await db.execute(sql`SELECT id, test_type_id, question_text, active FROM questions ORDER BY id LIMIT 5`);
  console.log('Questions:', q.rows);

  const ts = await db.execute(sql`SELECT * FROM test_set_questions LIMIT 5`);
  console.log('Junction:', ts.rows);

  const sets = await db.execute(sql`SELECT id, section_id, name FROM test_sets`);
  console.log('Sets:', sets.rows);

  process.exit(0);
}
check().catch((e) => { console.error(e); process.exit(1); });
