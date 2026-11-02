/**
 * docs/qa-rollback-stats-cutoff-2026-11-02.mjs
 *
 * ย้อนสิ่งที่ทำในรอบ "fix(admin): นับสถิติรายข้อเฉพาะคำตอบหลังโจทย์ถูกแก้" (commit e30e8a6)
 *
 *   ระยะที่ 1: SET questions.stats_cutoff_at = NULL สำหรับ id 1679 และ 2153
 *              → สถิติกลับไปนับคำตอบทุกแถวเหมือนก่อนแก้ (ค่าเริ่มต้นของฟีเจอร์)
 *   ระยะที่ 2 (แยกคำสั่ง, ทำหลังระยะที่ 1): DROP COLUMN questions.stats_cutoff_at
 *              → ย้อน migration 0051 ทั้งหมด (โค้ดที่อ้างคอลัมน์จะหยุดทำงาน → rollback โค้ดด้วย)
 *
 * ค่าเริ่มต้น = dry-run (อ่านอย่างเดียว) ต้องใส่ --apply จึงเขียนจริง
 *
 * วิธีใช้:
 *   node --env-file=.env docs/qa-rollback-stats-cutoff-2026-11-02.mjs
 *   node --env-file=.env docs/qa-rollback-stats-cutoff-2026-11-02.mjs --apply
 *   node --env-file=.env docs/qa-rollback-stats-cutoff-2026-11-02.mjs --apply --drop-column --confirm-drop 0051
 *
 * หลักความปลอดภัย: ไม่ลบแถวใด ๆ, UPDATE จำกัด WHERE id = ... และต้องได้ rowCount = 1 ต่อแถว
 * ถ้าไม่ตรง → ROLLBACK ทั้ง transaction
 */
import { Client } from 'pg';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const dropColumn = args.includes('--drop-column');
const confirmDrop = args.indexOf('--confirm-drop') >= 0 ? args[args.indexOf('--confirm-drop') + 1] : null;
const TARGET_IDS = [1679, 2153];

if (dropColumn && confirmDrop !== '0051') {
  console.error('🚫 --drop-column ต้องมาคู่กับ --confirm-drop 0051');
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
await client.connect();

const host = (() => { try { return new URL(process.env.DATABASE_URL).host; } catch { return '(อ่านไม่ได้)'; } })();
console.log('─── เป้าหมาย ───');
console.log(`host : ${host}`);
console.log(`โหมด : ${apply ? 'รันจริง (--apply)' : 'dry-run (อ่านอย่างเดียว)'}${dropColumn ? ' + DROP COLUMN' : ''}`);

const col = await client.query(
  "select count(*)::int n from information_schema.columns where table_name='questions' and column_name='stats_cutoff_at'",
);
const hasColumn = col.rows[0].n === 1;
console.log(`คอลัมน์ stats_cutoff_at : ${hasColumn ? 'มี' : 'ไม่มี'}`);

let current = [];
if (hasColumn) {
  current = (await client.query(
    'select id, stats_cutoff_at::text cut, updated_at::text upd from questions where id = ANY($1::int[]) order by id',
    [TARGET_IDS],
  )).rows;
  console.log('ค่าปัจจุบัน:', JSON.stringify(current));
}

if (!apply) {
  console.log('\nยังไม่ได้ทำอะไร (dry-run) — ใส่ --apply เพื่อตั้งค่ากลับเป็น NULL');
  await client.end();
  process.exit(0);
}

// ── ระยะที่ 1: SET NULL เฉพาะสองแถว ──────────────────────────────────────────
if (hasColumn) {
  await client.query('BEGIN');
  try {
    for (const id of TARGET_IDS) {
      const r = await client.query('update questions set stats_cutoff_at = null where id = $1', [id]);
      if (r.rowCount !== 1) throw new Error(`id ${id}: rowCount = ${r.rowCount}`);
      console.log(`✅ id ${id}: stats_cutoff_at = NULL (rowCount = ${r.rowCount})`);
    }
    const left = (await client.query(
      'select count(*)::int n from questions where stats_cutoff_at is not null',
    )).rows[0].n;
    if (left !== 0) throw new Error(`ยังมีแถวที่ cutoff ไม่ใช่ NULL อีก ${left} แถว — คาดว่า 0`);
    await client.query('COMMIT');
    console.log('COMMIT — cutoff ของ 1679/2153 กลับเป็น NULL แล้ว (สถิติกลับไปนับทุกคำตอบ)');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ ROLLBACK:', error.message);
    process.exitCode = 1;
  }
}

// ── ระยะที่ 2: DROP COLUMN (ต้องสั่งชัดเจน) ──────────────────────────────────
if (dropColumn) {
  const stillSet = (await client.query(
    'select count(*)::int n from questions where stats_cutoff_at is not null',
  )).rows[0].n;
  if (stillSet !== 0) {
    console.error(`🚫 ยังมี ${stillSet} แถวที่ cutoff ไม่ใช่ NULL — ตั้ง NULL ให้หมดก่อน drop`);
    process.exitCode = 1;
  } else {
    await client.query('BEGIN');
    try {
      await client.query('ALTER TABLE "questions" DROP COLUMN IF EXISTS "stats_cutoff_at"');
      await client.query('COMMIT');
      console.log('✅ DROP COLUMN questions.stats_cutoff_at สำเร็จ — ต้อง rollback โค้ด (commit e30e8a6) ด้วย');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ ROLLBACK drop:', error.message);
      process.exitCode = 1;
    }
  }
}

await client.end();
