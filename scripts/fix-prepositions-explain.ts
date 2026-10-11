import 'dotenv/config';
import { existsSync, writeFileSync } from 'node:fs';
import { db } from '../src/db';
import { testExplains } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const EXPLAIN_ID = 4;
const ROLLBACK_FILE = 'tmp/prep4-rollback.json';

type PracticeQuestion = {
  sentence: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
};

type Section = {
  type?: string;
  body?: string;
  rows?: Array<{ left: string; right?: string }>;
  examples?: Array<{ en: string; th?: string; ok?: boolean }>;
  practice?: { questions: PracticeQuestion[] };
  heading?: string;
  quizHeading?: string;
  tip?: string;
  chip?: string;
};

const APPLY = process.argv.includes('--apply');

function patch(sections: Section[]) {
  const log: string[] = [];
  const notes: Section[] = [];
  const practices: Section[] = [];

  // ── ข้อ 1: ทริกสำคัญซ้ำ 3 ครั้ง (IN/ON/AT) → เก็บไว้อันเดียว คืออันหลังสุด ──
  sections.forEach((s) => {
    if (s.type === 'importantNote' && (s.heading ?? '').includes('ทริกสำคัญ')) notes.push(s);
  });

  if (notes.length > 1) {
    const bodies = new Set(notes.map((n) => n.body ?? ''));
    if (bodies.size !== 1) {
      throw new Error(
        `ทริกสำคัญ ${notes.length} อันมี body ไม่เหมือนกัน — หยุดก่อนแก้ ให้ตรวจเอง:\n${[...bodies].join('\n---\n')}`,
      );
    }
    const keeper = notes[notes.length - 1];
    for (const drop of notes.slice(0, -1)) {
      const at = sections.indexOf(drop);
      sections.splice(at, 1);
      log.push(`ลบ importantNote "ทริกสำคัญ" ซ้ำที่ index ${at} (เหลืออันเดียวหลัง AT)`);
    }
    log.push(`คง importantNote ที่ index ${sections.indexOf(keeper)} (หลังการ์ด AT)`);
  } else if (notes.length === 1) {
    log.push('ทริกสำคัญ มีอยู่แล้ว 1 อัน — ไม่ต้องแก้');
  } else {
    log.push('ไม่พบบล็อก importantNote "ทริกสำคัญ"');
  }

  // ── ข้อ 2: quiz ของ IN ต้องไม่ทดสอบ on/at ที่ยังไม่ได้สอน ──
  sections.forEach((s) => {
    if (s.type === 'practice' && s.practice) practices.push(s);
  });

  const inQuiz = practices.find((s) =>
    s.practice?.questions.some((q) => q.sentence.includes('The presentation starts')),
  );

  if (inQuiz?.practice) {
    const q = inQuiz.practice.questions.find((x) => x.sentence.includes('The presentation starts'));
    if (q) {
      q.sentence = 'My father works ____ a hospital in Chiang Mai.';
      q.options = ['on', 'at', 'in'];
      q.answerIndex = 2;
      q.explanation =
        'สถานที่ที่มีขอบเขตชัดเจนใช้ in — in a hospital (จุดเฉพาะเจาะจงจะใช้ at แทน เช่น at the door)';
      log.push('quiz หัวข้อ IN ข้อ 1: เปลี่ยนจากข้อ 3 ช่อง (at/on/in พร้อมกัน) เป็นข้อ in เดี่ยว ๆ ที่ตรงกับเนื้อหาที่สอนไปแล้ว');
    }
  } else {
    log.push('ไม่พบ quiz ข้อ "The presentation starts" — ข้อ 2 ข้าม');
  }

  // ── ข้อ 3: เหตุผลประโยคผิดของ STRIKE SOMEONE AS ──
  const strike = sections.find((s) => (s.heading ?? '').includes('STRIKE SOMEONE AS'));
  const bad = strike?.examples?.find((e) => e.en === 'The movie struck me like funny.');

  if (bad) {
    bad.th = 'ผิด: หลัง strike ใช้ as ตามด้วย adjective แต่ like ต้องตามด้วยคำนาม (struck me like a clown)';
    log.push('STRIKE SOMEONE AS: แก้คำอธิบายประโยคผิด — เดิมบอกว่าผิดเพราะใช้ like แต่ที่ผิดจริงคือ like ตามด้วยคำนามไม่ได้');
  } else {
    log.push('ไม่พบตัวอย่าง "The movie struck me like funny." — ข้อ 3 ข้าม');
  }

  return { sections, log };
}

async function main() {
  const [row] = await db.select().from(testExplains).where(eq(testExplains.id, EXPLAIN_ID)).limit(1);
  if (!row) throw new Error(`ไม่พบ test_explains id=${EXPLAIN_ID}`);

  const before = row.sections as Section[];
  const { sections, log } = patch(structuredClone(before));

  console.log(`sections เดิม ${before.length} → หลังแก้ ${sections.length}`);

  if (!APPLY) {
    console.log('\n--- DRY RUN ---');
    log.forEach((l) => console.log(' * ' + l));
    console.log('\nยังไม่ได้เขียนลง DB (ใส่ --apply เพื่อบันทึก)');
    return;
  }

  if (JSON.stringify(before) === JSON.stringify(sections)) {
    console.log('\nไม่มีอะไรเปลี่ยน — ไม่เขียนลง DB และไม่แตะไฟล์ rollback');
    return;
  }

  // เขียน rollback เฉพาะตอนจะเขียน DB จริง — dry run ต้องไม่ทับไฟล์เดิม
  // (ถ้าเขียนทุกครั้ง การรันซ้ำแบบ dry run จะกลายเป็น rollback ของสถานะล่าสุด ซึ่งไม่ใช่ของเดิม)
  if (existsSync(ROLLBACK_FILE)) {
    throw new Error(
      `${ROLLBACK_FILE} มีอยู่แล้ว — ย้ายออกก่อนรัน เพื่อไม่ให้ rollback ของรอบก่อนหาย`,
    );
  }
  writeFileSync(
    ROLLBACK_FILE,
    JSON.stringify({ id: EXPLAIN_ID, sections: before }, null, 2),
    'utf8',
  );
  console.log(`เขียน rollback: ${ROLLBACK_FILE} (sections เดิม ${before.length} อัน)`);

  await db.update(testExplains).set({ sections: sections as typeof testExplains.$inferInsert['sections'] }).where(eq(testExplains.id, EXPLAIN_ID));
  console.log('\n--- APPLIED ---');
  log.forEach((l) => console.log(' * ' + l));
}

main().then(() => process.exit(0));