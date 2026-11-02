/**
 * เติม option_d ให้ focus-meaning ที่ยังเป็น NULL/ว่าง (23 ข้อ)
 * ร่างใหม่รอบนี้ อนุมัติ 2 พ.ย. 2026 — ต่อจากรอบ '—' 25 ข้อ
 *
 * ความปลอดภัย: dry-run เป็นค่าเริ่มต้น · UPDATE ต่อแถวด้วย WHERE option_d ว่าง + correct_answer เดิม
 * · rowCount ต้องเป็น 1 · ไม่แตะ correct_answer / question_text / stats_cutoff_at
 *
 * ใช้: node --env-file=.env docs/qa-apply-option-d-null-2026-11-02.mjs [--apply]
 */
import fs from 'node:fs';
import { Client } from 'pg';

const DRAFTS = {
  1452: 'He has been ill all week.',
  1577: 'He does not like apples.',
  1615: 'At an airport.',
  1616: 'A new school bag.',
  1617: 'Meeting her teacher.',
  1618: 'Steve should shorten his vacation.',
  1641: 'Do his homework.',
  1642: 'Cleaning the kitchen.',
  1643: 'Surprise that Mr. Lee is in the office.',
  1665: 'A pair of trousers.',
  1666: 'She thinks Greenwood is too far from her work.',
  1667: 'She has worked there longer than the man.',
  1689: 'Surprised.',
  1690: 'He won a competition.',
  1711: 'A post office.',
  1712: 'Turn off the heater.',
  1731: 'Her bag.',
  1732: 'Windy.',
  1997: 'Do you work with your sister?',
  1998: 'You should take a taxi.',
  1999: 'The chair belongs to her.',
  2000: 'The park is far from her house.',
  2001: 'The soup is finished today.',
};

const BACKUP_PATH = 'docs/qa-backup-option-d-null-2026-11-02.json';
const apply = process.argv.includes('--apply');
const ids = Object.keys(DRAFTS).map(Number);

const normalize = (value) => String(value ?? '').trim().toLowerCase();

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const { rows: current } = await client.query(
  `select id, test_type_id, question_text, option_a, option_b, option_c, option_d, correct_answer,
          updated_at::text as updated_at,
          (select count(*)::int from user_answers ua where ua.question_id = questions.id) as answers
     from questions
    where id = any($1::int[])
    order by id`,
  [ids],
);

const byId = new Map(current.map((row) => [row.id, row]));
const problems = [];
const plan = [];

for (const id of ids) {
  const row = byId.get(id);
  if (!row) {
    problems.push(`id ${id}: not found`);
    continue;
  }
  if (row.test_type_id !== 'focus-meaning') problems.push(`id ${id}: test_type_id = ${row.test_type_id}`);
  if (row.option_d !== null && row.option_d.trim() !== '') {
    problems.push(`id ${id}: option_d already set (${JSON.stringify(row.option_d)})`);
  }
  if (!['A', 'B', 'C', 'D'].includes(row.correct_answer)) {
    problems.push(`id ${id}: unexpected correct_answer ${row.correct_answer}`);
  }

  const draft = DRAFTS[id];
  const existing = [row.option_a, row.option_b, row.option_c].map(normalize).filter(Boolean);
  if (!draft || !draft.trim()) problems.push(`id ${id}: empty draft`);
  if (existing.includes(normalize(draft))) problems.push(`id ${id}: draft duplicates an existing option`);

  plan.push({
    id,
    question_text: row.question_text,
    correct_answer: row.correct_answer,
    option_d_before: row.option_d,
    option_d_after: draft,
    answers: row.answers,
    updated_at: row.updated_at,
  });
}

console.log(`${apply ? 'APPLY' : 'DRY-RUN'} — ${ids.length} ข้อ`);
console.table(plan.map((p) => ({ id: p.id, answer: p.correct_answer, answers: p.answers, option_d: p.option_d_after })));

if (problems.length > 0) {
  console.error('\n❌ เงื่อนไขไม่ผ่าน — ไม่เขียนอะไรเลย:');
  for (const problem of problems) console.error('  -', problem);
  await client.end();
  process.exit(1);
}

const backup = {
  createdAt: new Date().toISOString(),
  applied: false,
  scope: 'focus-meaning ที่ option_d เป็น NULL/ว่าง (23 ข้อ)',
  note: 'ไม่แตะ correct_answer / stats_cutoff_at (การเพิ่มตัวเลือกที่ 4 ไม่เปลี่ยนเฉลย)',
  rows: plan,
};
fs.writeFileSync(BACKUP_PATH, `${JSON.stringify(backup, null, 2)}\n`);
console.log(`\nbackup: ${BACKUP_PATH}`);

if (!apply) {
  console.log('\n(dry-run) ยังไม่เขียน DB — เพิ่ม --apply');
  await client.end();
  process.exit(0);
}

await client.query('begin');
try {
  for (const item of plan) {
    const result = await client.query(
      `update questions
          set option_d = $1
        where id = $2
          and (option_d is null or btrim(option_d) = '')
          and correct_answer = $3
        returning id, option_d`,
      [item.option_d_after, item.id, item.correct_answer],
    );
    if (result.rowCount !== 1) throw new Error(`id ${item.id}: expected rowCount 1, got ${result.rowCount}`);
    if (result.rows[0].option_d !== item.option_d_after) throw new Error(`id ${item.id}: unexpected option_d after update`);
  }
  await client.query('commit');
  console.log('\n✅ commit สำเร็จ 23 แถว');
} catch (error) {
  await client.query('rollback');
  backup.error = error instanceof Error ? error.message : String(error);
  fs.writeFileSync(BACKUP_PATH, `${JSON.stringify(backup, null, 2)}\n`);
  console.error('\n❌ ROLLBACK —', backup.error);
  await client.end();
  process.exit(1);
}

backup.applied = true;
backup.appliedAt = new Date().toISOString();
fs.writeFileSync(BACKUP_PATH, `${JSON.stringify(backup, null, 2)}\n`);

const verify = await client.query(
  `select
     (select count(*)::int from questions where test_type_id = 'focus-meaning' and (option_d is null or btrim(option_d) = '')) as still_blank,
     (select count(*)::int from questions where id = any($1::int[]) and btrim(coalesce(option_d, '')) <> '') as filled,
     (select count(*)::int from questions where stats_cutoff_at is not null) as cutoffs`,
  [ids],
);
console.log('ตรวจหลังเขียน:', JSON.stringify(verify.rows[0]));

const { rows: after } = await client.query(
  `select id, option_d, correct_answer, updated_at::text from questions where id = any($1::int[]) order by id`,
  [ids],
);
const bad = after.filter((row) => row.option_d !== DRAFTS[row.id]);
console.log(bad.length === 0 ? `✅ ครบ ${after.length} ข้อ ตรงกับร่าง · correct_answer ไม่ถูกแก้` : `❌ ไม่ตรง: ${JSON.stringify(bad)}`);

await client.end();
