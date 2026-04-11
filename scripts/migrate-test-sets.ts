/**
 * Migration script: Add test_sets and test_set_questions tables,
 * and add test_set_id column to test_attempts.
 * 
 * Run: npx tsx scripts/migrate-test-sets.ts
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool);

async function migrate() {
  console.log('Running test_sets migration...');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS test_sets (
      id SERIAL PRIMARY KEY,
      section_id VARCHAR(50) NOT NULL REFERENCES test_types(id),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log('✓ test_sets table created');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS test_set_questions (
      id SERIAL PRIMARY KEY,
      test_set_id INTEGER NOT NULL REFERENCES test_sets(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log('✓ test_set_questions table created');

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS test_sets_section_idx ON test_sets(section_id);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS test_sets_order_idx ON test_sets(section_id, order_index);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS tsq_set_idx ON test_set_questions(test_set_id);
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS tsq_unique ON test_set_questions(test_set_id, question_id);
  `);
  console.log('✓ indexes created');

  // Add test_set_id to test_attempts (nullable — backward compatible)
  await db.execute(sql`
    ALTER TABLE test_attempts
    ADD COLUMN IF NOT EXISTS test_set_id INTEGER REFERENCES test_sets(id) ON DELETE SET NULL;
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS test_attempts_set_idx ON test_attempts(test_set_id);
  `);
  console.log('✓ test_set_id column added to test_attempts');

  console.log('\n✅ Migration complete!');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
