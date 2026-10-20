/**
 * scripts/apply-migration.ts — ใช้ migration ไฟล์ .sql ของ drizzle โดยไม่ต้องพึ่ง drizzle-kit
 *
 * ทำไมต้องมี:
 * - `npm run db:migrate` (drizzle-kit migrate) ตายเงียบใน non-TTY ของโปรเจกต์นี้
 * - `drizzle/meta/_journal.json` ถูก gitignore → journal เป็นของเครื่อง (local-only)
 *   → เครื่องอื่นรัน `db:migrate` ก็ไม่รู้จักไฟล์ 0045–0048 อยู่ดี
 * - สคริปต์นี้เขียนแถวลง `drizzle.__drizzle_migrations` ด้วย hash แบบเดียวกับ drizzle-kit
 *   (sha256 ของไฟล์ .sql ดิบ) → ถ้าภายหลังมีคน commit journal แล้วรัน `db:migrate`
 *   drizzle-kit จะข้ามไฟล์ที่ hash ตรงกับที่บันทึกไว้แล้ว (ไม่รันซ้ำ)
 *
 * ⚠️ ห้ามรันกับ production — สคริปต์จะปฏิเสธ host ที่มีคำว่า prod/production
 *    และบังคับให้ยืนยันด้วย --confirm-host <host> ที่ตรงกับ DATABASE_URL เท่านั้น
 *
 * วิธีใช้:
 *   npx tsx scripts/apply-migration.ts                              # dry-run: ดูว่าจะรันอะไร
 *   npx tsx scripts/apply-migration.ts --apply --confirm-host <host>  # รันจริง (ทุกไฟล์ที่ค้าง)
 *   npx tsx scripts/apply-migration.ts --from 45 --apply --confirm-host <host>  # รันตั้งแต่เลข 45 ขึ้นไป
 *   npx tsx scripts/apply-migration.ts drizzle/0048_ai_tutor_settings.sql --apply --confirm-host <host>
 *
 * ตัวเลือก:
 *   --apply              รันจริง (ไม่ใส่ = dry-run อย่างเดียว)
 *   --confirm-host <h>   ต้องตรงกับ host ใน DATABASE_URL เป๊ะ (กันรันผิดฐาน)
 *   --from <n>           เริ่มจาก migration เลข n (ข้ามไฟล์ที่เลขน้อยกว่า)
 *   --force              ข้ามการยืนยันแบบ interactive (ต้องมี --confirm-host อยู่แล้ว)
 *
 * ตัวอย่าง host ของ Neon branch: ep-abc-def-pooler.ap-southeast-1.aws.neon.tech
 *   → คัดลอกค่าในช่อง "host" ที่สคริปต์พิมพ์ออกมา มาใส่เป็น --confirm-host
 *
 * หมายเหตุเรื่องลำดับ: ไฟล์ .sql ทั้งหมดเป็นแบบ "เพิ่มอย่างเดียว" (CREATE TABLE IF NOT EXISTS /
 * ADD COLUMN) → รันซ้ำได้ แต่สคริปต์นี้ข้ามไฟล์ที่บันทึก hash ไว้แล้วอยู่แล้ว
 */
import 'dotenv/config';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { sql } from 'drizzle-orm';

import { db } from '../src/db';
import {
  describeTarget,
  isBlockedHost,
  listMigrationFiles,
  migrationNumber,
  parseArgs,
  resolveWhen,
  splitStatements,
} from '../src/lib/migration/apply-core';

const JOURNAL_PATH = join(process.cwd(), 'drizzle/meta/_journal.json');

function blockedHostsFromEnv(): string[] {
  return (process.env.MIGRATION_BLOCKED_HOSTS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

async function ensureMigrationsTable() {
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )`,
  );
}

async function appliedHashes(): Promise<Set<string>> {
  const rows = await db.execute(sql`SELECT hash FROM drizzle.__drizzle_migrations`);
  return new Set((rows.rows as Array<{ hash: string }>).map((row) => row.hash));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const rawUrl = process.env.DATABASE_URL?.trim();
  if (!rawUrl) {
    console.error('ไม่พบ DATABASE_URL — ตั้งค่าใน .env หรือส่งเป็น environment variable');
    process.exit(1);
  }

  const target = describeTarget(rawUrl);

  // ─── พิมพ์เป้าหมายก่อนเสมอ (ทุกครั้ง ไม่ว่าจะ dry-run หรือรันจริง) ───
  console.log('─── เป้าหมาย ───');
  console.log(`host      : ${target.host}`);
  console.log(`port      : ${target.port}`);
  console.log(`database  : ${target.database}`);
  console.log(`user      : ${target.user}`);
  console.log(`branch    : ${target.branchHint} (ป้ายกำกับจากชื่อ host)`);
  console.log(`โหมด      : ${args.apply ? 'รันจริง (--apply)' : 'dry-run (ไม่แก้ฐานข้อมูล)'}`);

  if (isBlockedHost(target.host, blockedHostsFromEnv())) {
    console.error(`\n🚫 ปฏิเสธ host นี้ (${target.host}) — ห้ามรัน migration กับ production`);
    console.error('   ถ้าจำเป็นต้องแก้ MIGRATION_BLOCKED_HOSTS ใน environment ของคุณเอง');
    process.exit(1);
  }

  if (args.apply) {
    if (!args.confirmHost) {
      console.error('\n🚫 ขาด --confirm-host — ต้องยืนยันว่า host ถูกต้อง (คัดลอกจากข้างบน)');
      console.error(`   ตัวอย่าง: --confirm-host ${target.host}`);
      process.exit(1);
    }
    if (args.confirmHost.trim().toLowerCase() !== target.host.toLowerCase()) {
      console.error('\n🚫 --confirm-host ไม่ตรงกับ DATABASE_URL');
      console.error(`   ยืนยัน: ${args.confirmHost}`);
      console.error(`   จริง  : ${target.host}`);
      process.exit(1);
    }
    console.log(`\nยืนยันแล้ว: จะรันกับ ${target.host}`);
  }

  const drizzleDir = join(process.cwd(), 'drizzle');
  let candidates = args.files.length > 0
    ? args.files.map((file) => resolve(process.cwd(), file))
    : listMigrationFiles(drizzleDir);

  if (args.from !== null) {
    candidates = candidates.filter((file) => migrationNumber(file) >= args.from!);
  }
  candidates = candidates.sort((a, b) => migrationNumber(a) - migrationNumber(b));

  if (candidates.length === 0) {
    console.log('\nไม่พบไฟล์ migration ที่จะรัน');
    process.exit(0);
  }

  await ensureMigrationsTable();
  const done = await appliedHashes();

  const pending = candidates.filter((file) => {
    const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
    return !done.has(hash);
  });

  console.log('\n─── แผน ───');
  console.log(`ไฟล์ทั้งหมด : ${candidates.length}`);
  console.log(`รอรัน      : ${pending.length}`);
  for (const file of candidates) {
    const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
    const mark = done.has(hash) ? 'ข้าม (บันทึกไว้แล้ว)' : 'รอรัน';
    console.log(`  [${mark}] ${file.replace(`${process.cwd()}\\`, '')}  (${hash.slice(0, 12)})`);
  }

  if (!args.apply) {
    console.log('\nยังไม่ได้รัน (dry-run) — ใส่ --apply --confirm-host <host> เพื่อรันจริง');
    process.exit(0);
  }

  if (pending.length === 0) {
    console.log('\nไม่มีไฟล์ที่ต้องรัน');
    process.exit(0);
  }

  console.log('\n─── กำลังรัน ───');
  for (const file of pending) {
    const raw = readFileSync(file);
    const hash = createHash('sha256').update(raw).digest('hex');
    const statements = splitStatements(raw.toString('utf8'));
    const when = resolveWhen(file, JOURNAL_PATH);

    try {
      await db.transaction(async (tx) => {
        for (const statement of statements) {
          await tx.execute(sql.raw(statement));
        }
        await tx.execute(
          sql`INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at") VALUES (${hash}, ${when})`,
        );
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ ล้มเหลวที่ไฟล์ ${file} — ยกเลิกทั้งธุรกรรม (ไฟล์ก่อนหน้าที่รันแล้วคงอยู่)`);
      console.error(`   ${message.slice(0, 300)}`);
      process.exit(1);
    }

    console.log(`✅ ${file.replace(`${process.cwd()}\\`, '')} (${statements.length} statement, hash ${hash.slice(0, 12)})`);
  }

  console.log('\nเสร็จแล้ว — ถ้าภายหลังมีคน commit drizzle/meta/_journal.json แล้วรัน `npm run db:migrate`');
  console.log('drizzle-kit จะข้ามไฟล์เหล่านี้เอง เพราะ hash ตรงกับที่บันทึกไว้');
  process.exit(0);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n❌ ล้มเหลว: ${message.slice(0, 400)}`);
  process.exit(1);
});
