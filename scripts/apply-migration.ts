/**
 * scripts/apply-migration.ts — ใช้ migration ไฟล์ .sql ของ drizzle โดยไม่ต้องพึ่ง drizzle-kit
 *
 * ทำไมต้องมี:
 * - `npm run db:migrate` (drizzle-kit migrate) ตายเงียบใน non-TTY ของโปรเจกต์นี้
 * - `drizzle/meta/_journal.json` ถูก gitignore → journal เป็นของเครื่อง (local-only)
 *   → เครื่องอื่นรัน `db:migrate` ก็ไม่รู้จักไฟล์ใหม่อยู่ดี
 * - สคริปต์นี้เขียนแถวลง `drizzle.__drizzle_migrations` ด้วย hash แบบเดียวกับ drizzle-kit
 *   (sha256 ของไฟล์ .sql ดิบ) → ถ้าภายหลังมีคน commit journal แล้วรัน `db:migrate`
 *   drizzle-kit จะข้ามไฟล์ที่ hash ตรงกับที่บันทึกไว้แล้ว (ไม่รันซ้ำ)
 *
 * ─── การป้องกันการรันผิดฐาน ────────────────────────────────────────────────────
 * 1. ค่าเริ่มต้น = dry-run (ไม่แก้ฐานข้อมูล) ต้องใส่ --apply จึงรันจริง
 * 2. พิมพ์ host/port/database/user/branch ของ DATABASE_URL ก่อนทุกครั้ง
 * 3. ต้องใส่ --confirm-host <host> ที่ตรงกับ DATABASE_URL เป๊ะ
 * 4. host ที่อยู่ในบล็อกลิสต์ (env APPLY_MIGRATION_BLOCKED_HOSTS, คั่นด้วย comma)
 *    หรือชื่อที่มีคำว่า prod/production → ปฏิเสธเสมอ
 *    (ทางข้ามอย่างตั้งใจ: --allow-blocked-host + --confirm-host ที่ตรงกัน)
 *    ⚠️ ในโค้ดนี้ไม่มี host ของ production ฮาร์ดโค้ดไว้ — ให้ตั้งค่า env เองตามสภาพแวดล้อม
 *
 * ─── วิธีใช้ ─────────────────────────────────────────────────────────────────
 *   npx tsx scripts/apply-migration.ts                              # dry-run: ดูว่าจะรันอะไร
 *   npx tsx scripts/apply-migration.ts --from 45 --apply --confirm-host <host>   # รันตั้งแต่เลข 45
 *   npx tsx scripts/apply-migration.ts drizzle/0049_x.sql --apply --confirm-host <host>  # ไฟล์เฉพาะ
 *
 * ตัวเลือก:
 *   --apply                รันจริง (ไม่ใส่ = dry-run)
 *   --confirm-host <h>     ต้องตรงกับ host ใน DATABASE_URL เป๊ะ (กันรันผิดฐาน)
 *   --allow-blocked-host   ยอมรัน host ที่อยู่ในบล็อกลิสต์ (ต้องมี --confirm-host ตรงกัน)
 *   --from <n>             เริ่มจาก migration เลข n (ข้ามไฟล์ที่เลขน้อยกว่า)
 *   --force                (กำลังไว้สำหรับอนาคต)
 *
 * ─── วิธีรันบน production (กรณีที่จำเป็นจริง ๆ) ───────────────────────────────
 * 1. ตั้ง DATABASE_URL ให้ชี้ฐาน production (ห้ามสลับไป branch อื่นระหว่างรัน)
 * 2. ตั้ง APPLY_MIGRATION_BLOCKED_HOSTS ให้มี host ของ production (คั่นด้วย comma)
 *    เพื่อให้สคริปต์บล็อกไว้แม้ไม่ได้ตั้งใจ
 * 3. สำรองฐานข้อมูลก่อน (Neon: สร้าง branch สำรองจาก production ไว้ 1 ตัว)
 * 4. รัน dry-run ก่อนเพื่อดูแผน:
 *      npx tsx scripts/apply-migration.ts --from <เลขไฟล์แรกที่จะรัน>
 * 5. ถ้าต้องรันจริงบน production ให้ใส่ทั้งสองธง (ยืนยันชัดเจนว่าตั้งใจ):
 *      npx tsx scripts/apply-migration.ts --from <เลข> --apply \
 *        --allow-blocked-host --confirm-host <host ของ production>
 *    (สคริปต์จะพิมพ์ชื่อ host ที่กำลังจะรันซ้ำอีกครั้งก่อนลงมือ)
 * 6. ตรวจผลหลังรัน: ดูว่าไฟล์ถูกข้ามเมื่อรันซ้ำ และแถวใน drizzle.__drizzle_migrations ถูกเพิ่ม
 * 7. ถ้าต้องย้อนกลับ: DROP TABLE/ALTER TABLE ... DROP COLUMN ตามไฟล์ .sql ที่เกี่ยวข้อง
 *    (ทุกไฟล์ของโปรเจกต์นี้เป็นแบบ "เพิ่มอย่างเดียว" → ย้อนกลับได้ด้วย DROP)
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
  parseBlockedHosts,
  resolveWhen,
  splitStatements,
} from '../src/lib/migration/apply-core';

const JOURNAL_PATH = join(process.cwd(), 'drizzle/meta/_journal.json');

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
  const blockedList = parseBlockedHosts(process.env.APPLY_MIGRATION_BLOCKED_HOSTS);

  // ─── พิมพ์เป้าหมายก่อนเสมอ (ทุกครั้ง ไม่ว่าจะ dry-run หรือรันจริง) ───
  console.log('─── เป้าหมาย ───');
  console.log(`host      : ${target.host}`);
  console.log(`port      : ${target.port}`);
  console.log(`database  : ${target.database}`);
  console.log(`user      : ${target.user}`);
  console.log(`branch    : ${target.branchHint} (ป้ายกำกับจากชื่อ host)`);
  console.log(`โหมด      : ${args.apply ? 'รันจริง (--apply)' : 'dry-run (ไม่แก้ฐานข้อมูล)'}`);
  console.log(`บล็อกลิสต์: ${blockedList.length > 0 ? blockedList.join(', ') : '(ไม่ได้ตั้งไว้ใน env)'}`);

  const blocked = isBlockedHost(target.host, blockedList);
  if (blocked && !args.allowBlockedHost) {
    console.error(`\n🚫 host นี้ (${target.host}) อยู่ในบล็อกลิสต์ — โดยค่าเริ่มต้นห้ามรัน`);
    console.error('   ถ้าตั้งใจรันจริง ให้ใส่ --allow-blocked-host พร้อมกับ --confirm-host ที่ตรงกัน');
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
    if (blocked) {
      // ทางข้ามอย่างตั้งใจ — ยืนยันอีกครั้งด้วยชื่อ host
      console.log(`\n⚠️  คุณสั่ง --allow-blocked-host — จะรันกับ host ที่ถูกบล็อก: ${target.host}`);
      console.log(`    (ยืนยันด้วย --confirm-host ที่ตรงกันแล้ว)`);
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
