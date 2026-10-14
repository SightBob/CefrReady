/**
 * เขียนทับ Explain #35 (Pronouns & Possessives) ตาม Figma + สร้าง explain ใหม่สำหรับ Articles
 *
 * รัน:  npx tsx scripts/apply-pronouns-figma.ts          (dry run — ไม่เขียน DB)
 * รัน:  npx tsx scripts/apply-pronouns-figma.ts --apply  (เขียน DB + เขียนไฟล์ rollback)
 */
import 'dotenv/config';
import { existsSync, writeFileSync } from 'node:fs';
import { db } from '../src/db';
import { testExplains } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const APPLY = process.argv.includes('--apply');
const ROLLBACK_DIR = 'tmp';

// ─────────────────────────────────────────────────────────────
// #35 — Pronouns & Possessives (Figma node 504:10872)
// ─────────────────────────────────────────────────────────────

const PRONOUNS_SECTIONS = [
  {
    type: 'rule',
    heading: 'Pronouns & Possessions (ตระกูลสรรพนามเปลี่ยนรูปตามหน้าที่)',
    rows: [
      { left: 'เป็นประธาน / อยู่หน้ากริยาแท้', right: '==She== loves cats.' },
      { left: 'เป็นกรรม / อยู่หลังกริยาหรือคำบุพบท', right: 'John loves ==her==' },
      { left: 'แสดงความเป็นเจ้าของ / คำนามตามหลังเสมอ', right: 'This is ==her== cat.' },
      { left: 'เจ้าของเดี่ยวๆ ไม่ต้องมีนามตามหลัง', right: 'This cat is ==hers==' },
    ],
  },
  {
    type: 'importantNote',
    heading: 'ทริกสำคัญ',
    body: 'หน้าสุดใช้ Subject / โดนกระทำหรืออยู่หลังสุดใช้ Object มีนามตามหลังใช้ Adjective (my, her, their) / ไม่มีนามตามหลัง ยืนเดี่ยวใช้ Pronoun (mine, hers, theirs)',
  },
  {
    type: 'practice',
    heading: 'ลองทำโจทย์เพื่อทบทวนความเข้าใจ',
    practice: {
      questions: [
        {
          sentence: 'This book is not mine; it is ______',
          options: ['her', 'hers', 'she'],
          answerIndex: 1,
          explanation:
            'จบประโยคโดยไม่มีนามตามหลัง ต้องใช้สรรพนามแสดงเจ้าของแบบยืนเดี่ยว → "it is hers" (her ต้องมีคำนามตามหลัง และ she เป็นสรรพนามประธาน)',
        },
        {
          sentence: 'Anna loves music. John loves ______ too.',
          options: ['her', 'hers', 'his'],
          answerIndex: 0,
          explanation:
            'หลังกริยา loves ต้องใช้สรรพนามกรรมของ Anna → "John loves her" (hers ใช้เมื่อจบประโยคโดยไม่มีนามตามหลัง)',
        },
        {
          sentence: '______ loves cats very much.',
          options: ['She', 'Her', 'Hers'],
          answerIndex: 0,
          explanation:
            'ตำแหน่งหน้ากริยา loves คือประธาน จึงต้องใช้สรรพนามประธาน → "She loves cats" (Her ขึ้นต้นด้วยพยัญชนะตัวใหญ่ และ hers ใช้แทนคำนาม)',
        },
      ],
    },
  },
];

// ─────────────────────────────────────────────────────────────
// ใหม่ — Articles & Determiners (เนื้อหาใหม่ อ้างอิงโจทย์ #2052 / #2053)
// ─────────────────────────────────────────────────────────────

const ARTICLES_SECTIONS = [
  {
    type: 'rule',
    heading: 'a / an / the (Articles)',
    rows: [
      { left: 'นามนับได้เอกพจน์ ที่พูดถึงครั้งแรก', right: 'This is ==a== lovely garden.' },
      { left: 'คำที่ขึ้นต้นด้วยเสียงสระ ใช้ an', right: 'She waited ==an== hour.' },
      { left: 'ของที่ทั้งสองฝ่ายรู้กันอยู่แล้ว ใช้ the', right: '==The== book on the desk is mine.' },
      { left: 'ไม่มีเลย ใช้ no + คำนาม', right: "Honestly, it's ==no== surprise to me." },
    ],
  },
  {
    type: 'importantNote',
    heading: 'ทริกสำคัญ',
    body: 'a ใช้หน้าคำที่ออกเสียงพยัญชนะ (a bag, a lovely garden) · an ใช้หน้าคำที่ออกเสียงสระ (an hour, an amazing fight) — ดูเสียงเสมอ ไม่ใช่ตัวอักษร · no + คำนาม ให้ความหมายเดียวกับ not any',
  },
  {
    type: 'practice',
    heading: 'ลองทำโจทย์เพื่อทบทวนความเข้าใจ',
    practice: {
      questions: [
        {
          sentence: 'This is ______ lovely garden near my house.',
          options: ['a', 'an', 'the'],
          answerIndex: 0,
          explanation:
            'garden เป็นนามนับได้เอกพจน์ที่พูดถึงครั้งแรก และ lovely ออกเสียงพยัญชนะ → "a lovely garden" (an ใช้กับเสียงสระ, the ใช้เมื่อทั้งคู่รู้จักสวนนั้นอยู่แล้ว)',
        },
        {
          sentence: 'Nobody passed the exam. Honestly, it\'s ______ surprise to me.',
          options: ['a', 'an', 'no'],
          answerIndex: 2,
          explanation:
            'ความหมายคือ "ไม่แปลกใจเลย" ใช้ no + คำนาม → "no surprise" (a/an ใช้เมื่อพูดถึงของชิ้นที่ยังไม่เคยพูดถึงมาก่อน)',
        },
        {
          sentence: 'I waited for ______ hour before the bus arrived.',
          options: ['a', 'an', 'the'],
          answerIndex: 1,
          explanation:
            'hour ขึ้นต้นด้วยเสียงสระ (อ่านว่า "เอาเวอร์") จึงต้องใช้ an → "an hour" (ดูเสียงปลายคำ ไม่ใช่ตัว h ที่เป็นตัวอักษร)',
        },
      ],
    },
  },
];

const ARTICLES_TITLE = 'Articles (a / an / the)';
const ARTICLES_TOPIC = 'Articles & Determiners';

async function main() {
  const [e35] = await db.select().from(testExplains).where(eq(testExplains.id, 35)).limit(1);
  if (!e35) throw new Error('ไม่พบ test_explains id=35');
  const [articles] = await db.select().from(testExplains).where(eq(testExplains.grammarTopic, ARTICLES_TOPIC)).limit(1);
  if (articles) throw new Error(`มี explain หัวข้อ "${ARTICLES_TOPIC}" อยู่แล้ว (id=${articles.id}) — หยุดก่อน`);

  console.log('#35 เดิม:');
  console.log('  title          :', e35.title);
  console.log('  grammarTopic   :', e35.grammarTopic);
  console.log('  grammarTopics  :', JSON.stringify(e35.grammarTopics));
  console.log('  testSetIds     :', JSON.stringify(e35.testSetIds));
  console.log('  sections       :', (e35.sections as unknown[]).length, 'อัน');
  console.log('  → ใหม่          :', PRONOUNS_SECTIONS.length, 'อัน | หัวข้อเหลือ ["Pronouns & Possessives"]');

  if (!APPLY) {
    console.log('\n--- DRY RUN ---');
    console.log(JSON.stringify(PRONOUNS_SECTIONS, null, 2));
    console.log('\n--- ใหม่ ---', ARTICLES_TITLE, '|', ARTICLES_TOPIC);
    console.log(JSON.stringify(ARTICLES_SECTIONS, null, 2));
    console.log('\nยังไม่ได้เขียนลง DB (ใส่ --apply เพื่อบันทึก)');
    return;
  }

  const rollbackFile = `${ROLLBACK_DIR}/explain-35-rollback.json`;
  if (existsSync(rollbackFile)) throw new Error(`${rollbackFile} มีอยู่แล้ว — ย้ายออกก่อนรัน`);
  writeFileSync(
    rollbackFile,
    JSON.stringify({ id: 35, sections: e35.sections, grammarTopic: e35.grammarTopic, grammarTopics: e35.grammarTopics, title: e35.title, testSetIds: e35.testSetIds, status: e35.status }, null, 2),
    'utf8',
  );
  console.log(`\nเขียน rollback: ${rollbackFile}`);

  await db
    .update(testExplains)
    .set({
      grammarTopic: 'Pronouns & Possessives',
      grammarTopics: ['Pronouns & Possessives'],
      title: 'Pronouns & Possessives',
      sections: PRONOUNS_SECTIONS as typeof testExplains.$inferInsert['sections'],
      testSetIds: [17],
      status: 'published',
      updatedAt: new Date(),
    })
    .where(eq(testExplains.id, 35));

  const [created] = await db
    .insert(testExplains)
    .values({
      grammarTopic: ARTICLES_TOPIC,
      grammarTopics: [ARTICLES_TOPIC],
      title: ARTICLES_TITLE,
      intro: null,
      sections: ARTICLES_SECTIONS as typeof testExplains.$inferInsert['sections'],
      tip: null,
      testSetIds: [17],
      status: 'published',
    })
    .returning({ id: testExplains.id });

  console.log(`\n--- APPLIED ---`);
  console.log(' * #35 เขียนทับ: Pronouns & Possessives (หัวข้อเดิม Pronouns & Possessives เท่านั้น)');
  console.log(` * สร้างใหม่ id=${created?.id}: ${ARTICLES_TITLE} → ${ARTICLES_TOPIC} (ผูกชุด 17)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });