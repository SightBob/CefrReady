/** Update Unit 2: Subject-Verb Agreement with friendly concept + inline Tap & Select. */
import 'dotenv/config';
import { db } from '../src/db';
import { learningUnits, learningNodes, lessonPages } from '../src/db/schema';
import { asc, eq } from 'drizzle-orm';

type Example = { en: string; th: string; ok: boolean };
type TapItem = { prompt: string; choiceA: string; choiceB: string; correct: 0 | 1 };
type Question = { sentence: string; options: string[]; answerIndex: number; explanation: string };

type NodeContent = {
  title: string;
  intro: string;
  sections: Array<{
    heading: string;
    body: string;
    examples?: Example[];
    table?: { headers: string[]; rows: string[][] };
    tap?: { title: string; items: TapItem[] };
  }>;
  vocabBank: { columns: string[]; rows: string[][] };
  tip: string;
  questions: Question[];
};

const tapTitle = 'Tap & Select — ฝึกแยกประโยคให้ถูก';
const sentencePair = (correctSentence: string, wrongSentence: string): TapItem => ({
  prompt: 'ข้อไหนถูกต้อง',
  choiceA: correctSentence,
  choiceB: wrongSentence,
  correct: 0,
});

function tapItemsFor(nodeIndex: number): TapItem[] {
  const items: TapItem[][] = [
    [
      sentencePair('The shop closes at 8 pm.', 'The shop close at 8 pm.'),
      sentencePair('Luca sends funny messages.', 'Luca send funny messages.'),
      sentencePair('My friend loves this song.', 'My friend love this song.'),
      sentencePair('Anna stays at home on Tuesdays.', 'Anna stay at home on Tuesdays.'),
      sentencePair('Sarah studies English every evening.', 'Sarah study English every evening.'),
    ],
    [
      sentencePair('They have two children.', 'They has two children.'),
      sentencePair('We study English every day.', 'We studies English every day.'),
      sentencePair('Tom and Jane are friends.', 'Tom and Jane is friends.'),
      sentencePair('Do they live near here?', 'Do they lives near here?'),
      sentencePair('They do not want flies around their houses.', 'They does not want flies around their houses.'),
    ],
    [
      sentencePair('Everyone likes pizza.', 'Everyone like pizza.'),
      sentencePair('Each student has a book.', 'Each student have a book.'),
      sentencePair('Neither answer is correct.', 'Neither answer are correct.'),
      sentencePair('Some of the students are absent.', 'Some of the students is absent.'),
      sentencePair('Nobody knows the answer.', 'Nobody know the answer.'),
    ],
  ];
  return items[nodeIndex] ?? items[0];
}

const CONTENT: NodeContent[] = [
  {
    title: 'ประธานเอกพจน์',
    intro: 'เริ่มจากดูประธานก่อนเลย ถ้ามีคนหรือสิ่งเดียว เช่น he, she, it หรือชื่อคนหนึ่งคน กริยาใน Present Simple มักเติม s หรือ es นะ',
    sections: [
      {
        heading: '🧠 Golden Rule — คนเดียว กริยาต้องเติม s/es',
        body: '“He, She, It หรือคำนามเอกพจน์ + verb เติม s/es” จำประโยคนี้ไว้ก่อน แค่นี้ก็เริ่มทำโจทย์ได้แล้ว',
        examples: [
          { en: 'She plays tennis.', th: 'she คนเดียว → play เติม s', ok: true },
          { en: 'The shop closes at 8 pm.', th: 'the shop หนึ่งร้าน → close เติม s', ok: true },
          { en: 'He work at a bank.', th: 'ผิด → ต้องเป็น He works', ok: false },
        ],
        table: {
          headers: ['ประธาน', 'รูปกริยา', 'ตัวอย่าง'],
          rows: [
            ['He / She / It', 'เติม s หรือ es', 'She plays tennis.'],
            ['ชื่อคน / สิ่งของหนึ่งชิ้น', 'เติม s หรือ es', 'Anna stays home.'],
            ['ลงท้ายพยัญชนะ + y', 'เปลี่ยน y เป็น ies', 'Sarah studies English.'],
          ],
        },
      },
      {
        heading: 'เติม s หรือ es แบบไหน?',
        body: 'ส่วนใหญ่เติม s ได้เลย เช่น play → plays, love → loves ถ้าลงท้ายด้วย s, sh, ch, x หรือ o ให้เติม es เช่น close → closes, go → goes',
        examples: [
          { en: 'My friend loves this song.', th: 'love → loves', ok: true },
          { en: 'Sometimes she takes a piece of bread.', th: 'take → takes', ok: true },
          { en: 'The shop close at 8 pm.', th: 'ผิด → ต้องเป็น closes', ok: false },
        ],
      },
      {
        heading: 'ถ้ามี Does แล้ว กริยาไม่เติม s',
        body: 'คำถามและปฏิเสธใช้ Does/doesn’t กับประธานเอกพจน์ แล้วกริยาหลักกลับเป็นรูปเดิม เช่น Does she like…? ไม่ใช่ Does she likes…?',
        examples: [
          { en: 'Does she like coffee?', th: 'ถูก → Does + like', ok: true },
          { en: 'She doesn’t like tea.', th: 'ถูก → doesn’t + like', ok: true },
          { en: 'Does she likes coffee?', th: 'ผิด → หลัง Does ไม่เติม s', ok: false },
        ],
      },
    ],
    vocabBank: {
      columns: ['ประธาน', 'รูปกริยา', 'ตัวอย่าง'],
      rows: [
        ['He / She / It', 'เติม s / es', 'She plays tennis.'],
        ['ชื่อคนหนึ่งคน', 'เติม s / es', 'Luca sends messages.'],
        ['Does / doesn’t + verb', 'กริยารูปเดิม', 'Does she like coffee?'],
      ],
    },
    tip: 'เห็น he, she, it หรือชื่อคนหนึ่งคน ให้เช็กกริยาทันทีว่าเติม s/es หรือยังนะ',
    questions: [
      { sentence: 'The shop ____ at 8 pm.', options: ['close', 'closes', 'closing', 'closed'], answerIndex: 1, explanation: 'The shop เป็นสิ่งเดียว จึงใช้ closes' },
      { sentence: 'Luca often ____ funny messages.', options: ['send', 'sends', 'sending', 'sent'], answerIndex: 1, explanation: 'Luca เป็นคนเดียว จึงใช้ sends' },
      { sentence: 'My friend ____ this song.', options: ['love', 'loves', 'loving', 'loved'], answerIndex: 1, explanation: 'My friend เป็นเอกพจน์ จึงใช้ loves' },
      { sentence: 'Sometimes she ____ a piece of bread to give to the birds.', options: ['take', 'takes', 'taking', 'took'], answerIndex: 1, explanation: 'she เป็นเอกพจน์ จึงใช้ takes' },
      { sentence: 'Anna ____ at home on Tuesdays.', options: ['stay', 'stays', 'staying', 'stayed'], answerIndex: 1, explanation: 'Anna เป็นคนเดียว จึงใช้ stays' },
      { sentence: 'Sarah ____ English every evening.', options: ['study', 'studies', 'studying', 'studied'], answerIndex: 1, explanation: 'study เมื่อใช้กับ Sarah เปลี่ยน y เป็น ies → studies' },
    ],
  },
  {
    title: 'ประธานพหูพจน์',
    intro: 'ถ้าประธานมีหลายคนหรือใช้ I, you, we, they กริยาใน Present Simple ใช้รูปพื้นฐาน ไม่ต้องเติม s นะ',
    sections: [
      {
        heading: '🧠 Golden Rule — หลายคน กริยาไม่เติม s',
        body: '“I, You, We, They และประธานพหูพจน์ + verb รูปเดิม” เห็นประธานหลายคนก็ใช้ play, work, have แบบนี้ได้เลย',
        examples: [
          { en: 'They play football.', th: 'they หลายคน → play ไม่เติม s', ok: true },
          { en: 'We study English every day.', th: 'we → study รูปเดิม', ok: true },
          { en: 'They plays football.', th: 'ผิด → ต้องเป็น They play', ok: false },
        ],
        table: {
          headers: ['ประธาน', 'รูปกริยา', 'ตัวอย่าง'],
          rows: [
            ['I / You / We / They', 'รูปพื้นฐาน', 'They play football.'],
            ['คนหรือสิ่งของหลายอย่าง', 'รูปพื้นฐาน', 'The students work hard.'],
            ['ประธาน + and', 'มักเป็นพหูพจน์', 'Tom and Jane are friends.'],
          ],
        },
      },
      {
        heading: 'have หรือ has?',
        body: 'have ใช้กับ I, you, we, they และประธานพหูพจน์ ส่วน has ใช้กับ he, she, it และประธานเอกพจน์',
        examples: [
          { en: 'They have two children.', th: 'they → have', ok: true },
          { en: 'Tom and Jane have a dog.', th: 'สองคน → have', ok: true },
          { en: 'They has two children.', th: 'ผิด → ต้องเป็น They have', ok: false },
        ],
      },
      {
        heading: 'ใช้ Do ในคำถามและปฏิเสธ',
        body: 'Do ใช้กับ I, you, we, they และประธานพหูพจน์ หลัง Do หรือ don’t กริยาหลักใช้รูปเดิม เช่น Do they play…? และ They don’t play…',
        examples: [
          { en: 'Do you like coffee?', th: 'ถูก → Do + like', ok: true },
          { en: 'They do not want flies around their houses.', th: 'ถูก → do not + want', ok: true },
          { en: 'Do they likes coffee?', th: 'ผิด → หลัง Do ใช้ like', ok: false },
        ],
      },
    ],
    vocabBank: {
      columns: ['ประธาน', 'รูปกริยา', 'ตัวอย่าง'],
      rows: [
        ['I / You / We / They', 'ไม่เติม s', 'They play tennis.'],
        ['Tom and Jane', 'ไม่เติม s', 'They have a dog.'],
        ['Do / don’t + verb', 'กริยารูปเดิม', 'Do they like coffee?'],
      ],
    },
    tip: 'จำสั้นๆ: ประธานหลายคนไม่เติม s ส่วน has เป็นคำที่ต้องจับคู่กับคนเดียวเท่านั้น',
    questions: [
      { sentence: 'They ____ two children, Sally and Billy.', options: ['has', 'have', 'had', 'having'], answerIndex: 1, explanation: 'They เป็นพหูพจน์ จึงใช้ have' },
      { sentence: 'My friends ____ a new car.', options: ['has', 'have', 'having', 'had'], answerIndex: 1, explanation: 'My friends มีหลายคน จึงใช้ have' },
      { sentence: 'Tom and Jane ____ friends.', options: ['is', 'are', 'was', 'has'], answerIndex: 1, explanation: 'Tom and Jane มีสองคน จึงใช้ are' },
      { sentence: 'We ____ English every day.', options: ['study', 'studies', 'studying', 'studied'], answerIndex: 0, explanation: 'We ใช้กริยารูปพื้นฐาน คือ study' },
      { sentence: 'The students ____ hard.', options: ['work', 'works', 'working', 'worked'], answerIndex: 0, explanation: 'The students เป็นพหูพจน์ จึงใช้ work' },
      { sentence: 'Do they ____ near here?', options: ['live', 'lives', 'lived', 'living'], answerIndex: 0, explanation: 'หลัง Do ใช้กริยารูปเดิม คือ live' },
    ],
  },
  {
    title: 'คำที่ดูเหมือนหลายคน แต่ใช้เอกพจน์',
    intro: 'บางคำพูดถึงหลายคนหรือหลายชิ้น แต่คำหลักเป็นคนละหนึ่ง เช่น everyone, each, somebody และ neither แบบนี้ใช้กริยาเอกพจน์นะ',
    sections: [
      {
        heading: '🧠 Golden Rule — each / every / -one ใช้กริยาเอกพจน์',
        body: '“everyone, everybody, someone, nobody, each, every, either, neither = มองเป็นหนึ่ง” เพราะฉะนั้นกริยาตามหลังจึงเติม s หรือใช้ is/has',
        examples: [
          { en: 'Everyone likes pizza.', th: 'everyone มองเป็นแต่ละคนรวมกันเป็นหนึ่งกลุ่มทางไวยากรณ์ → likes', ok: true },
          { en: 'Each student has a book.', th: 'each student ทีละหนึ่งคน → has', ok: true },
          { en: 'Everyone like pizza.', th: 'ผิด → ต้องเป็น Everyone likes', ok: false },
        ],
        table: {
          headers: ['คำประธาน', 'มองเป็น', 'ตัวอย่าง'],
          rows: [
            ['Everyone / Everybody', 'เอกพจน์', 'Everyone likes pizza.'],
            ['Each / Every', 'ทีละหนึ่ง', 'Each student has a book.'],
            ['Neither / Either', 'หนึ่งในสอง / ไม่ใช่ทั้งคู่', 'Neither answer is correct.'],
          ],
        },
      },
      {
        heading: 'Neither of + คำนามพหูพจน์',
        body: 'อย่าให้คำว่า girls หรือ answers หลอกตา ใน Neither of the girls คำหลักคือ Neither จึงใช้ is/has หรือกริยาเติม s',
        examples: [
          { en: 'Neither answer is correct.', th: 'ไม่มีคำตอบไหนถูก → is', ok: true },
          { en: 'Neither of the girls is my student.', th: 'neither เป็นประธานหลัก → is', ok: true },
          { en: 'Neither answer are correct.', th: 'ผิด → ต้องเป็น is', ok: false },
        ],
      },
      {
        heading: 'Some / all ดูคำนามที่ตามหลัง',
        body: 'some, all, most และ none ยืดหยุ่นได้ ถ้าตามด้วยคำนามนับไม่ได้ใช้เอกพจน์ แต่ถ้าตามด้วยหลายคนหรือหลายชิ้นใช้พหูพจน์',
        examples: [
          { en: 'Some of the water is cold.', th: 'water นับไม่ได้ → is', ok: true },
          { en: 'Some of the students are absent.', th: 'students หลายคน → are', ok: true },
        ],
      },
    ],
    vocabBank: {
      columns: ['ประธาน', 'รูปกริยา', 'ตัวอย่าง'],
      rows: [
        ['Everyone / Each / Nobody', 'เอกพจน์ เติม s', 'Everyone likes pizza.'],
        ['Neither of + plural noun', 'ใช้ is / has / V-s', 'Neither of them is ready.'],
        ['Some / All / Most', 'ดูคำนามที่ตามหลัง', 'Some students are here.'],
      ],
    },
    tip: 'ให้มองคำแรกเป็นหลัก อย่าโดนคำนามหลัง of หลอก เช่น Neither of the girls is…',
    questions: [
      { sentence: 'Everybody ____ ready.', options: ['is', 'are', 'be', 'were'], answerIndex: 0, explanation: 'Everybody ถือเป็นเอกพจน์ จึงใช้ is' },
      { sentence: 'Everyone ____ the rules.', options: ['know', 'knows', 'knew', 'knowing'], answerIndex: 1, explanation: 'Everyone เป็นเอกพจน์ จึงใช้ knows' },
      { sentence: 'Each student ____ a book.', options: ['has', 'have', 'having', 'had'], answerIndex: 0, explanation: 'Each student คือทีละหนึ่งคน จึงใช้ has' },
      { sentence: 'Neither answer ____ correct.', options: ['is', 'are', 'were', 'be'], answerIndex: 0, explanation: 'Neither ใช้กริยาเอกพจน์ คือ is' },
      { sentence: 'Some of the students ____ absent.', options: ['is', 'are', 'be', 'was'], answerIndex: 1, explanation: 'students เป็นพหูพจน์ จึงใช้ are' },
      { sentence: 'Man: Are those your students? Woman: Neither of the two girls ____ my student.', options: ['is', 'have been', 'are', 'were'], answerIndex: 0, explanation: 'ประธานหลักคือ Neither จึงใช้ is' },
    ],
  },
];

async function main() {
  const [unit] = await db.select().from(learningUnits).where(eq(learningUnits.title, 'Subject-Verb Agreement')).limit(1);
  if (!unit) throw new Error('ไม่พบ Unit 2: Subject-Verb Agreement');

  const nodes = await db
    .select()
    .from(learningNodes)
    .where(eq(learningNodes.unitId, unit.id))
    .orderBy(asc(learningNodes.orderIndex), asc(learningNodes.id));
  if (nodes.length < CONTENT.length) throw new Error(`Unit 2 มี Node ไม่ครบ 3 รายการ (พบ ${nodes.length})`);

  await db.transaction(async (tx) => {
    for (const [index, content] of CONTENT.entries()) {
      const node = nodes[index];
      await tx.update(learningNodes).set({
        title: `Node ${index + 1}: ${content.title}`,
        kind: index === CONTENT.length - 1 ? 'trophy' : 'star',
        orderIndex: index,
        isPublished: true,
      }).where(eq(learningNodes.id, node.id));

      await tx.delete(lessonPages).where(eq(lessonPages.nodeId, node.id));
      await tx.insert(lessonPages).values({
        nodeId: node.id,
        pageType: 'explain',
        intro: content.intro,
        sections: [
          ...content.sections,
          { heading: 'ลองฝึกกันเลย', body: 'อ่านประโยคทั้งสองอัน แล้วเลือกประโยคที่ถูกต้องได้เลย ไม่ต้องกลัวผิดนะ', tap: { title: tapTitle, items: tapItemsFor(index) } },
        ],
        quiz: null,
        vocabBank: content.vocabBank,
        tip: content.tip,
        isPublished: true,
        orderIndex: 0,
      });
      await tx.insert(lessonPages).values({
        nodeId: node.id,
        pageType: 'quiz',
        sections: [],
        quiz: { questions: content.questions },
        vocabBank: null,
        tip: null,
        intro: null,
        isPublished: true,
        orderIndex: 1,
      });
    }
  });

  const updatedNodes = await db.select().from(learningNodes).where(eq(learningNodes.unitId, unit.id)).orderBy(asc(learningNodes.orderIndex), asc(learningNodes.id));
  const updatedPages = await db.select().from(lessonPages).where(eq(lessonPages.nodeId, updatedNodes[0].id));
  console.log(JSON.stringify({ unitId: unit.id, nodes: updatedNodes.map((n) => n.title), pagesPerNode: updatedPages.length, tapInline: true, questionsPerNode: CONTENT.map((c) => c.questions.length) }, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
