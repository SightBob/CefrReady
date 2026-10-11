import 'dotenv/config';
import { existsSync, writeFileSync } from 'node:fs';
import { db } from '../src/db';
import { testExplains } from '../src/db/schema';
import { eq } from 'drizzle-orm';

/**
 * แก้คำอธิบาย/ตัวเลือกของ mini quiz ที่ตรวจพบว่าผิด 6 จุด
 * (รายงานจาก scripts/audit-miniquiz.ts + การอ่านทีละข้อ)
 *
 *   npx tsx scripts/fix-miniquiz-explanations.ts           # ดูอย่างเดียว
 *   npx tsx scripts/fix-miniquiz-explanations.ts --apply   # เขียนลง DB
 */

const ROLLBACK_FILE = 'tmp/miniquiz-rollback.json';
const APPLY = process.argv.includes('--apply');

type Question = { sentence: string; options: string[]; answerIndex: number; explanation?: string };
type Section = {
  type?: string;
  heading?: string;
  practice?: { questions: Question[] };
};
type Explain = typeof testExplains.$inferSelect;

/** หา section ที่มี quiz ข้อที่ตรงกับ predicate — ไม่เจอจะ throw เสมอ */
function findQuestion(
  sections: Section[],
  topic: string,
  sentenceIncludes: string,
): { section: Section; question: Question } {
  for (const section of sections) {
    const question = section.practice?.questions?.find((q) => q.sentence.includes(sentenceIncludes));
    if (question) return { section, question };
  }
  throw new Error(`ไม่พบ quiz ที่มี "${sentenceIncludes}" ในบท ${topic}`);
}

function findQuestionOrNull(
  sections: Section[],
  sentenceIncludes: string,
): { section: Section; question: Question } | null {
  for (const section of sections) {
    const question = section.practice?.questions?.find((q) => q.sentence.includes(sentenceIncludes));
    if (question) return { section, question };
  }
  return null;
}

type Patch = (row: Explain, log: string[]) => void;

const patches: Array<{ topic: string; run: Patch }> = [
  {
    // 🔴 ช่องว่าง 2 ช่อง แต่เฉลยเป็นคำเดียว → ผู้เรียนตอบถูกแล้วยังได้ประโยคผิด
    topic: 'Prepositions',
    run(row, log) {
      const { question } = findQuestion(row.sections as unknown as Section[], 'Prepositions', 'go shopping');
      question.options = ['on / on', 'in / on', 'on / in'];
      question.answerIndex = 1;
      question.explanation =
        'ปีใช้ in (in 2018) และวันใช้ on (on Sunday) → in / on';
      log.push('Prepositions · ON Q3: แก้ตัวเลือกให้เต็ม 2 ช่อง (เดิมเฉลยคำเดียวทำให้ได้ "shopping in Sunday")');
    },
  },
  {
    // 🟡 passive = ผู้ถูกกระทำ แต่ข้อความเดิมอ่านได้ว่าแมวเป็นคนตั้งชื่อ
    topic: 'Passive Voice',
    run(row, log) {
      const { question } = findQuestion(row.sections as Section[], 'Passive Voice', 'her kitten');
      question.explanation =
        'แมวเป็นตัวที่ถูกตั้งชื่อ (ไม่ใช่คนตั้งชื่อ) จึงต้องใช้ passive is called → “is called Moka” (call/calls เป็น active แปลว่าแมวเป็นผู้เรียกชื่อ ซึ่งไม่มีความหมาย)';
      log.push('Passive Voice Q3: คำอธิบายเดิม "แมวเป็นผู้ถูกตั้งชื่อ" อ่านได้ว่าแมวเป็นผู้ตั้งชื่อ (ซึ่งเป็น active) แก้เป็น "ตัวที่ถูกตั้งชื่อ"');
    },
  },
  {
    // 🟡 เหตุผลจริงของ do + never คือโครงสร้างผิด ไม่ใช่ความหมายซ้ำ
    topic: 'Present Simple',
    run(row, log) {
      const { question } = findQuestion(row.sections as Section[], 'Present Simple', 'do ____ always sleep');
      question.explanation =
        'หลังกริยาช่วย do ใช้ not เท่านั้น → do not always sleep (no ใช้ขยายคำนาม และ never ใช้กับ do ไม่ได้เพราะเป็นกริยาที่ไม่ต้องมีกริยาช่วย)';
      log.push('Present Simple Q3: เหตุผลเดิมบอกว่า never "ซ้ำกับ always" — จริงๆ คือห้ามใช้ do + never (โครงสร้างผิด)');
    },
  },
  {
    // 🟡 ถ้ามี your room ที่เพิ่งพูดถึง your desk เป็นธรรมชาติกว่า the desk
    topic: 'Pronouns & Possessives',
    run(row, log) {
      const { question } = findQuestion(row.sections as Section[], 'Pronouns', 'keys? — They are on');
      question.sentence = 'Where are my keys? — They are on ____ desk in your room.';
      question.options = ['a', 'your', 'the'];
      question.answerIndex = 1;
      question.explanation =
        'ประโยคถามห้องของผู้ฟัง (your room) จึงใช้ your desk ต้องตรงกับประโยคข้างหน้า → “on your desk” (the ใช้เมื่อทั้งคู่รู้จักโต๊ะนั้นอยู่แล้วโดยไม่ต้องระบุเจ้าของ)';
      log.push('Pronouns: "on the desk ใน your room" เปลี่ยนเป็น "on your desk" — เดิม your room กับ the desk ไม่สอดคล้องกัน');
    },
  },
  {
    // 🟡 ตัวอย่างในคำอธิบายเปลี่ยนความหมายจากสิ่งที่ถามไป เป็นสิ่งที่ควรจะทำ
    topic: 'Reported Speech',
    run(row, log) {
      const { question } = findQuestion(row.sections as Section[], 'Reported Speech', 'put on my plate');
      question.explanation =
        'คำถามเดิมคือ "ใส่อะไรลงจาน" เป็นคำถามวัตถุ จึงใฉายเป็น what → “she told me what I put on my plate” (that ใช้เมื่อเล่าใจความที่ไม่มีคำถามซ้อน)';
      log.push('Reported Speech Q1: ตัวอย่างเดิม "what I should put" เปลี่ยนความหมายเป็น "สิ่งที่ควรจะใส่" แก้เป็น what I put on my plate');
    },
  },
  {
    // 🟡 บท Past Simple แต่ข้อถามตอบ Present Perfect — สับสนสำหรับผู้เรียน
topic: 'Past Simple',
    run(row, log) {
      // รอบแรกเขียนประโยคที่ซ้ำกับ Q2 ลง DB ไปแล้ว — หาได้ทั้งสองรูปแบบ
      const sections = row.sections as Section[];
      const target =
        findQuestionOrNull(sections, 'rice last weekend') ??
        findQuestionOrNull(sections, 'for five years') ??
        findQuestionOrNull(sections, 'They ____ Chiang Mai last week.');
      if (!target) throw new Error('ไม่พบข้อ Q3 ของบท Past Simple ที่ต้องแก้');

      target.question.sentence = 'We ____ a lot of rice last weekend.';
      target.question.options = ['planted', 'have planted', 'plant'];
      target.question.answerIndex = 0;
      target.question.explanation =
        'last weekend เป็นเวลาที่จบไปแล้วในอดีต จึงใช้ Past Simple V.2 → planted (have planted ใช้กับเหตุการณ์ที่ยังต่อเนื่องมาถึงปัจจุบัน และต้องมีช่วงเวลาที่เริ่มต้นแต่ยังไม่จบ)';
      log.push('Past Simple Q3: แก้ประโยคที่ซ้ำกับ Q2 → "We ____ a lot of rice last weekend." (Past Simple จริง)');
    },
  },
];

async function main() {
  const rows = await db.select().from(testExplains);
  const log: string[] = [];
  const changed: Explain[] = [];

  for (const { topic, run } of patches) {
    const row = rows.find((r) => r.grammarTopic === topic);
    if (!row) {
      log.push(`ข้าม "${topic}" — ไม่พบบทนี้ในฐานข้อมูล`);
      continue;
    }
    const before = JSON.stringify(row.sections);
    run(row, log);
    if (JSON.stringify(row.sections) !== before) changed.push(row);
  }

  console.log(`แก้ ${changed.length} บท: ${changed.map((r) => `${r.id}/${r.grammarTopic}`).join(', ')}`);

  if (!APPLY) {
    console.log('\n--- DRY RUN ---');
    log.forEach((l) => console.log(' * ' + l));
    console.log('\nยังไม่ได้เขียนลง DB (ใส่ --apply เพื่อบันทึก)');
    return;
  }

  if (!changed.length) {
    console.log('ไม่มีอะไรเปลี่ยน — ไม่เขียนลง DB');
    return;
  }

  if (existsSync(ROLLBACK_FILE)) {
    throw new Error(`${ROLLBACK_FILE} มีอยู่แล้ว — ย้ายออกก่อนรัน เพื่อไม่ให้ rollback ของรอบก่อนหาย`);
  }
  writeFileSync(
    ROLLBACK_FILE,
    JSON.stringify(
      { rows: changed.map((r) => ({ id: r.id, grammarTopic: r.grammarTopic, sections: r.sections })) },
      null,
      2,
    ),
    'utf8',
  );
  console.log(`เขียน rollback: ${ROLLBACK_FILE}`);

  for (const row of changed) {
    await db.update(testExplains).set({ sections: row.sections }).where(eq(testExplains.id, row.id));
  }

  console.log('\n--- APPLIED ---');
  log.forEach((l) => console.log(' * ' + l));
}

main().then(() => process.exit(0));