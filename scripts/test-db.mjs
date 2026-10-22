#!/usr/bin/env node
/**
 * รันเทสที่ต่อฐานข้อมูลจริง (AI Tutor DB tests)
 *
 * กันไม่ให้รันแบบ "เงียบ ๆ" โดยไม่ได้ตั้ง allowlist:
 * - ไม่มี AI_TUTOR_TEST_DB_HOSTS → หยุดทันที (exit 1) พร้อมบอกวิธีตั้ง
 * - มี → รัน vitest เฉพาะไฟล์เทสที่ต่อ DB
 *
 * หมายเหตุ: เทส DB จริงเขียน/ลบแถวของ "ผู้ใช้ทดสอบ" ที่สร้างขึ้นเองเท่านั้น
 * (ดู src/lib/test-db-guard.ts) — แต่ยังต้องเปิดใช้อย่างจงใจ
 *
 * ใช้: npm run test:db
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

try {
  const dotenv = await import('dotenv');
  dotenv.config({ path: '.env.local' });
  dotenv.config();
} catch {
  // ไม่มี dotenv = ใช้ env ที่มีอยู่แทน
}

const allowedHosts = (process.env.AI_TUTOR_TEST_DB_HOSTS ?? '').trim();

if (!allowedHosts) {
  console.error('✋ ไม่ได้ตั้ง AI_TUTOR_TEST_DB_HOSTS — ไม่รันเทสที่ต่อฐานข้อมูลจริง');
  console.error('   ตั้งใน .env.local (ไฟล์นี้ถูก gitignore) เช่น:');
  console.error('   AI_TUTOR_TEST_DB_HOSTS=<host ของฐานที่ใช้ทดสอบ>');
  process.exit(1);
}

const dbTestFiles = [
  'src/lib/ai-tutor/quota.db.test.ts',
  'src/lib/ai-tutor/retention.test.ts',
  'src/lib/ai-tutor/attempt.db.test.ts',
  'src/app/api/admin/ai-tutor/testers/route.db.test.ts',
  'src/app/api/verb-banks/schema-live.test.ts',
  'src/lib/migration/apply-migration-rollback.db.test.ts',
].filter((file) => existsSync(join(process.cwd(), file)));

if (dbTestFiles.length === 0) {
  console.error('✋ ไม่พบไฟล์เทสที่ต่อฐานข้อมูลจริง');
  process.exit(1);
}

console.log(`▶ รันเทส DB: ${dbTestFiles.length} ไฟล์ (allowlist: ${allowedHosts.split(',').length} host)`);

const child = spawn(
  process.execPath,
  [join('node_modules', 'vitest', 'vitest.mjs'), 'run', ...dbTestFiles],
  { stdio: 'inherit', env: process.env },
);

child.on('exit', (code) => process.exit(code ?? 1));
