import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function main() {
  console.log('Creating question_reports table...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "question_reports" (
      "id" serial PRIMARY KEY NOT NULL,
      "question_id" integer NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
      "user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
      "issue_type" varchar(50) NOT NULL,
      "comment" text,
      "status" varchar(20) DEFAULT 'pending' NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS "qr_question_idx" ON "question_reports" ("question_id");`);
  await pool.query(`CREATE INDEX IF NOT EXISTS "qr_status_idx" ON "question_reports" ("status");`);
  console.log('✅ question_reports table created successfully!');
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
