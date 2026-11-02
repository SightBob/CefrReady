#!/usr/bin/env node
/**
 * Rollback script — คืนค่าแถว questions ที่ถูกเขียนในรอบ 2 พ.ย. 2026
 *
 * ใช้เมื่อ: ต้องการย้อนค่าของ id 1679 (และ 2153 ถ้าถูกเขียนในภายหลัง)
 * แหล่งข้อมูล: docs/qa-backup-2026-11-02.json (ค่าที่บันทึกไว้ "ก่อน" เขียน)
 *
 * วิธีรัน (อ่านให้จบก่อน):
 *   node --env-file=.env docs/qa-rollback-2026-11-02.mjs --dry-run     # ดูว่าจะเขียนอะไร
 *   node --env-file=.env docs/qa-rollback-2026-11-02.mjs --only 1679   # คืนค่าเฉพาะ 1679
 *   node --env-file=.env docs/qa-rollback-2026-11-02.mjs --only 2153   # คืนค่าเฉพาะ 2153
 *
 * กติกา: ไม่ลบแถว ไม่แตะ id อื่น ไม่ใช้ TRUNCATE/DELETE ทุกกรณี
 *       ทุกการเขียนอยู่ใน transaction เดียว และต้องได้ rowCount = 1 ต่อแถว ไม่งั้น ROLLBACK
 */
import fs from 'node:fs';
import { Client } from 'pg';

const BACKUP = 'docs/qa-backup-2026-11-02.json';
const RESTORABLE = [
  'question_text', 'option_a', 'option_b', 'option_c', 'option_d',
  'correct_answer', 'explanation', 'conversation', 'article',
  'cefr_level', 'difficulty', 'active', 'grammar_topic',
];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 ? Number(args[onlyIdx + 1]) : null;

if (!fs.existsSync(BACKUP)) {
  console.error(`ไม่พบไฟล์ backup: ${BACKUP}`);
  process.exit(1);
}
const backup = JSON.parse(fs.readFileSync(BACKUP, 'utf8'));
const targets = backup.questions.filter((q) => (only == null ? true : q.id === only));
if (targets.length === 0) {
  console.error(only ? `ไม่มี id ${only} ใน backup` : 'ไม่มีแถวใน backup');
  process.exit(1);
}

const c = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
await c.connect();
try {
  await c.query('BEGIN');
  for (const row of targets) {
    const sets = RESTORABLE.filter((k) => row[k] !== undefined);
    const assigns = sets.map((k, i) => `${k} = $${i + 2}::${k === 'conversation' || k === 'article' ? 'jsonb' : 'text'}`.replace('$' + (i + 2) + '::text', '$' + (i + 2)));
    const values = [row.id, ...sets.map((k) => (k === 'conversation' || k === 'article' ? JSON.stringify(row[k]) : row[k]))];
    const sql = `update questions set ${assigns.join(', ')}, updated_at = now() where id = $1`;
    if (dryRun) {
      console.log(`[dry-run] id ${row.id}: ${sets.length} คอลัมน์ -> ${sets.join(', ')}`);
      continue;
    }
    const r = await c.query(sql, values);
    if (r.rowCount !== 1) throw new Error(`id ${row.id}: rowCount=${r.rowCount}`);
    console.log(`คืนค่า id ${row.id} สำเร็จ (${sets.length} คอลัมน์)`);
  }
  if (dryRun) await c.query('ROLLBACK');
  else await c.query('COMMIT');
  console.log(dryRun ? 'dry-run จบ (ไม่มีการเขียนจริง)' : 'COMMIT สำเร็จ');
} catch (e) {
  await c.query('ROLLBACK');
  console.error('ROLLBACK:', e.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
