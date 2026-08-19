import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const fk = await pool.query(`
    SELECT conname, confdeltype, confupdtype
    FROM pg_constraint
    WHERE conrelid = 'test_set_questions'::regclass AND contype = 'f'
  `);
  console.log('FK constraints on test_set_questions (c=cascade, a=no action, r=restrict):');
  console.table(fk.rows);

  const counts = await pool.query(`
    SELECT ts.id, ts.name, ts.is_active,
           (SELECT count(*) FROM test_set_questions q WHERE q.test_set_id = ts.id) AS question_count
    FROM test_sets ts
    ORDER BY ts.id
  `);
  console.log('Test sets with question counts:');
  console.table(counts.rows);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
