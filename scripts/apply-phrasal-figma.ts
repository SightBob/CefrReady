/**
 * #33 Phrasal Verbs & Collocations → แยกหัวข้อตาม Figma node 504:11105
 *
 * 1) #33 เหลือหัวข้อ "Phrasal Verbs" เท่านั้น เนื้อหาตาม Figma (การ์ดเดียว 4 แถว + ทริก + quiz 4 ข้อ)
 * 2) สร้าง explain ใหม่หัวข้อ "Vocabulary & Collocations" ย้ายการ์ด Collocations + ADJECTIVE: SHY มาจาก #33
 *
 * รัน:  npx tsx scripts/apply-phrasal-figma.ts
 * รัน:  npx tsx scripts/apply-phrasal-figma.ts --apply
 */
import 'dotenv/config';
import { existsSync, writeFileSync } from 'node:fs';
import { db } from '../src/db';
import { testExplains } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const APPLY = process.argv.includes('--apply');
const EXPLAIN_ID = 33;
const NEW_TOPIC = 'Vocabulary & Collocations';
const ROLLBACK_FILE = 'tmp/explain-33-rollback.json';

// ── เนื้อหาใหม่ของ #33 (Phrasal Verbs) ตาม Figma 504:11119 ──
const PHRASAL_SECTIONS = [
  {
    type: 'rule',
    heading: 'Phrasal Verbs (กริยา + บุพบท/กริยาวิเศษณ์ เปลี่ยนความหมายใหม่)',
    rows: [
      { left: 'Figure out (เข้าใจ / หาคำตอบ)', right: 'I need to ==figure out== this.' },
      { left: 'Put off (เลื่อนเวลาออกไป)', right: 'We must ==put off== the meeting.' },
      { left: 'Give up (ล้มเลิก / ยอมแพ้)', right: 'Never ==give up== on your goal.' },
      { left: 'Fill out (กรอกแบบฟอร์ม)', right: 'Please ==fill out== this form.' },
    ],
  },
  {
    type: 'importantNote',
    heading: 'ทริกสำคัญ',
    body: 'Phrasal Verb คือ Verb + Preposition ที่เปลี่ยนความหมายเดิม (ห้ามแปลแยกคำ) จำคู่คำที่ชอบออกสอบบ่อย เช่น put off (เลื่อน), give up (ยอมแพ้)',
  },
  {
    type: 'practice',
    heading: 'ลองทำโจทย์เพื่อทบทวนความเข้าใจ',
    practice: {
      questions: [
        // ── ข้อจาก Figma 504:11176 ──
        {
          sentence: 'Due to heavy rain, the concert was ______ until next week.',
          options: ['put off', 'give up', 'figure out'],
          answerIndex: 0,
          explanation:
            'ฝนตกหนักทำให้คอนเสิร์ตถูกเลื่อนออกไป จึงใช้ put off (เลื่อนเวลา) → "was put off" (give up = ยอมแพ้, figure out = หาคำตอบ ซึ่งไม่ตรงกับบริบท)',
        },
        {
          sentence: 'I need to ______ this before the meeting tomorrow.',
          options: ['figure out', 'put off', 'fill out'],
          answerIndex: 0,
          explanation:
            'ต้องหาคำตอบว่าเรื่องนี้คืออะไร จึงใช้ figure out (เข้าใจ / หาคำตอบ) → "figure out this"',
        },
        {
          sentence: 'Never ______ on your goal, even when things get hard.',
          options: ['give up', 'fill out', 'put off'],
          answerIndex: 0,
          explanation:
            'ประโยคสั่งไม่ให้ล้มเลิก จึงใช้ give up on (ยอมแพ้ / ล้มเลิก) → "Never give up on your goal"',
        },
        {
          sentence: 'Please ______ this form before you hand it in.',
          options: ['fill out', 'figure out', 'give up'],
          answerIndex: 0,
          explanation:
            'เอกสารที่ต้องกรอกข้อมูล ใช้ fill out (กรอกแบบฟอร์ม) → "fill out this form"',
        },
      ],
    },
  },
];

// ── เนื้อหาที่ย้ายไป explain ใหม่ (ดึงจาก #33 เดิม) ──
const COLLOCATIONS_SECTIONS = [
  {
    type: 'rule',
    heading: 'Collocations ที่ต้องใช้คู่กัน (จำทั้งวลี)',
    description: 'Collocations คำที่ใช้คู่กันจนเป็นวลีสำเร็จรูป — จำทั้งวลีแล้วตอบได้ทันที',
    rows: [
      { left: 'have a great/good time = สนุก', right: 'We ==had a great time== at the beach.' },
      { left: 'take a note = จดบันทึก', right: 'Can I ==take a note== for Tom?' },
      { left: 'come down with the flu = เริ่มเป็นหวัด', right: 'You might be ==coming down with== the flu.' },
      { left: 'like + นาม + better = ชอบมากกว่า', right: 'I ==like== white bread ==better==.' },
    ],
    tip: 'วลีสำเร็จรูปจะฟังดู “ใช่” แค่ตัวเดียว — ที่เหลือจะฝืนภาษาไทย เช่น “take the flu” หรือ “come down a note” ฟังไม่เป็นธรรมชาติ',
  },
  {
    type: 'importantNote',
    heading: 'ทริกสำคัญ',
    body: 'ทักทายตามมารยาทก็เป็น collocation: Have a good night! (ราตรีสวัสดิ์/นอนหลับฝันดี) · ตอบรับของที่เสิร์ฟใช้ Here you are. · ห่อของใช้ wrapped in/with paper',
  },
  {
    type: 'practice',
    heading: 'ลองทำโจทย์เพื่อทบทวนความเข้าใจ',
    practice: {
      questions: [
        {
          sentence: 'The gift was a box of chocolates ____ in shiny paper.',
          options: ['wrapped', 'turned', 'drawn'],
          answerIndex: 0,
          explanation:
            'wrapped in = ห่อด้วย (กระดาษ/ผ้า) เป็นคำที่ใช้คู่กับ paper → a box of chocolates wrapped in shiny paper',
        },
        {
          sentence: "You've been sneezing all morning. You might be ____ the flu.",
          options: ['taking', 'getting', 'coming down with'],
          answerIndex: 2,
          explanation:
            'come down with the flu = เริ่มป่วยเป็นไข้หวัด เป็นวลีสำเร็จรูปที่ต้องใช้ come down with (get/take ไม่ใช้กับ flu ในความหมายนี้)',
        },
        {
          sentence: "I don't like wholegrain toast. I ____ white bread better.",
          options: ['prefer', 'like', 'enjoy'],
          answerIndex: 1,
          explanation:
            'สำนวนบอกว่าชอบสิ่งหนึ่งมากกว่าคือ like + นาม + better → I like white bread better (ถ้าใช้ prefer ต้องเป็น prefer white bread to wholegrain)',
        },
      ],
    },
  },
  {
    type: 'rule',
    heading: 'ADJECTIVE: SHY (ขี้อาย)',
    description: 'shy เป็น adjective (คำคุณศัพท์) ใช้บรรยายคน ใช้ได้ทั้งหลัง be และก่อนคำนาม',
    rows: [
      { left: 'be + shy', right: 'She is ==shy== in front of strangers.' },
      { left: 'shy + คำนาม', right: 'He is a ==shy== boy.' },
      { left: 'shyness เป็นคำนาม (ไม่ใช่ adjective)', right: 'Her ==shyness== surprised everyone.' },
    ],
    tip: 'shy (adj) → shyness (noun) → shyly (adv)',
  },
];

async function main() {
  const [row] = await db.select().from(testExplains).where(eq(testExplains.id, EXPLAIN_ID)).limit(1);
  if (!row) throw new Error(`ไม่พบ test_explains id=${EXPLAIN_ID}`);

  const [clash] = await db.select().from(testExplains).where(eq(testExplains.grammarTopic, NEW_TOPIC)).limit(1);
  if (clash) throw new Error(`มี explain หัวข้อ "${NEW_TOPIC}" อยู่แล้ว (id=${clash.id}) — หยุดก่อน`);

  const before = (row.sections ?? []) as any[];
  console.log(`#${EXPLAIN_ID} "${row.title}" (${row.status}) · topics ${JSON.stringify(row.grammarTopics)} · sets ${JSON.stringify(row.testSetIds)}`);
  console.log(`sections เดิม ${before.length} → ใหม่ ${PHRASAL_SECTIONS.length} + สร้างใหม่ ${COLLOCATIONS_SECTIONS.length}`);
  before.forEach((s, i) => console.log(`  ${i + 1}. [${s.type}] ${s.heading ?? s.description ?? '(ไม่มีหัวข้อ)'}`));
  console.log('--- ใหม่: Phrasal Verbs ---');
  PHRASAL_SECTIONS.forEach((s, i) =>
    console.log(`  ${i + 1}. [${s.type}] ${(s as any).heading ?? '(ไม่มีหัวข้อ)'}${'practice' in s ? ` · quiz ${(s as any).practice.questions.length} ข้อ` : ''}`),
  );
  console.log(`--- ใหม่: ${NEW_TOPIC} ---`);
  COLLOCATIONS_SECTIONS.forEach((s, i) =>
    console.log(`  ${i + 1}. [${s.type}] ${(s as any).heading ?? '(ไม่มีหัวข้อ)'}${'practice' in s ? ` · quiz ${(s as any).practice.questions.length} ข้อ` : ''}`),
  );

  if (!APPLY) {
    console.log('\n--- DRY RUN ---');
    console.log(JSON.stringify(PHRASAL_SECTIONS, null, 2));
    console.log(JSON.stringify(COLLOCATIONS_SECTIONS, null, 2));
    console.log('\nยังไม่ได้เขียนลง DB (ใส่ --apply เพื่อบันทึก)');
    return;
  }

  if (existsSync(ROLLBACK_FILE)) throw new Error(`${ROLLBACK_FILE} มีอยู่แล้ว — ย้ายออกก่อนรัน`);
  writeFileSync(ROLLBACK_FILE, JSON.stringify({ id: EXPLAIN_ID, sections: row.sections, grammarTopic: row.grammarTopic, grammarTopics: row.grammarTopics }, null, 2), 'utf8');
  console.log(`\nเขียน rollback: ${ROLLBACK_FILE}`);

  await db
    .update(testExplains)
    .set({
      grammarTopics: ['Phrasal Verbs'],
      sections: PHRASAL_SECTIONS as typeof testExplains.$inferInsert['sections'],
      updatedAt: new Date(),
    })
    .where(eq(testExplains.id, EXPLAIN_ID));

  const [created] = await db
    .insert(testExplains)
    .values({
      grammarTopic: NEW_TOPIC,
      grammarTopics: [NEW_TOPIC],
      title: NEW_TOPIC,
      intro: null,
      sections: COLLOCATIONS_SECTIONS as typeof testExplains.$inferInsert['sections'],
      tip: null,
      testSetIds: row.testSetIds,
      status: 'published',
    })
    .returning({ id: testExplains.id });

  console.log('\n--- APPLIED ---');
  console.log(` * #${EXPLAIN_ID} เหลือหัวข้อ "Phrasal Verbs" ตาม Figma 504:11105 (quiz 4 ข้อ)`);
  console.log(` * สร้างใหม่ id=${created?.id}: ${NEW_TOPIC} (ย้าย Collocations + ADJECTIVE: SHY จาก #33)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });