import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function addExtendedSchema() {
  console.log('🔧 Adding extended schema fields to questions table...\n');

  try {
    // Add new columns to questions table
    await db.execute(sql`
      ALTER TABLE questions
      ADD COLUMN IF NOT EXISTS conversation JSONB,
      ADD COLUMN IF NOT EXISTS audio_url TEXT,
      ADD COLUMN IF NOT EXISTS transcript TEXT,
      ADD COLUMN IF NOT EXISTS article JSONB;
    `);

    console.log('✅ Added new columns:');
    console.log('   - conversation (JSONB)');
    console.log('   - audio_url (TEXT)');
    console.log('   - transcript (TEXT)');
    console.log('   - article (JSONB)');

    // Verify the columns exist
    const result = await db.execute(sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'questions'
      AND column_name IN ('conversation', 'audio_url', 'transcript', 'article')
      ORDER BY column_name;
    `);

    console.log('\n📊 Verification results:');
    for (const row of result.rows) {
      console.log(`   ${row.column_name}: ${row.data_type}`);
    }

    console.log('\n✨ Extended schema migration completed successfully!');
  } catch (error) {
    console.error('❌ Error adding extended schema:', error);
    throw error;
  }
}

addExtendedSchema()
  .then(() => {
    console.log('\n🎉 Migration finished!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });