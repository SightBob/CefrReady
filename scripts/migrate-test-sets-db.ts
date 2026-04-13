import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Starting migration...');

  // 1. Create test_sets table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS test_sets (
      id SERIAL PRIMARY KEY,
      section_id VARCHAR(50) NOT NULL REFERENCES test_types(id),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      order_index INTEGER DEFAULT 0 NOT NULL,
      is_active BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('Created test_sets');

  // 2. Create test_set_questions table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS test_set_questions (
      id SERIAL PRIMARY KEY,
      test_set_id INTEGER NOT NULL REFERENCES test_sets(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      order_index INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  console.log('Created test_set_questions');

  // 3. Add test_set_id column to test_attempts if missing
  const cols = await db.execute(sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'test_attempts' AND column_name = 'test_set_id'
  `);
  if (cols.rows.length === 0) {
    await db.execute(sql`
      ALTER TABLE test_attempts ADD COLUMN test_set_id INTEGER REFERENCES test_sets(id) ON DELETE SET NULL
    `);
    console.log('Added test_set_id to test_attempts');
  } else {
    console.log('test_set_id already exists in test_attempts');
  }

  // 4. Create indexes
  await db.execute(sql.raw('CREATE INDEX IF NOT EXISTS test_sets_section_idx ON test_sets(section_id)'));
  await db.execute(sql.raw('CREATE INDEX IF NOT EXISTS test_sets_order_idx ON test_sets(section_id, order_index)'));
  await db.execute(sql.raw('CREATE INDEX IF NOT EXISTS tsq_set_idx ON test_set_questions(test_set_id)'));
  await db.execute(sql.raw('CREATE INDEX IF NOT EXISTS tsq_unique ON test_set_questions(test_set_id, question_id)'));
  await db.execute(sql.raw('CREATE INDEX IF NOT EXISTS test_attempts_set_idx ON test_attempts(test_set_id)'));
  console.log('Created indexes');

  console.log('Migration complete!');
  process.exit(0);
}

migrate().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
