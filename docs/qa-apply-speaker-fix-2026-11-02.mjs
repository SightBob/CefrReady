/**
 * แก้ "คำถามไม่ตรงกับผู้พูด" ของ 4 ข้อ (focus-meaning)
 *
 * ปัญหา: คำถามถามถึง "the man" แต่บทสนทนาให้ผู้พูดที่แสดงความหมายนั้นเป็น
 * "Person B" และชื่อผู้พูดสลับกับบทบาทจริง → ผู้เรียนตอบตามคำถามถูกแต่เฉลยชี้ไปอีกคน
 *
 * แนวแก้ (ไม่แตะเฉลย ไม่แตะ user_answers ไม่ตั้ง stats_cutoff_at เพราะ key ของ
 * คำตอบที่ถูกไม่เปลี่ยน — แก้เฉพาะชื่อผู้พูด และปรับถ้อยคำตัวเลือกลวงของ 1714
 * ให้เป็นบุคคลที่สามเหมือนข้ออื่น)
 *
 *   node --env-file=.env docs/qa-apply-speaker-fix-2026-11-02.mjs            # dry-run
 *   node --env-file=.env docs/qa-apply-speaker-fix-2026-11-02.mjs --apply    # เขียนจริง + backup
 */
import { writeFile } from 'node:fs/promises';
import { Client } from 'pg';

const APPLY = process.argv.includes('--apply');
const BACKUP = 'docs/qa-backup-speaker-fix-2026-11-02.json';

/** @type {Array<{id:number, rename:Record<string,string>, options?:Record<string,string>, note:string}>} */
const FIXES = [
  {
    id: 1718,
    rename: { A: 'Woman', B: 'Man' },
    note: 'ผู้พูด B คือคนที่เสียดายไม่ได้ดู (If I had known…) → ต้องเป็น Man',
  },
  {
    id: 1714,
    rename: { A: 'Woman', B: 'Man' },
    options: {
      option_a: 'He can’t see the clock from here.',
      option_b: 'He doesn’t understand the question.',
      option_c: 'He doesn’t know the time.',
    },
    note: 'คนที่ไม่มีนาฬิกาคือผู้พูด B → Man และปรับตัวเลือก A–C เป็นบุคคลที่สาม',
  },
  {
    id: 1719,
    rename: { A: 'Woman', B: 'Man' },
    note: 'ผู้พูด B คือคนที่จ้างมืออาชีพมาปลูก (had it done professionally) → Man',
  },
  {
    id: 1705,
    rename: { B: 'Woman' },
    note: 'เปลี่ยนชื่อผู้พูด B จาก Person B เป็น Woman (คำถามยังถามถึง Man ถูกต้องแล้ว)',
  },
];

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const backup = [];
let totalRows = 0;

for (const fix of FIXES) {
  const { rows } = await client.query(
    'select id, question_text, correct_answer, conversation, option_a, option_b, option_c, option_d from questions where id = $1',
    [fix.id],
  );
  const before = rows[0];
  if (!before) {
    console.log(`✗ ${fix.id}: not found`);
    continue;
  }
  backup.push({ id: fix.id, before });

  const conversation = Array.isArray(before.conversation) ? before.conversation : [];
  const nextConversation = conversation.map((line) =>
    fix.rename[line.speaker] ? { ...line, name: fix.rename[line.speaker] } : line,
  );

  const updates = { conversation: nextConversation, ...(fix.options ?? {}) };
  const changedConversation = JSON.stringify(nextConversation) !== JSON.stringify(conversation);

  console.log(`\n== ${fix.id} — ${fix.note}`);
  console.log(`   question: ${before.question_text}  (correct ${before.correct_answer})`);
  console.log(`   conversation changed: ${changedConversation}`);
  console.log(`   before: ${conversation.map((l) => `${l.speaker}:${l.name}`).join(' | ')}`);
  console.log(`   after : ${nextConversation.map((l) => `${l.speaker}:${l.name}`).join(' | ')}`);
  for (const [field, value] of Object.entries(fix.options ?? {})) {
    console.log(`   ${field}: "${before[field]}" → "${value}"`);
  }

  if (!changedConversation && !fix.options) continue;

  if (APPLY) {
    const res = await client.query(
      `update questions set conversation = $2, option_a = coalesce($3, option_a),
         option_b = coalesce($4, option_b), option_c = coalesce($5, option_c), updated_at = now()
       where id = $1`,
      [
        fix.id,
        JSON.stringify(nextConversation),
        fix.options?.option_a ?? null,
        fix.options?.option_b ?? null,
        fix.options?.option_c ?? null,
      ],
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
