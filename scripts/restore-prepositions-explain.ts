import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { db } from '../src/db';
import { testExplains } from '../src/db/schema';
import { eq } from 'drizzle-orm';

/**
 * คืน test_explains id=4 กลับเป็น sections เดิม 15 อัน
 * (ก่อนแก้: ทริกสำคัญซ้ำ 3 ครั้ง, quiz IN ข้อแรก 3 ช่อง, คำอธิบาย strike)
 *
 * ไฟล์ rollback รอบแรกถูกเขียนทับด้วย dry run รอบหลัง จึงกู้จาก snapshot ที่บันทึกไว้ในบทสนทนา
 *   npx tsx scripts/restore-prepositions-explain.ts          # ดูอย่างเดียว
 *   npx tsx scripts/restore-prepositions-explain.ts --apply  # เขียนลง DB
 */

const EXPLAIN_ID = 4;

const TIP_BODY =
  'At (ใช้กับ เวลา/จุดเฉพาะ) ➔ On (วัน/ถนน/พื้นผิว) ➔ In (เมือง/ปี/เดือน/ช่วงเวลากว้างๆ)';

const ORIGINAL: unknown[] = [
  {
    type: 'rule',
    heading: 'IN (เมือง / ปี / ช่วงเวลา)',
    description: 'ใช้กับพื้นที่ใหญ่ เมือง ประเทศ เดือน ปี และช่วงเวลา',
    rows: [
      { left: 'เมืองใหญ่ใช้ in', right: 'He lives ==in Bangkok.==' },
      { left: 'ปีใช้ in', right: 'She was born ==in 2026.==' },
      { left: 'ช่วงเวลาของวันใช้ in', right: 'We study ==in the morning.==' },
    ],
    examples: [],
    tip: 'In ฐานกว้าง เพราะอยู่ในพื้นที่ใหญ่ ช่วงเวลากว้าง หรือปี',
  },
  { type: 'importantNote', heading: 'ทริกสำคัญ', body: TIP_BODY, rows: [], examples: [] },
  {
    type: 'practice',
    heading: 'ลองทำโจทย์เพื่อทบทวนความเข้าใจ',
    practice: {
      questions: [
        {
          sentence: 'The presentation starts ____ 10.00 AM ____ Friday ____ room 402.',
          options: ['at / on / in', 'in / at / on', 'at / in / at'],
          answerIndex: 0,
          explanation:
            'At ใช้กับเวลาเจาะจง (10.00 AM), On ใช้กับวัน (Friday) และ In ใช้กับห้องหรือพื้นที่ปิด (room 402) → at / on / in',
        },
        {
          sentence: 'My family moved to Bangkok ____ 2018.',
          options: ['at', 'on', 'in'],
          answerIndex: 2,
          explanation: 'ปีใช้ in → in 2018 (ส่วน on ใช้กับวันหรือวันที่เท่านั้น)',
        },
        {
          sentence: 'We usually study ____ the morning.',
          options: ['on', 'in', 'at'],
          answerIndex: 1,
          explanation: 'ช่วงเวลาของวันใช้ in → in the morning (at ใช้กับเวลาเป๊ะ ๆ เช่น at 7.00 AM)',
        },
      ],
    },
  },
  {
    type: 'rule',
    heading: 'ON (วัน & ถนน & พื้นผิว)',
    description: 'ใช้กับวันในสัปดาห์ วันที่ และพื้นผิว',
    rows: [
      { left: 'วันในสัปดาห์ใช้ on', right: 'The exam is ==on Monday.==' },
      { left: 'วันที่ใช้ on', right: 'His birthday is ==on 15th May.==' },
      { left: 'วางบนพื้นผิวใช้ on', right: 'The book is ==on the desk.==' },
    ],
    examples: [],
    tip: 'On ชั้นกลาง เพราะแปะอยู่บนพื้นผิวหรือวันในสัปดาห์!',
  },
  { type: 'importantNote', heading: 'ทริกสำคัญ', body: TIP_BODY, rows: [], examples: [] },
  {
    type: 'practice',
    heading: 'ลองทำโจทย์เพื่อทบทวนความเข้าใจ',
    practice: {
      questions: [
        {
          sentence: 'The exam is ____ Monday.',
          options: ['on', 'in', 'at'],
          answerIndex: 0,
          explanation: 'วันในสัปดาห์ใช้ on → on Monday',
        },
        {
          sentence: 'His birthday is ____ 15th May.',
          options: ['in', 'at', 'on'],
          answerIndex: 2,
          explanation: 'วันที่ (15th May) ใช้ on → on 15th May (ส่วน in ใช้กับเดือนหรือปี)',
        },
        {
          sentence: 'My family moved to Bangkok ____ 2018 and we usually go shopping ____ Sunday.',
          options: ['on', 'in / on', 'in', 'on'],
          answerIndex: 2,
          explanation: 'In ใช้กับปี → in 2018 และ On ใช้กับวัน → on Sunday',
        },
      ],
    },
  },
  {
    type: 'rule',
    heading: 'AT (จุดเล็ก / เป๊ะสุด)',
    description: 'ใช้กับเวลาเจาะจงและสถานที่เฉพาะจุด',
    rows: [
      { left: 'เวลาเป๊ะใช้ at', right: 'The meeting starts ==at 9:00 AM.==' },
      { left: 'จุดแคบเฉพาะเจาะจงใช้ at', right: 'She is waiting ==at the door.==' },
      { left: 'สถานที่เฉพาะจุดใช้ at', right: 'We met ==at the bus stop.==' },
    ],
    examples: [],
    tip: 'At ยอดพีระมิด เพราะระบุเวลาหรือจุดที่แคบและเป๊ะที่สุด',
  },
  { type: 'importantNote', heading: 'ทริกสำคัญ', body: TIP_BODY, rows: [], examples: [] },
  {
    type: 'practice',
    heading: 'ลองทำโจทย์เพื่อทบทวนความเข้าใจ',
    practice: {
      questions: [
        {
          sentence: 'The meeting starts ____ 9:00 AM.',
          options: ['at', 'in', 'on'],
          answerIndex: 0,
          explanation: 'เวลาเป๊ะ ๆ ใช้ at → at 9:00 AM',
        },
        {
          sentence: 'She is waiting ____ the door.',
          options: ['on', 'at', 'in'],
          answerIndex: 1,
          explanation: 'จุดเฉพาะเจาะจง (ประตู) ใช้ at → at the door',
        },
        {
          sentence: 'I will meet my teacher ____ the school gate ____ 8:30 AM ____ Monday.',
          options: ['in', 'at / at / on', 'on', 'at / in / on'],
          answerIndex: 1,
          explanation:
            'At ใช้กับจุดเฉพาะและเวลาเป๊ะ → at the school gate, at 8:30 AM และ On ใช้กับวัน → on Monday',
        },
      ],
    },
  },
  {
    type: 'rule',
    heading: 'TO (ทิศทาง / ปลายทาง)',
    chip: 'to (ทิศทาง)',
    description: 'ใช้ to บอกทิศทางหรือปลายทางที่กำลังจะไป',
    rows: [
      { left: 'ไปยังสถานที่ใช้ to', right: 'I go ==to school== every day.' },
      { left: 'ไปหาคนหรือบ้านใช้ to', right: 'She walked ==to== her friend\'s house.' },
      { left: 'จุดเริ่มต้นใช้ from, ปลายทางใช้ to', right: 'The bus goes ==from== Bangkok ==to== Chiang Mai.' },
    ],
    examples: [
      { en: 'I go to school every day.', th: 'ฉันไปโรงเรียนทุกวัน', ok: true },
      { en: 'We drove to the airport.', th: 'เราขับรถไปสนามบิน', ok: true },
      { en: 'I go school every day.', th: 'ผิด: ขาด to หน้าสถานที่', ok: false },
    ],
    tip: 'การไปยังสถานที่ต้องมี to เสมอ เช่น go to school (ไม่ใช่ go school)',
  },
  {
    type: 'rule',
    heading: 'FOR / SINCE (ระยะเวลา)',
    chip: 'for / since (ระยะเวลา)',
    description:
      'ใช้ for และ since กับ Present Perfect เพื่อบอกว่าเหตุการณ์ดำเนินมาถึงตอนนี้นานแค่ไหน',
    rows: [
      { left: 'for + ช่วงเวลา (ระยะเวลายาว)', right: 'I have lived here ==for== five years.' },
      { left: 'since + จุดเริ่มต้น (ปี วัน หรือเวลา)', right: 'I have lived here ==since== 2020.' },
      { left: 'จำง่าย: for = นานเท่าไหร่ / since = ตั้งแต่เมื่อไหร่', right: 'She has worked here ==since== Monday.' },
    ],
    examples: [
      { en: 'I have worked here for three years.', th: 'ฉันทำงานที่นี่มาสามปีแล้ว', ok: true },
      { en: 'He has been sick since Monday.', th: 'เขาป่วยตั้งแต่วันจันทร์', ok: true },
      { en: 'I have worked here since three years.', th: 'ผิด: since ใช้กับช่วงเวลาไม่ได้ ต้องใช้ for', ok: false },
    ],
    tip: 'for ตามด้วยช่วงเวลา (three years) ส่วน since ตามด้วยจุดเริ่ม (2020, Monday)',
  },
  {
    type: 'rule',
    heading: 'LOOK FORWARD TO (ตั้งตารอ)',
    chip: 'look forward to',
    description: 'วลีนี้ to เป็น preposition จึงตามด้วยคำนามหรือ V-ing ไม่ใช่ V.1',
    rows: [
      { left: 'look forward to + คำนาม', right: 'I ==look forward to== the holiday.' },
      { left: 'look forward to + V-ing', right: 'We ==look forward to== ==meeting== you.' },
    ],
    examples: [
      { en: 'She is looking forward to the party.', th: 'เธอกำลังตั้งตารอปาร์ตี้', ok: true },
      { en: 'I look forward to hearing from you.', th: 'ฉันรอการติดต่อจากคุณ', ok: true },
      { en: 'I look forward to meet you.', th: 'ผิด: หลัง to ต้องเป็น V-ing (meeting)', ok: false },
    ],
    tip: 'to ในวลีนี้เป็นคำบุพบท จึงตามด้วย V-ing หรือคำนาม',
  },
  {
    type: 'rule',
    heading: 'LOOK LIKE (ดูเหมือน / หน้าตาคล้าย)',
    chip: 'look like',
    description: 'look like + คำนาม ใช้บอกลักษณะภายนอกหรือหน้าตาที่คล้ายใครหรือสิ่งใด',
    rows: [
      { left: 'หน้าตาคล้ายใคร ใช้ look like + คน', right: 'She ==looks like== her mother.' },
      { left: 'ดูเหมือนสิ่งใด ใช้ look like + คำนาม', right: 'It ==looks like== rain.' },
      { left: 'look (+adj) ต่างจาก look like (+noun)', right: 'She ==looks happy.== / She ==looks like== a doctor.' },
    ],
    examples: [
      { en: 'He looks like his father.', th: 'เขาหน้าตาคล้ายพ่อ', ok: true },
      { en: 'It looks like rain.', th: 'ดูเหมือนฝนจะตก', ok: true },
      { en: 'She looks like happy.', th: 'ผิด: หลัง look like ต้องเป็นคำนาม ไม่ใช่ adjective', ok: false },
    ],
    tip: 'look + adjective (looks happy) / look like + noun (looks like her mother)',
  },
  {
    type: 'rule',
    heading: 'WORRIED ABOUT (กังวลเรื่อง)',
    chip: 'worried about',
    description: 'worried เป็น adjective ที่ต้องใช้คู่กับ about แล้วตามด้วยคำนามหรือ V-ing',
    rows: [
      { left: 'worried about + คำนาม', right: 'I am ==worried about== the exam.' },
      { left: 'worried about + V-ing', right: 'She is ==worried about== ==losing== her job.' },
    ],
    examples: [
      { en: 'He is worried about his health.', th: 'เขากังวลเรื่องสุขภาพ', ok: true },
      { en: "Don't worry about being late.", th: 'ไม่ต้องกังวลเรื่องการมาสาย', ok: true },
      { en: 'I am worried of the exam.', th: 'ผิด: worried ต้องใช้กับ about ไม่ใช่ of', ok: false },
    ],
    tip: 'worried ต้องคู่กับ about เสมอ',
  },
  {
    type: 'rule',
    heading: 'STRIKE SOMEONE AS (รู้สึกว่า / ดูในสายตาของ)',
    chip: 'strike someone as',
    description:
      'ใช้บอกความประทับใจหรือความรู้สึกที่มีต่อคนหรือสิ่งของ โดยคนที่รู้สึกจะอยู่หลัง strike',
    rows: [
      { left: 'strike + ใคร + as + adjective', right: 'The movie ==struck me as== funny.' },
      { left: 'strike + ใคร + as + คำนาม', right: 'He ==struck== her ==as== a kind person.' },
    ],
    examples: [
      { en: 'The movie struck me as funny.', th: 'หนังดูตลกในความรู้สึกของฉัน', ok: true },
      { en: 'She struck him as honest.', th: 'เขารู้สึกว่าเธอดูซื่อสัตย์', ok: true },
      { en: 'The movie struck me like funny.', th: 'ผิด: ต้องใช้ as ไม่ใช่ like', ok: false },
    ],
    tip: 'strike someone as = ฉันรู้สึกว่า... / ฉันคิดว่า... (ความรู้สึกต่อคนหรือสิ่งนั้น)',
  },
];

const APPLY = process.argv.includes('--apply');

async function main() {
  const [row] = await db.select().from(testExplains).where(eq(testExplains.id, EXPLAIN_ID)).limit(1);
  if (!row) throw new Error(`ไม่พบ test_explains id=${EXPLAIN_ID}`);

  const current = row.sections as unknown[];
  console.log(`sections ปัจจุบัน: ${current.length}`);
  console.log(`sections ที่จะคืน: ${ORIGINAL.length}`);

  writeFileSync(
    'tmp/prep4-before-fix.json',
    JSON.stringify({ id: EXPLAIN_ID, sections: ORIGINAL }, null, 2),
    'utf8',
  );
  console.log('เขียน snapshot: tmp/prep4-before-fix.json');

  if (!APPLY) {
    console.log('\n--- DRY RUN --- ใส่ --apply เพื่อบันทึก');
    return;
  }

  await db.update(testExplains).set({ sections: ORIGINAL as typeof testExplains.$inferInsert['sections'] }).where(eq(testExplains.id, EXPLAIN_ID));
  const after = (await db.select({ sections: testExplains.sections })
    .from(testExplains)
    .where(eq(testExplains.id, EXPLAIN_ID))
    .limit(1))[0]?.sections as unknown[];
  console.log(`คืนแล้ว: ${after.length} sections`);
}

main().then(() => process.exit(0));