// scripts/add-flashcards-table.js
// รัน: node scripts/add-flashcards-table.js

const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Creating flashcards table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS flashcards (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        term TEXT NOT NULL,
        context_sentence TEXT,
        source_type VARCHAR(20),
        source_id INTEGER,
        user_meaning TEXT,
        dict_data JSONB,
        status VARCHAR(20) NOT NULL DEFAULT 'new',
        review_count INTEGER NOT NULL DEFAULT 0,
        last_reviewed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS flashcards_user_idx ON flashcards(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS flashcards_status_idx ON flashcards(user_id, status);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS flashcards_term_idx ON flashcards(user_id, term);
    `);

    console.log('✅ flashcards table created successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
