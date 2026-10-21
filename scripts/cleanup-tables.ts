import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import { checkScriptWriteGuards, extractScriptFlags } from '../src/lib/ai-tutor/script-guard';

/**
 * ล้างตารางเก่าที่ไม่ได้ใช้แล้ว (account / session / user / verification_token)
 *
 * ⚠️ ค่าเริ่มต้ม = dry-run (ไม่ลบอะไร) → ต้องใส่ --apply --confirm-host <host ของ DATABASE_URL>
 * และ host ที่อยู่ในบล็อกลิสต์ (APPLY_MIGRATION_BLOCKED_HOSTS) จะถูกปฏิเสธ
 */
async function cleanupTables() {
  // ─── กันรันผิดฐาน ───
  const { apply, confirmHost } = extractScriptFlags(process.argv.slice(2));
  const guard = checkScriptWriteGuards({
    apply,
    confirmHost,
    databaseUrl: process.env.DATABASE_URL,
    blockedHosts: process.env.APPLY_MIGRATION_BLOCKED_HOSTS,
  });
  if (!guard.ok) {
    console.error(guard.message);
    process.exit(1);
  }

  // Drop legacy/unused tables (singular forms and unused tables)
  const tablesToDrop = [
    'account',              // Old singular (use 'accounts')
    'session',              // Old singular (use 'sessions')
    'user',                 // Old singular (use 'users')
    'verification_token',   // Old singular (use 'verification_tokens')
  ];

  console.log('🧹 Database cleanup');
  console.log(`host      : ${guard.host}`);
  console.log(`โหมด      : ${guard.dryRun ? 'dry-run (ไม่ลบอะไร)' : 'ลบจริง'}`);
  console.log('ตารางที่จะลบ:');
  for (const table of tablesToDrop) console.log(`   - ${table}`);

  if (guard.dryRun) {
    console.log('\nยังไม่ได้ลบอะไร — ใส่ --apply --confirm-host <host> เพื่อลบจริง');
    process.exit(0);
  }

  try {
    console.log('\n🗑️  Dropping legacy tables...');

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
