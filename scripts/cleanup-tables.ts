import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function cleanupTables() {
  console.log('🧹 Starting database cleanup...');

  try {
    // Drop legacy/unused tables (singular forms and unused tables)
    console.log('🗑️  Dropping legacy tables...');

    const tablesToDrop = [
      'account',              // Old singular (use 'accounts')
      'session',              // Old singular (use 'sessions')
      'user',                 // Old singular (use 'users')
      'verification_token',   // Old singular (use 'verification_tokens')
      'user_answers',         // Not used in current schema
      'test_sessions',        // Not used in current schema
    ];

    for (const table of tablesToDrop) {
      try {
        await db.execute(sql`DROP TABLE IF EXISTS ${sql.identifier(table)} CASCADE`);
        console.log(`   ✅ Dropped: ${table}`);
      } catch (error: any) {
        if (error?.code === '42P01') {
          console.log(`   ⏭️  Skipped (not exists): ${table}`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n📋 Remaining tables:');
    const result = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    for (const row of result.rows) {
      console.log(`   - ${row.table_name}`);
    }

    console.log('\n✨ Cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

cleanupTables()
  .then(() => {
    console.log('🎉 Cleanup finished!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });
