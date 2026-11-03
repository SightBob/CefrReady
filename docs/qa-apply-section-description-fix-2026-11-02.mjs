/**
 * แก้คำอธิบายหมวดข้อสอบ (test_types.description) ที่ยกชื่อหมวดอื่นมาขึ้นต้น
 *
 * ปัญหา: การ์ดบน /tests แสดง
 *   Form & Meaning → "Focus on Meaning - เน้นจำคำศัพท์และความหมายตามสถานการณ์จริง"
 *   Listening      → "Listening - ฝึกสกิลฟังจากบทสนทนาและเสียงพูดต่างๆ"
 * คำอธิบายควรพูดถึงเนื้อหาของหมวดตัวเอง ไม่ใช่ทวนชื่อหมวดซ้ำ/ยกชื่อหมวดอื่นมา
 *
 *   node --env-file=.env docs/qa-apply-section-description-fix-2026-11-02.mjs            # dry-run
 *   node --env-file=.env docs/qa-apply-section-description-fix-2026-11-02.mjs --apply    # เขียนจริง + backup
 */
import { writeFile } from 'node:fs/promises';
import { Client } from 'pg';

const APPLY = process.argv.includes('--apply');
const BACKUP = 'docs/qa-backup-section-description-fix-2026-11-02.json';

/** @type {Array<{id:string, after:string, note:string}>} */
const FIXES = [
  {
    id: 'form-meaning',
    after: 'เน้นจำคำศัพท์และความหมายตามสถานการณ์จริง',
    note: 'ตัดคำนำ "Focus on Meaning - " ที่ยกชื่ออีกหมวดมาขึ้นต้น',
  },
  {
    id: 'listening',
    after: 'ฝึกสกิลฟังจากบทสนทนาและเสียงพูดต่างๆ',
    note: 'ตัดคำนำ "Listening - " ที่ทวนชื่อหมวดซ้ำกับการ์ด',
  },
];

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const backup = [];
let totalRows = 0;

for (const fix of FIXES) {
  const { rows } = await client.query(
    'select id, name, description from test_types where id = $1',
    [fix.id],
  );
  const before = rows[0];
  if (!before) {
    console.log(`✗ ${fix.id}: not found`);
    continue;
  }
  backup.push({ id: fix.id, before });

  console.log(`\n== ${fix.id} — ${fix.note}`);
  console.log(`   before: ${JSON.stringify(before.description)}`);
  console.log(`   after : ${JSON.stringify(fix.after)}`);

  if (before.description === fix.after) {
    console.log('   (ตรงกันแล้ว ไม่ต้องแก้)');
    continue;
  }

  if (APPLY) {
    const res = await client.query(
      'update test_types set description = $2, updated_at = now() where id = $1',
      [fix.id, fix.after],
    );
    console.log(`   → rowCount ${res.rowCount}`);
    totalRows += res.rowCount ?? 0;
  }
}

if (APPLY) {
  await writeFile(BACKUP, JSON.stringify({ appliedAt: new Date().toISOString(), rows: backup }, null, 2));
  console.log(`\nbackup → ${BACKUP}`);
  console.log(`rows updated: ${totalRows} (คาดหวัง ${FIXES.length})`);
  if (totalRows !== FIXES.length) process.exitCode = 1;
} else {
  console.log('\n(dry-run) ยังไม่เขียนข้อมูล — ใส่ --apply เพื่อเขียนจริง');
}

await client.end();
