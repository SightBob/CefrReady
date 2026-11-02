/**
 * เขียน option_d ของ focus-meaning B1 ที่ยังเป็น "—" (25 ข้อ)
 * ร่างอยู่ใน docs/qa-option-d-drafts.md และได้รับอนุมัติเมื่อ 2 พ.ย. 2026
 *
 * หลักความปลอดภัย:
 * - dry-run เป็นค่าเริ่มต้น ต้องส่ง --apply ถึงจะเขียน
 * - แต่ละแถวต้อง UPDATE ได้ rowCount = 1 (WHERE option_d = '—' AND correct_answer = original)
 * - ไม่แตะ correct_answer / question_text / stats_cutoff_at / user_answers
 * - ตรวจว่า option_d ใหม่ไม่ซ้ำกับ A/B/C ของข้อนั้นก่อนเขียน
 * - เขียน backup (ก่อน/หลัง) ลง docs/qa-backup-option-d-2026-11-02.json ก่อนเริ่ม
 *
 * ใช้: node --env-file=.env docs/qa-apply-option-d-2026-11-02.mjs [--apply]
 */
import fs from 'node:fs';
import { Client } from 'pg';

const DRAFTS = {
  1678: 'The senator is too young to run for president.',
  1680: 'Where are you planning to live in the future?',
  1681: 'Her brother is not interested in spending time with the family.',
  1683: "I don't know where your jeans are.",
  1684: 'She does not work at all.',
  1685: 'She works ten hours a day.',
  1686: 'I need it for a moment first.',
  1691: 'He has never seen the painting.',
  1692: 'She would go back to the same hotel.',
  1693: 'He is planning a trip to New York with her.',
  1694: 'She thinks Jack should stop complaining.',
  1696: 'His mother is still in hospital.',
  1697: 'He forgot to wash the dishes too.',
  1698: 'He is staying home this summer.',
  1699: 'He wants to drive his son to the bus stop.',
  1700: 'The dinner will be held in the classroom.',
  1704: 'She is surprised that he writes so few letters.',
  1705: 'He no longer sees his cousins.',
  1706: 'The professor cancels many classes.',
  1714: 'He is not allowed to wear a watch.',
  1716: 'She is angry that the meeting was cancelled.',
  1718: 'He is going to appear on the news again.',
  1719: 'He bought the bushes from a garden centre.',
  1721: 'He has already taken the class himself.',
  1722: 'His sister has already booked her ticket.',
};

const BACKUP_PATH = 'docs/qa-backup-option-d-2026-11-02.json';
const apply = process.argv.includes('--apply');
const ids = Object.keys(DRAFTS).map(Number);

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

await client.connect();

const { rows: current } = await client.query(
  `select id, question_text, option_a, option_b, option_c, option_d, correct_answer,
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
  if (row.option_d !== '—') problems.push(`id ${id}: option_d is ${JSON.stringify(row.option_d)}, expected "—"`);
  if (!['A', 'B', 'C'].includes(row.correct_answer)) problems.push(`id ${id}: unexpected correct_answer ${row.correct_answer}`);

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

console.log(`${apply ? 'APPLY' : 'DRY-RUN'} — เป้าหมาย ${ids.length} ข้อ`);
console.table(plan.map((p) => ({ id: p.id, answer: p.correct_answer, answers: p.answers, option_d: p.option_d_after })));

if (problems.length > 0) {
  console.error('\n❌ ตรวจเงื่อนไขไม่ผ่าน — ไม่เขียนอะไรเลย:');
  for (const problem of problems) console.error('  -', problem);
  await client.end();
  process.exit(1);
}

const backup = {
  createdAt: new Date().toISOString(),
  applied: false,
  note: 'option_d before/after สำหรับ 25 ข้อ focus-meaning B1 (ไม่แตะ correct_answer / stats_cutoff_at)',
  rows: plan,
};
fs.writeFileSync(BACKUP_PATH, `${JSON.stringify(backup, null, 2)}\n`);
console.log(`\nbackup เขียนแล้ว: ${BACKUP_PATH}`);

if (!apply) {
  console.log('\n(dry-run) ยังไม่มีการเขียน DB — เพิ่ม --apply เพื่อเขียนจริง');
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
          and option_d = '—'
          and correct_answer = $3
        returning id, option_d`,
      [item.option_d_after, item.id, item.correct_answer],
    );
    if (result.rowCount !== 1) {
      throw new Error(`id ${item.id}: expected rowCount 1, got ${result.rowCount}`);
    }
    if (result.rows[0].option_d !== item.option_d_after) {
      throw new Error(`id ${item.id}: option_d after update is unexpected`);
    }
  }
  await client.query('commit');
  console.log('\n✅ commit สำเร็จ: 25 แถว (rowCount = 1 ทุกแถว)');
} catch (error) {
  await client.query('rollback');
  backup.applied = false;
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
     (select count(*)::int from questions where option_d = '—') as still_dash,
     (select count(*)::int from questions where id = any($1::int[]) and option_d <> '—') as filled,
     (select count(*)::int from questions where stats_cutoff_at is not null) as cutoffs`,
  [ids],
);
console.log('ตรวจหลังเขียน:', JSON.stringify(verify.rows[0]));

const { rows: changed } = await client.query(
  `select id, option_d, correct_answer, updated_at::text from questions where id = any($1::int[]) order by id`,
  [ids],
);
const mismatched = changed.filter((row) => row.option_d !== DRAFTS[row.id]);
if (mismatched.length > 0) {
  console.error('❌ พบค่าที่ไม่ตรงกับร่าง:', JSON.stringify(mismatched));
} else {
  console.log(`✅ ครบ ${changed.length} ข้อ ตรงกับร่างทั้งหมด · correct_answer ไม่ถูกแก้`);
}

await client.end();
