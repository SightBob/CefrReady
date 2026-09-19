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
  // ฝึกเบาๆ แค่ 2 ข้อต่อ Node เพราะเป็นการอบอุ่นความเข้าใจก่อนลงสนามจริง
  const items: TapItem[][] = [
    [
      sentencePair('The shop closes at 8 pm.', 'The shop close at 8 pm.'),
      sentencePair('Anna stays at home on Tuesdays.', 'Anna stay at home on Tuesdays.'),
    ],
    [
      sentencePair('John and Mary go to school.', 'John and Mary goes to school.'),
      sentencePair('They have two children.', 'They has two children.'),
    ],
    [
      sentencePair('Everyone loves music.', 'Everyone love music.'),
      sentencePair('Something is in the box.', 'Something are in the box.'),
    ],
  ];
  return items[nodeIndex] ?? items[0];
}

const CONTENT: NodeContent[] = [
  {
    title: 'ฝั่งเอกพจน์ — คนเดียวต้องเติม s',
    intro: 'ฝั่งนี้คือพวกที่มีแค่ 1 เดียว หรือถูกเหมารวมให้เป็นก้อนเดียว กริยาข้างหลังจะเหงาๆ ต้องหา s มาแปะเป็นเพื่อนเสมอนะ',
    sections: [
      {
        heading: '🧠 Golden Rule — เอกพจน์ = กริยาเติม s หรือใช้ is',
        body: '“He, She, It, Cat, John — อะไรก็ได้ที่มีคนเดียว สิ่งเดียว → กริยาเติม s/es” จำประโยคนี้ไว้ก่อน แล้วค่อยไปต่อ',
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
        heading: 'แก๊งตัวแสบที่ชอบออกสอบ — every-, some-, any-, no-',
        body: 'คำที่ขึ้นต้นด้วย every-, some-, any-, no- เช่น everyone, everybody, everything, someone, somebody, something, anyone, anybody, anything, no one, nobody, nothing — พวกนี้ทั้งหมด “ถือว่าเป็นเอกพจน์” เสมอ! แม้ภาษาไทยจะแปลว่า “ทุกคน” (ดูเหมือนหลายคน) แต่ฝรั่งเขาเหมาว่ามันคือ “แต่ละคน/แต่ละสิ่ง” ที่เอามายืนเรียงเดี่ยวๆ',
        examples: [
          { en: 'Everyone loves music.', th: 'ห้ามใช้ love โล้นๆ — everyone นับเป็นเอกพจน์ ต้องเติม s', ok: true },
          { en: 'Something is in the box.', th: 'สิ่งของมีก้อนเดียว → is', ok: true },
          { en: 'Everyone like music.', th: 'ผิด → ต้องเป็น Everyone loves', ok: false },
        ],
      },
    ],
    vocabBank: {
      columns: ['ประธาน', 'รูปกริยา', 'ตัวอย่าง'],
      rows: [
        ['He / She / It / ชื่อคน', 'เติม s / es', 'She plays tennis.'],
        ['Everyone / Somebody / Nobody', 'เอกพจน์ เติม s', 'Everyone loves music.'],
        ['Something / Anything / Nothing', 'ใช้ is', 'Something is in the box.'],
      ],
    },
    tip: 'เห็น he, she, it ชื่อคนเดียว หรือแก๊ง every-/some-/any-/no- ให้เติม s ทันที',
    questions: [
      { sentence: 'The shop ____ at 8 pm.', options: ['close', 'closes', 'closing', 'closed'], answerIndex: 1, explanation: 'The shop เป็นสิ่งเดียว จึงใช้ closes' },
      { sentence: 'Luca often ____ funny messages.', options: ['send', 'sends', 'sending', 'sent'], answerIndex: 1, explanation: 'Luca เป็นคนเดียว จึงใช้ sends' },
      { sentence: 'Everyone ____ music.', options: ['love', 'loves', 'loving', 'loved'], answerIndex: 1, explanation: 'everyone ถือเป็นเอกพจน์ จึงใช้ loves' },
      { sentence: 'Sometimes she ____ a piece of bread to give to the birds.', options: ['take', 'takes', 'taking', 'took'], answerIndex: 1, explanation: 'she เป็นเอกพจน์ จึงใช้ takes' },
      { sentence: 'Something ____ in the box.', options: ['is', 'are', 'were', 'be'], answerIndex: 0, explanation: 'something เป็นเอกพจน์ จึงใช้ is' },
      { sentence: 'Sarah ____ English every evening.', options: ['study', 'studies', 'studying', 'studied'], answerIndex: 1, explanation: 'study เมื่อใช้กับ Sarah เปลี่ยน y เป็น ies → studies' },
    ],
  },
  {
    title: 'ฝั่งพหูพจน์ — หลายคนห้ามเติม s',
    intro: 'ฝั่งนี้คือพวกที่มากันตั้งแต่ 2 คนขึ้นไป หรือพวกที่ขอแหกกฎ — กริยาปล่อยโล้นๆ ไว้ ไม่ต้องเติม s นะ',
    sections: [
      {
        heading: '🧠 Golden Rule — หลายคน กริยาไม่เติม s',
        body: '“We, They, Cats (หลายคน หลายตัว) + verb รูปเดิม” เห็นประธานฝั่งนี้ก็ใช้ play, work, have แบบนี้ได้เลย',
        examples: [
          { en: 'They play football.', th: 'they หลายคน → play ไม่เติม s', ok: true },
          { en: 'We study English every day.', th: 'we → study รูปเดิม', ok: true },
          { en: 'They plays football.', th: 'ผิด → ต้องเป็น They play', ok: false },
        ],
        table: {
          headers: ['ประธาน', 'รูปกริยา', 'ตัวอย่าง'],
          rows: [
            ['We / They / Cats', 'รูปพื้นฐาน', 'They play football.'],
            ['หลายอย่างมา + and', 'กลายเป็นหมู่คณะ → ไม่เติม s', 'John and Mary go to school.'],
            ['I / You (ข้อยกเว้นใจเด็ด)', 'ดูเหมือนคนเดียวแต่ห้ามเติม s', 'I like cats. / You know me.'],
          ],
        },
      },
      {
        heading: 'เอาหลายอย่างมารวมกันด้วย And = หมู่คณะทันที',
        body: 'พอมี And เชื่อมสองคนหรือสองสิ่งเข้าด้วยกัน ประธานกลายเป็นพหูพจน์ กริยาปล่อยโล้นๆ ได้เลย',
        examples: [
          { en: 'John and Mary go to school.', th: 'มีสองคนแล้ว กริยาไม่ต้องเติม s', ok: true },
          { en: 'Tom and Jane have a dog.', th: 'สองคน → have', ok: true },
          { en: 'John and Mary goes to school.', th: 'ผิด → ต้องเป็น go', ok: false },
        ],
      },
      {
        heading: 'ข้อยกเว้นใจเด็ด — I กับ You',
        body: 'สองคนนี้กวนโอ๊ยที่สุด หน้าตาดูเหมือนมีแค่ตัวคนเดียว แต่ใจเด็ดขาดอยู่ฝั่งพหูพจน์ กริยาห้ามเติม s เด็ดขาด',
        examples: [
          { en: 'I like cats.', th: 'I → like รูปเดิม ห้ามเติม s', ok: true },
          { en: 'You know me.', th: 'You → know รูปเดิม', ok: true },
          { en: 'I likes cats.', th: 'ผิด → I ต้องใช้ like', ok: false },
        ],
      },
    ],
    vocabBank: {
      columns: ['ประธาน', 'รูปกริยา', 'ตัวอย่าง'],
      rows: [
        ['We / They / Cats', 'ไม่เติม s', 'They play tennis.'],
        ['A and B (สองคนขึ้นไป)', 'ไม่เติม s', 'John and Mary go to school.'],
        ['I / You', 'ไม่เติม s (ข้อยกเว้น)', 'I like cats. / You know me.'],
      ],
    },
    tip: 'หลายคน มี And เชื่อม หรือเจอ I กับ You — กริยาปล่อยโล้นๆ ไว้ จบปิ๊ง ไม่โดนแกงแน่นอน',
    questions: [
      { sentence: 'They ____ two children, Sally and Billy.', options: ['has', 'have', 'had', 'having'], answerIndex: 1, explanation: 'They เป็นพหูพจน์ จึงใช้ have' },
      { sentence: 'John and Mary ____ to school together.', options: ['goes', 'go', 'going', 'gone'], answerIndex: 1, explanation: 'สองคนเชื่อมด้วย and = พหูพจน์ ใช้ go' },
      { sentence: 'I ____ cats.', options: ['likes', 'like', 'liking', 'liked'], answerIndex: 1, explanation: 'I เป็นข้อยกเว้น ใช้กริยารูปเดิม คือ like' },
      { sentence: 'We ____ English every day.', options: ['study', 'studies', 'studying', 'studied'], answerIndex: 0, explanation: 'We ใช้กริยารูปพื้นฐาน คือ study' },
      { sentence: 'The students ____ hard.', options: ['work', 'works', 'working', 'worked'], answerIndex: 0, explanation: 'The students เป็นพหูพจน์ จึงใช้ work' },
      { sentence: 'You ____ me very well.', options: ['knows', 'know', 'knowing', 'knew'], answerIndex: 1, explanation: 'You ใช้กริยารูปเดิม ห้ามเติม s' },
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
          { heading: '✨ Tap & Select — ฝึกแยกประโยคให้ถูก', body: 'อ่านประโยค A กับ B แล้วเลือกประโยคที่ถูกต้องนะ ผิดได้ ไม่เป็นไร ดูเหตุผลแล้วลองใหม่ได้เลย', tap: { title: tapTitle, items: tapItemsFor(index) } },
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
