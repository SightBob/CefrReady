/**
 * Rebuild Unit 1: Part of Speech only.
 *
 * Units 2–13 are untouched. Each node gets:
 *   1) Explain page with friendly "movie crew" Concept Card + inline Tap & Select
 *   2) Quiz page with six Real Exam questions
 *
 * Questions are hand-written for each part of speech (this unit is a
 * vocabulary/grammar-awareness unit, so the attached focus-form CSV has no
 * matching topic row for it).
 *
 * Run: npx tsx scripts/rebuild-unit1-part-of-speech.ts
 */
import 'dotenv/config';
import { db } from '../src/db';
import { learningUnits, learningNodes, lessonPages } from '../src/db/schema';
import { eq } from 'drizzle-orm';

type Example = { en: string; th: string; ok: boolean };
type Question = { sentence: string; options: string[]; answerIndex: number; explanation: string };
type TapItem = { prompt: string; choiceA: string; choiceB: string; correct: 0 | 1 };

type NodeSpec = {
  title: string;
  intro: string;
  sections: Array<{
    heading: string;
    body: string;
    examples: Example[];
    table?: { headers: string[]; rows: string[][] };
  }>;
  vocab: { columns: string[]; rows: string[][] };
  tip: string;
  tap: TapItem[];
  questions: Question[];
};

const UNIT_TITLE = 'Part of Speech';
const TAP_TITLE = '✨ Tap & Select — ฝึกแยกประโยคให้ถูก';

function pair(correct: string, wrong: string): TapItem {
  return { prompt: 'ข้อไหนถูกต้อง', choiceA: correct, choiceB: wrong, correct: 0 };
}

function q(sentence: string, options: string[], answerIndex: number, explanation: string): Question {
  return { sentence, options, answerIndex, explanation };
}

const SPEC: NodeSpec[] = [
  {
    title: 'Noun & Pronoun — ตัวละครหลักและตัวแสดงแทน',
    intro: 'ภาพกองถ่ายหนังเรื่องนึงนะ พระเอกนางเอกคือ Noun (คน สัตว์ สิ่งของ สถานที่) ส่วน Pronoun คือสตันท์แมนที่โผล่มาแทนชื่อเพื่อไม่ให้พูดชื่อเดิมซ้ำจนเลี่ยน',
    sections: [
      {
        heading: '🧠 Golden Rule — Noun ชี้ว่าใคร/อะไร · Pronoun แทนมันได้',
        body: 'Noun ตอบคำถาม “ใครทำ ทำอะไร ที่ไหน” เช่น Cat, Bangkok, Love ส่วน Pronoun คือ I, You, He, She, It, We, They ใช้แทน Noun ที่พูดไปแล้ว',
        examples: [
          { en: 'The dog runs.', th: 'dog เป็นตัวละครหลัก (Noun)', ok: true },
          { en: 'John is cool. He plays guitar.', th: 'He แทน John ได้เลย', ok: true },
          { en: 'John is cool. John plays guitar.', th: 'พูด John ซ้ำได้แต่ฟังไม่ลื่น', ok: false },
        ],
        table: {
          headers: ['ชนิด', 'หน้าที่ในกองถ่าย', 'ตัวอย่าง'],
          rows: [
            ['Noun', 'พระเอกนางเอก — ชื่อคน/สิ่ง/ที่', 'Cat, Bangkok, Love'],
            ['Pronoun', 'สตันท์แมน — ยืนแทน Noun', 'I, You, He, She, It, We, They'],
          ],
        },
      },
      {
        heading: 'ไหมต้องมี Pronoun?',
        body: 'เพราะชีวิตจะสบายขึ้นเยอะ ลองเล่าเรื่องเพื่อนโดยเรียกชื่อเต็มทุกประโยคดูสิ เลี่ยนแน่นอน',
        examples: [
          { en: 'Mary likes tea. She drinks it every morning.', th: 'She = Mary, it = tea', ok: true },
          { en: 'I saw Anna. I waved at Anna. Anna smiled at I.', th: 'ต้องใช้ her กับ waved และ me กับ smiled', ok: false },
        ],
      },
    ],
    vocab: {
      columns: ['ชนิด', 'หน้าที่', 'ตัวอย่าง'],
      rows: [
        ['Noun', 'ชื่อคน/สัตว์/สิ่ง/ที่/นามธรรม', 'Cat, Bangkok, Love'],
        ['Pronoun', 'แทน Noun เพื่อไม่พูดซ้ำ', 'I, You, He, She, It, We, They'],
        ['Personal Pronoun', 'ฉัน/เธอ/เขา', 'He plays guitar.'],
        ['Possessive', 'ของใคร', 'my, his, her, mine, hers'],
      ],
    },
    tip: 'เจอคำนามซ้ำๆ ในประโยคเดียวกัน ให้ลองเปลี่ยนรอบสองเป็น He / She / It ดู ประโยคจะลื่นขึ้นทันที',
    tap: [
      pair('John is cool. He plays guitar.', 'John is cool. John plays guitar.'),
      pair('Mary likes tea. She drinks it every morning.', 'Mary likes tea. Mary drinks tea every morning.'),
      pair('My dog is cute. It loves to sleep.', 'My dog is cute. My dog loves to sleep.'),
      pair('The kids are here. They are playing.', 'The kids are here. The kids are playing.'),
      pair('I saw Anna and waved at her.', 'I saw Anna and waved at Anna.'),
    ],
    questions: [
      q('John is a chef. ____ works in a French restaurant.', ['He', 'His', 'Him', 'They'], 0, 'แทน John ผู้ชายหนึ่งคน ใช้ He'),
      q('Mary likes tea. ____ drinks it every morning.', ['She', 'He', 'They', 'It'], 0, 'แทน Mary ใช้ She'),
      q('I have two cats. ____ sleep on my bed.', ['They', 'It', 'She', 'He'], 0, 'แมวสองตัว = หลายสิ่ง ใช้ They'),
      q('My brother and ____ went to the park.', ['I', 'me', 'my', 'mine'], 0, 'ประธานใช้ I ไม่ใช่ me'),
      q('The kids are playing with ____ toys.', ['their', 'theirs', 'them', 'they'], 0, 'คำนาม toys ตามหลัง จึงใช้ possessive adjective their'),
      q('This phone belongs to Anna. It is ____.', ['hers', 'her', 'she', 'herself'], 0, 'ไม่มีคำนามตามหลัง ใช้ possessive pronoun hers'),
    ],
  },
  {
    title: 'Verb — ฉากแอคชั่น หัวใจของประโยค',
    intro: 'Verb คือฉากแอคชั่นของหนัง ขาดมันประโยคตายสนิท เพราะมันบอกว่ากำลังทำอะไรอยู่ หรือสภาพเป็นยังไง',
    sections: [
      {
        heading: '🧠 Golden Rule — ไม่มี Verb ไม่มีประโยค',
        body: 'Verb บอกการกระทำ เช่น run, eat, sleep หรือบอกสภาพ เช่น is, am, are (เป็น/อยู่/คือ) ทุกประโยคสมบูรณ์ต้องมี Verb เสมอ',
        examples: [
          { en: 'She sleeps.', th: 'sleeps คือแอคชั่นของเรื่อง', ok: true },
          { en: 'He is tired.', th: 'is บอกสภาพ (เป็น/อยู่/คือ)', ok: true },
          { en: 'She tired.', th: 'ผิด — ขาด is ประโยคไม่สมบูรณ์', ok: false },
        ],
        table: {
          headers: ['ชนิด Verb', 'บอกอะไร', 'ตัวอย่าง'],
          rows: [
            ['Action', 'การกระทำ', 'run, eat, play'],
            ['Be-verbs', 'สภาพ/ความเป็นอยู่', 'is, am, are, was, were'],
            ['Have', 'ความเป็นเจ้าของ', 'have, has, had'],
          ],
        },
      },
      {
        heading: 'Verb เปลี่ยนรูปตามประธาน',
        body: 'คนเดียวเติม s หลายคนใช้รูปเดิม (เรื่องนี้เจาะลึกใน Unit Subject-Verb Agreement นะ)',
        examples: [
          { en: 'He runs every morning.', th: 'he คนเดียว → runs', ok: true },
          { en: 'They run every morning.', th: 'they หลายคน → run', ok: true },
        ],
      },
    ],
    vocab: {
      columns: ['ชนิด', 'หน้าที่', 'ตัวอย่าง'],
      rows: [
        ['Action Verb', 'บอกการกระทำ', 'Run, Eat, Sleep'],
        ['Be-verb', 'เป็น/อยู่/คือ', 'Is, Am, Are'],
        ['Have', 'มี/เป็นเจ้าของ', 'have, has, had'],
      ],
    },
    tip: 'อ่านประโยคแล้วรู้สึกว่าขาดอะไรสักอย่าง ให้หา Verb ก่อนเลย เพราะประโยคที่ไม่มี Verb คือประโยคที่พัง',
    tap: [
      pair('She sleeps at ten.', 'She sleep at ten.'),
      pair('He is tired after work.', 'He tired after work.'),
      pair('They run every morning.', 'They runs every morning.'),
      pair('The cat is on the sofa.', 'The cat sofa on is.'),
      pair('We eat lunch together.', 'We lunch eat together.'),
    ],
    questions: [
      q('She ____ at 10 pm every night.', ['sleeps', 'sleep', 'sleeping', 'slept'], 0, 'she คนเดียว → sleeps'),
      q('My dad ____ dinner for us every day.', ['cooks', 'cook', 'cooking', 'cooked'], 0, 'my dad = he → cooks'),
      q('I ____ hungry right now.', ['am', 'is', 'are', 'be'], 0, 'I คู่กับ am'),
      q('They ____ football in the park.', ['play', 'plays', 'playing', 'played'], 0, 'they หลายคน → play'),
      q('The water ____ cold.', ['is', 'am', 'are', 'be'], 0, 'water เอกพจน์ ใช้ is'),
      q('He ____ to school by bus every morning.', ['goes', 'go', 'going', 'gone'], 0, 'he คนเดียว → goes'),
    ],
  },
  {
    title: 'Adjective & Adverb — ช่างแต่งหน้ากับผู้กำกับ',
    intro: 'Adjective คือช่างแต่งหน้า ทำหน้าที่แต่ง Noun ให้ดูดีขึ้น ส่วน Adverb คือผู้กำกับที่คอยบอกว่า Verb ทำแบบไหน มักลงท้ายด้วย -ly',
    sections: [
      {
        heading: '🧠 Golden Rule — Adjective แต่ง Noun · Adverb คุม Verb',
        body: '“Adjective + Noun” เช่น a big dog ส่วน Adverb ขยาย Verb เช่น runs quickly หรือขยาย Adjective อย่าง very tall',
        examples: [
          { en: 'A big dog.', th: 'big แต่งให้ dog ดูตัวใหญ่', ok: true },
          { en: 'He runs quickly.', th: 'quickly บอกวิธีวิ่ง', ok: true },
          { en: 'He runs quick.', th: 'ขยายกริยาควรใช้ quickly', ok: false },
        ],
        table: {
          headers: ['ชนิด', 'แต่งอะไร', 'ตัวอย่าง'],
          rows: [
            ['Adjective', 'Noun', 'beautiful, tall, red'],
            ['Adverb', 'Verb / Adjective', 'quickly, very, well'],
            ['Adverb -ly', 'มักต่อจาก Adjective', 'quick → quickly'],
          ],
        },
      },
      {
        heading: 'จำง่ายๆ — เห็น -ly มักเป็น Adverb',
        body: 'ไม่ใช่ 100% แต่ช่วยเดาได้ดีมาก เช่น slowly, happily, carefully ส่วนคำอย่าง very, well, fast ก็เป็น Adverb เหมือนกันแม้ไม่ลงท้าย -ly',
        examples: [
          { en: 'She sings beautifully.', th: 'beautiful → beautifully ขยาย sings', ok: true },
          { en: 'I am very happy.', th: 'very ขยาย adjective happy', ok: true },
        ],
      },
    ],
    vocab: {
      columns: ['ชนิด', 'แต่งอะไร', 'ตัวอย่าง'],
      rows: [
        ['Adjective', 'แต่ง Noun', 'Beautiful, Tall, Red'],
        ['Adverb', 'ขยาย Verb', 'Quickly, Well'],
        ['Adverb ขยาย Adjective', 'เพิ่มความเข้ม', 'Very tall, Really good'],
      ],
    },
    tip: 'ถามตัวเองว่ากำลังขยายอะไร — ขยายคำนามใช้ Adjective ขยายกริยาใช้ Adverb จบง่ายๆ',
    tap: [
      pair('He runs quickly.', 'He runs quick.'),
      pair('A big dog is sleeping.', 'A bigly dog is sleeping.'),
      pair('She sings beautifully.', 'She sings beautiful.'),
      pair('I am very happy today.', 'I am very happily today.'),
      pair('The tall boy plays well.', 'The tall boy plays good.'),
    ],
    questions: [
      q('He is a ____ driver.', ['careful', 'carefully', 'care', 'carefuly'], 0, 'ขยาย Noun driver ใช้ Adjective careful'),
      q('She sings ____.', ['beautifully', 'beautiful', 'beauty', 'beautify'], 0, 'ขยายกริยา sings ใช้ Adverb beautifully'),
      q('The weather is ____ today.', ['nice', 'nicely', 'nicey', 'niceness'], 0, 'ขยาย Noun weather ใช้ nice'),
      q('He ran ____ to catch the bus.', ['quickly', 'quick', 'quickness', 'quicker'], 0, 'ขยายกริยา ran ใช้ quickly'),
      q('This problem is ____ difficult.', ['very', 'much', 'many', 'well'], 0, 'very ขยาย Adjective difficult'),
      q('She is a ____ girl.', ['pretty', 'prettily', 'prettiness', 'prettyful'], 0, 'ขยาย Noun girl ใช้ Adjective pretty'),
    ],
  },
  {
    title: 'Preposition, Conjunction & Interjection — ทีมงานเบื้องหลัง',
    intro: 'ตัวละครสามตัวนี้คือทีมเบื้องหลัง Preposition จัดฉากบอกพิกัด Conjunction คือกาวสองหน้าเชื่อมประโยค และ Interjection คือเสียงเอฟเฟกต์อารมณ์',
    sections: [
      {
        heading: '🧠 Golden Rule — บอกตำแหน่ง · เชื่อมคำ · ระเบิดอารมณ์',
        body: 'Preposition วางหน้า Noun เพื่อบอกพิกัด (in, on, under, at) · Conjunction เชื่อมคำหรือประโยค (and, but, because) · Interjection แสดงอารมณ์ฉับพลัน มักมี ! (Wow!, Ouch!)',
        examples: [
          { en: 'The cat is on the table.', th: 'on บอกว่าอยู่บนโต๊ะ', ok: true },
          { en: 'I like coffee but my friend likes tea.', th: 'but เชื่อมสองฝั่งที่ความหมายสวนกัน', ok: true },
          { en: 'Ouch! That hurts.', th: 'Ouch! คือเสียงอุทานแสดงความเจ็บ', ok: true },
        ],
        table: {
          headers: ['ชนิด', 'หน้าที่ในกองถ่าย', 'ตัวอย่าง'],
          rows: [
            ['Preposition', 'ทีมจัดฉาก — บอกพิกัด/เวลา', 'in, on, under, at'],
            ['Conjunction', 'กาวสองหน้า — เชื่อมประโยค', 'and, but, because'],
            ['Interjection', 'เสียงเอฟเฟกต์ — แสดงอารมณ์', 'Wow!, Ouch!, Oh no!'],
          ],
        },
      },
      {
        heading: 'Preposition เจอบ่อยที่สุดในข้อสอบ',
        body: 'จำคู่ยอดฮิต: in + ใน/ประเทศ, on + บน/พื้นผิว, at + ที่เจาะจง, to + ทิศทาง ส่วน because เชื่อมเหตุผล but เชื่อมสิ่งที่สวนกัน',
        examples: [
          { en: 'John lives in the United States.', th: 'ประเทศใช้ in', ok: true },
          { en: 'The family goes to the park.', th: 'ไปที่ไหน ใช้ to', ok: true },
          { en: 'I am happy because it is Friday.', th: 'because บอกเหตุผล', ok: true },
        ],
      },
    ],
    vocab: {
      columns: ['ชนิด', 'หน้าที่', 'ตัวอย่าง'],
      rows: [
        ['Preposition', 'บอกตำแหน่ง/เวลา', 'In, On, Under, At'],
        ['Conjunction', 'เชื่อมคำ/ประโยค', 'And, But, Because'],
        ['Interjection', 'แสดงอารมณ์', 'Wow!, Ouch!, Oh no!'],
      ],
    },
    tip: 'เจอช่องว่างหน้าคำนาม ให้คิดถึง Preposition ก่อน ถ้าเป็นช่องว่างระหว่างสองประโยค ให้คิดถึง Conjunction',
    tap: [
      pair('The cat is on the table.', 'The cat is on in the table.'),
      pair('I like coffee but my friend likes tea.', 'I like coffee and my friend likes tea.'),
      pair('Ouch! That hurts.', 'Ouch, that hurts!'),
      pair('John lives in the United States.', 'John lives at the United States.'),
      pair('The family goes to the park.', 'The family goes the park.'),
    ],
    questions: [
      q('The cat is ____ the table.', ['on', 'in', 'at', 'to'], 0, 'อยู่บนพื้นผิวโต๊ะ ใช้ on'),
      q('John lives ____ the United States.', ['in', 'on', 'at', 'to'], 0, 'ประเทศใช้ in'),
      q('I like coffee ____ my friend likes tea.', ['but', 'and', 'so', 'or'], 0, 'สองฝั่งสวนกัน ใช้ but'),
      q('Wow! ____ a great idea!', ['What', 'How', 'Which', 'Who'], 0, 'อุทานชมว่าไอเดียเยี่ยม ใช้ What a...!'),
      q('The family goes ____ the park.', ['to', 'at', 'on', 'in'], 0, 'บอกทิศทางไปที่ใด ใช้ to'),
      q('I stayed home ____ I was sick.', ['because', 'but', 'and', 'or'], 0, 'บอกเหตุผล ใช้ because'),
    ],
  },
];

async function main() {
  const [unit] = await db.select().from(learningUnits).where(eq(learningUnits.title, UNIT_TITLE)).limit(1);
  if (!unit) throw new Error(`ไม่พบ ${UNIT_TITLE}`);

  await db.transaction(async (tx) => {
    const oldNodes = await tx.select({ id: learningNodes.id }).from(learningNodes).where(eq(learningNodes.unitId, unit.id));
    for (const node of oldNodes) {
      await tx.delete(learningNodes).where(eq(learningNodes.id, node.id));
    }

    for (const [index, spec] of SPEC.entries()) {
      const [node] = await tx.insert(learningNodes).values({
        unitId: unit.id,
        title: `Node ${index + 1}: ${spec.title}`,
        kind: index === SPEC.length - 1 ? 'trophy' : index % 4 === 3 ? 'chest' : 'star',
        orderIndex: index,
        isPublished: true,
        passScore: 100,
      }).returning();

      await tx.insert(lessonPages).values({
        nodeId: node.id,
        pageType: 'explain',
        intro: spec.intro,
        sections: [
          ...spec.sections,
          {
            heading: TAP_TITLE,
            body: 'อ่านประโยค A กับ B แล้วแตะประโยคที่ถูกต้องนะ ผิดได้ ไม่เป็นไร ดูเหตุผลแล้วลองใหม่ได้เลย',
            tap: { title: 'ข้อไหนถูกต้อง', items: spec.tap.slice(0, 2) }, // ฝึกเบาๆ แค่ 2 ข้อต่อ Node
          },
        ],
        quiz: null,
        vocabBank: spec.vocab,
        tip: spec.tip,
        isPublished: true,
        orderIndex: 0,
      });

      await tx.insert(lessonPages).values({
        nodeId: node.id,
        pageType: 'quiz',
        sections: [],
        quiz: { questions: spec.questions },
        vocabBank: null,
        tip: null,
        intro: null,
        isPublished: true,
        orderIndex: 1,
      });
    }
  });

  console.log(JSON.stringify({ unitId: unit.id, unitTitle: UNIT_TITLE, nodeCount: SPEC.length, pagesPerNode: 2, tapItemsPerNode: 2, questionsPerNode: 6 }, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
