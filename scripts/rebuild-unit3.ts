/**
 * Rebuild Unit 3: Auxiliaries & Verb Forms only.
 *
 * Unit 2 is intentionally not touched. Unit 3 is rebuilt with friendly
 * Concept Card content, inline Tap & Select, and one Real Exam page per node.
 * Questions are sourced from the attached focus-form CSV where possible and
 * supplemented with focused questions so every node has six questions.
 *
 * Run: npx tsx scripts/rebuild-unit3.ts
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { db } from '../src/db';
import { learningUnits, learningNodes, lessonPages } from '../src/db/schema';
import { asc, eq } from 'drizzle-orm';

type Example = { en: string; th: string; ok: boolean };
type TapItem = { prompt: string; choiceA: string; choiceB: string; correct: 0 | 1 };
type Question = { sentence: string; options: string[]; answerIndex: number; explanation: string };
type CsvQuestion = Question & { topic: string; subtopic: string };
type NodeSpec = {
  title: string;
  sourceSubtopics: string[];
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

const UNIT_TITLE = 'Auxiliaries & Verb Forms';
const CSV_PATH = 'C:/Users/IHCK/Downloads/focus on form/Focus on form - แยกชุดย่อย (grammarSubTopic).csv';
const AUX_TOPIC = 'คำกริยาช่วยและกิริยาแท้ (Auxiliaries & Verb Forms)';
const TENSE_TOPIC = 'กาลเวลา (Tenses: Past / Present Perfect / Future)';
const tapPrompt = 'ข้อไหนถูกต้อง';

function pair(correct: string, wrong: string): TapItem {
  return { prompt: tapPrompt, choiceA: correct, choiceB: wrong, correct: 0 };
}

function q(sentence: string, options: string[], answerIndex: number, explanation: string): Question {
  return { sentence, options, answerIndex, explanation };
}

const SPEC: NodeSpec[] = [
  {
    title: 'Do — ถามและปฏิเสธกับ I / You / We / They',
    sourceSubtopics: ["Do / Don't (คำถาม-ปฏิเสธ Present Simple)"],
    intro: 'เริ่มง่ายๆ เลยนะ ถ้าประธานเป็น I, you, we, they หรือหลายคน ให้ใช้ Do ช่วยทำคำถาม และใช้ don’t ช่วยทำประโยคปฏิเสธ',
    sections: [
      {
        heading: '🧠 Golden Rule — Do + ประธาน + กริยารูปเดิม',
        body: '“I / You / We / They + do / don’t + verb รูปเดิม” หลัง Do หรือ don’t ไม่ต้องเติม s และไม่ต้องเปลี่ยนเป็นอดีต',
        examples: [
          { en: 'Do you like coffee?', th: 'Do + you + like รูปเดิม', ok: true },
          { en: 'They don’t want flies around their houses.', th: 'don’t + want รูปเดิม', ok: true },
          { en: 'Do they likes coffee?', th: 'ผิด — หลัง Do ใช้ like', ok: false },
        ],
        table: {
          headers: ['ใช้กับ', 'คำถาม', 'ปฏิเสธ'],
          rows: [
            ['I / You / We / They', 'Do you work?', 'I don’t work.'],
            ['หลายคน / หลายสิ่ง', 'Do they play?', 'They don’t play.'],
            ['กริยาหลัง do', 'รูปเดิม', 'รูปเดิม'],
          ],
        },
      },
      {
        heading: 'Do ไม่ได้แปลว่า “ทำ” อย่างเดียว',
        body: 'บางครั้ง do เป็นกริยาช่วย เช่น Do you want...? แต่บางครั้ง do เป็นกริยาแท้ เช่น What do you do? ให้ดูว่าหลัง do ยังมีกริยาอีกตัวไหม',
        examples: [
          { en: 'Do you want an apple?', th: 'Do เป็นกริยาช่วย และ want เป็นกริยาแท้', ok: true },
          { en: 'What do you do in the evening?', th: 'do ตัวแรกช่วยถาม ตัวที่สองแปลว่าทำ', ok: true },
        ],
      },
    ],
    vocab: {
      columns: ['รูปแบบ', 'ความหมาย', 'ตัวอย่าง'],
      rows: [
        ['Do + subject + V.1?', 'ถาม', 'Do they live here?'],
        ['Subject + don’t + V.1', 'ปฏิเสธ', 'We don’t eat meat.'],
        ['Do / don’t + verb', 'กริยาไม่เติม s', 'Do you like it?'],
      ],
    },
    tip: 'เห็น Do หรือ don’t แล้วมองกริยาถัดไปเลย ต้องเป็นรูปเดิมนะ',
    tap: [
      pair('Do you want an apple?', 'Do you wants an apple?'),
      pair('People do not want flies around their houses.', 'People does not want flies around their houses.'),
      pair('Do they live near here?', 'Do they lives near here?'),
      pair('I don’t like spicy food.', 'I don’t likes spicy food.'),
      pair('What do you usually do in the evening?', 'What does you usually do in the evening?'),
    ],
    questions: [
      q('Do you ____ an apple?', ['want', 'wants', 'wanted', 'wanting'], 0, 'หลัง Do ใช้ want รูปเดิม'),
      q('People do ____ want flies around their houses.', ['not', 'no', 'none', 'never'], 0, 'do not ใช้ทำประโยคปฏิเสธ'),
      q('Do they ____ near here?', ['live', 'lives', 'lived', 'living'], 0, 'หลัง Do ใช้ live รูปเดิม'),
      q('I don’t ____ spicy food.', ['like', 'likes', 'liked', 'liking'], 0, 'หลัง don’t ใช้ like รูปเดิม'),
      q('Do we ____ to book a table?', ['need', 'needs', 'needed', 'needing'], 0, 'หลัง Do ใช้ need รูปเดิม'),
      q('Man: What do you usually ____ in the evenings? Woman: I watch Netflix.', ['do', 'does', 'doing', 'did'], 0, 'What do you... ใช้ do รูปเดิมหลัง do'),
    ],
  },
  {
    title: 'Does — ถามและปฏิเสธกับ He / She / It',
    sourceSubtopics: ['Does (คำถามเอกพจน์บุรุษที่ 3)'],
    intro: 'ถ้าพูดถึงคนเดียวหรือสิ่งเดียว เช่น he, she, it, your brother ให้ใช้ Does ถาม และ doesn’t ปฏิเสธนะ',
    sections: [
      {
        heading: '🧠 Golden Rule — Does ช่วยแล้ว กริยาหลักกลับเป็นรูปเดิม',
        body: '“Does + he / she / it + verb รูปเดิม?” ตัว s ย้ายไปอยู่ใน Does แล้ว กริยาหลักเลยไม่เติม s อีก',
        examples: [
          { en: 'Does she play tennis?', th: 'Does มี s แล้ว → play ไม่เติม s', ok: true },
          { en: 'He doesn’t drink tea.', th: 'doesn’t + drink รูปเดิม', ok: true },
          { en: 'Does she plays tennis?', th: 'ผิด — ไม่เติม s ซ้ำที่ plays', ok: false },
        ],
        table: {
          headers: ['ประธาน', 'คำถาม', 'ปฏิเสธ'],
          rows: [
            ['He / She / It', 'Does she work?', 'She doesn’t work.'],
            ['คนเดียว / สิ่งเดียว', 'Does Anna study?', 'Anna doesn’t study.'],
            ['กริยาหลัง does', 'รูปเดิม', 'รูปเดิม'],
          ],
        },
      },
      {
        heading: 'อย่าเติม s สองรอบ',
        body: 'ประโยคบอกเล่าใช้ She works แต่พอเป็นคำถามใช้ Does she work? จำว่า s อยู่ที่คำช่วยหรือกริยาได้แค่จุดเดียวพอ',
        examples: [
          { en: 'She works at home.', th: 'ประโยคบอกเล่า → works', ok: true },
          { en: 'Does she work at home?', th: 'คำถาม → Does + work', ok: true },
          { en: 'Does she works at home?', th: 'ผิด → มี s ซ้ำสองที่', ok: false },
        ],
      },
    ],
    vocab: {
      columns: ['รูปแบบ', 'กฎจำง่าย', 'ตัวอย่าง'],
      rows: [
        ['Does + he/she/it + V.1?', 'ถามคนเดียว', 'Does he work?'],
        ['He/She/It + doesn’t + V.1', 'ปฏิเสธ', 'She doesn’t drive.'],
        ['Does + verb', 'verb ไม่เติม s', 'Does it work?'],
      ],
    },
    tip: 'Does มี s อยู่แล้ว อย่าเติม s ที่กริยาหลักซ้ำอีกนะ',
    tap: [
      pair('Does your brother spend Christmas with you?', 'Does your brother spends Christmas with you?'),
      pair('Does she like coffee?', 'Does she likes coffee?'),
      pair('He doesn’t drink tea.', 'He doesn’t drinks tea.'),
      pair('Does the shop close at 8 pm?', 'Does the shop closes at 8 pm?'),
      pair('Does Anna study English?', 'Does Anna studies English?'),
    ],
    questions: [
      q('Does your brother ____ Christmas with you?', ['spend', 'spends', 'spent', 'spending'], 0, 'หลัง Does ใช้ spend รูปเดิม'),
      q('Does she ____ tennis?', ['play', 'plays', 'played', 'playing'], 0, 'หลัง Does ไม่เติม s ที่ play'),
      q('Does the shop ____ at 8 pm?', ['close', 'closes', 'closed', 'closing'], 0, 'Does + close รูปเดิม'),
      q('Does Anna ____ funny messages?', ['send', 'sends', 'sent', 'sending'], 0, 'หลัง Does ใช้ send รูปเดิม'),
      q('He doesn’t ____ tea.', ['drink', 'drinks', 'drank', 'drinking'], 0, 'หลัง doesn’t ใช้ drink รูปเดิม'),
      q('Does your sister ____ English?', ['study', 'studies', 'studied', 'studying'], 0, 'หลัง Does ใช้ study รูปเดิม'),
    ],
  },
  {
    title: 'Did — ถามและปฏิเสธเรื่องอดีต',
    sourceSubtopics: ['Did (คำถาม-ตอบอดีต)'],
    intro: 'ถ้าเรื่องเกิดไปแล้วและมี yesterday, last night, ago ให้ใช้ Did ถาม หรือ didn’t ปฏิเสธ แล้วกริยาหลักกลับเป็นช่อง 1',
    sections: [
      {
        heading: '🧠 Golden Rule — Did + กริยาช่อง 1',
        body: '“Did + ประธาน + verb ช่อง 1?” คำว่า Did บอกอดีตให้แล้ว กริยาหลังมันเลยไม่ต้องเป็นช่อง 2 ซ้ำ',
        examples: [
          { en: 'Did you watch the game?', th: 'Did + watch ไม่ใช่ watched', ok: true },
          { en: 'Where did you go last night?', th: 'did + go ไม่ใช่ went', ok: true },
          { en: 'Did you watched the game?', th: 'ผิด — ห้ามเติม -ed หลัง Did', ok: false },
        ],
        table: {
          headers: ['รูปแบบ', 'ตัวอย่าง', 'จำว่า'],
          rows: [
            ['Did + subject + V.1?', 'Did she call?', 'ถามอดีต'],
            ['Subject + didn’t + V.1', 'They didn’t arrive.', 'ปฏิเสธอดีต'],
            ['ตอบสั้น', 'Yes, I did.', 'ตอบด้วย did'],
          ],
        },
      },
      {
        heading: 'Did ในคำตอบสั้นๆ',
        body: 'ถ้ามีคนถาม Did you...? ตอบ Yes, I did. หรือ No, I didn’t. ไม่ต้องพูดกริยาซ้ำให้ยาวเลย',
        examples: [
          { en: 'Did you order coffee? — Yes, I did.', th: 'ตอบรับด้วย did', ok: true },
          { en: 'Did she call? — No, she didn’t.', th: 'ปฏิเสธด้วย didn’t', ok: true },
        ],
      },
    ],
    vocab: {
      columns: ['คำบอกเวลา', 'คำช่วย', 'ตัวอย่าง'],
      rows: [
        ['yesterday / last night', 'Did / didn’t', 'Did you go?'],
        ['ago', 'กริยาหลัง did = V.1', 'Where did you go?'],
        ['ตอบสั้น', 'did / didn’t', 'Yes, I did.'],
      ],
    },
    tip: 'เห็น Did แล้ววางกริยาช่อง 2 ลงก่อนเลย จากนั้นเปลี่ยนกลับเป็นช่อง 1 นะ',
    tap: [
      pair('Did you watch the basketball game?', 'Did you watched the basketball game?'),
      pair('Where did you go last night?', 'Where did you went last night?'),
      pair('Did he call you yesterday?', 'Did he called you yesterday?'),
      pair('They didn’t arrive late.', 'They didn’t arrived late.'),
      pair('Yes, I did.', 'Yes, I do.'),
    ],
    questions: [
      q('Did you ____ the basketball game?', ['watch', 'watched', 'watches', 'watching'], 0, 'หลัง Did ใช้ watch ช่อง 1'),
      q('Where did you ____ last night?', ['go', 'went', 'goes', 'going'], 0, 'หลัง did ใช้ go ไม่ใช่ went'),
      q('Did he ____ you yesterday?', ['call', 'called', 'calls', 'calling'], 0, 'หลัง Did ใช้ call ช่อง 1'),
      q('They didn’t ____ late.', ['arrive', 'arrived', 'arrives', 'arriving'], 0, 'หลัง didn’t ใช้ arrive ช่อง 1'),
      q('Did she ____ the answer?', ['know', 'knew', 'knows', 'knowing'], 0, 'หลัง Did ใช้ know ช่อง 1'),
      q('Waiter: Who asked for eggs and coffee? Customer: I ____.', ['did', 'do', 'does', 'doing'], 0, 'ใช้ did ตอบรับเรื่องที่เกิดในอดีต'),
    ],
  },
  {
    title: 'Modal Verbs — should / must / had better',
    sourceSubtopics: ['Modal Verbs (should/must/had better/won\'t/used to)'],
    intro: 'Modal verbs เป็นคำช่วยที่เติมความหมาย เช่น ควรต้องแน่ๆ หรือเคยทำ และหลัง modal ใช้กริยารูปเดิมเสมอ',
    sections: [
      {
        heading: '🧠 Golden Rule — Modal + verb รูปเดิม',
        body: '“should, must, could, might, will + verb ช่อง 1” ไม่เติม s ไม่เติม to และไม่เปลี่ยนเป็น -ed หลัง modal',
        examples: [
          { en: 'You should rest.', th: 'should + rest รูปเดิม', ok: true },
          { en: 'You must leave now.', th: 'must + leave รูปเดิม', ok: true },
          { en: 'You should rests.', th: 'ผิด — หลัง should ไม่เติม s', ok: false },
        ],
        table: {
          headers: ['คำช่วย', 'ความหมายง่ายๆ', 'ตัวอย่าง'],
          rows: [
            ['should', 'ควร', 'You should study.'],
            ['must', 'ต้อง / แน่ๆ', 'It must be true.'],
            ['had better', 'ควรทำเลย', 'You had better rest.'],
            ['might / could', 'อาจจะ', 'It might rain.'],
          ],
        },
      },
      {
        heading: 'should กับ had better ต่างกันนิดเดียว',
        body: 'should คือคำแนะนำทั่วไป ส่วน had better ฟังเหมือนเตือนว่า “ทำเลยจะดีกว่า” แต่ทั้งคู่ตามด้วยกริยารูปเดิม',
        examples: [
          { en: 'You should see a doctor.', th: 'คำแนะนำ', ok: true },
          { en: 'You had better stay home.', th: 'เตือนให้ทำเพื่อความปลอดภัย', ok: true },
        ],
      },
    ],
    vocab: {
      columns: ['Modal', 'ความหมาย', 'ตัวอย่าง'],
      rows: [
        ['should', 'ควร', 'You should try.'],
        ['must', 'ต้อง / แน่ๆ', 'She must be tired.'],
        ['had better', 'ควรทำเลย', 'We had better go.'],
        ['used to', 'เคยทำในอดีต', 'I used to play.'],
      ],
    },
    tip: 'หลัง modal ไม่ว่าจะประธานคนไหน กริยาก็หน้าตาเดิมเสมอ ง่ายๆ แค่นี้เอง',
    tap: [
      pair('You should stay home.', 'You should stays home.'),
      pair('You must leave now.', 'You must to leave now.'),
      pair('She might come later.', 'She might comes later.'),
      pair('You had better rest.', 'You had better to rest.'),
      pair('I used to play tennis.', 'I used to played tennis.'),
    ],
    questions: [
      q('You ____ finish your homework first.', ['should', 'would', 'did', 'are'], 0, 'should แปลว่าควร และตามด้วย finish รูปเดิม'),
      q('The lights are on. Someone ____ be home.', ['must', 'musts', 'to must', 'did'], 0, 'must ใช้เดาความเป็นไปได้สูง'),
      q('You had better ____ home.', ['stay', 'stays', 'to stay', 'stayed'], 0, 'had better + verb รูปเดิม'),
      q('It ____ rain tonight.', ['might', 'mights', 'to might', 'did'], 0, 'might แปลว่าอาจจะ'),
      q('I ____ to walk to school when I was young.', ['used', 'use', 'using', 'uses'], 0, 'used to ใช้พูดถึงสิ่งที่เคยทำ'),
      q('You ____ worry about it. It is fine.', ['needn’t', 'needn’t to', 'needs', 'did'], 0, 'needn’t + verb รูปเดิม แปลว่าไม่จำเป็นต้อง'),
    ],
  },
  {
    title: 'Have got — บอกว่ามี',
    sourceSubtopics: ['Have got'],
    intro: 'Have got ใช้บอกว่ามีอะไรอยู่กับตัวหรือเป็นเจ้าของ คล้าย have เลย แค่จำรูปคำถามกับปฏิเสธให้แม่นก็พอ',
    sections: [
      {
        heading: '🧠 Golden Rule — Have / Has got = มี',
        body: '“I / you / we / they have got” และ “he / she / it has got” เวลาเป็นคำถามเอา Have หรือ Has ขึ้นหน้าได้เลย',
        examples: [
          { en: 'I have got two brothers.', th: 'I ใช้ have got', ok: true },
          { en: 'Has she got a car?', th: 'she ใช้ Has got', ok: true },
          { en: 'She have got a car.', th: 'ผิด — she ต้องใช้ has got', ok: false },
        ],
        table: {
          headers: ['ประธาน', 'บอกเล่า', 'คำถาม'],
          rows: [
            ['I / You / We / They', 'have got', 'Have you got...?'],
            ['He / She / It', 'has got', 'Has she got...?'],
            ['ทุกประธาน', 'haven’t / hasn’t got', 'ปฏิเสธได้เลย'],
          ],
        },
      },
      {
        heading: 'Have got กับ have ความหมายใกล้กัน',
        body: 'I have got a car กับ I have a car แปลว่าฉันมีรถเหมือนกัน ในข้อสอบให้ดูประธานว่าใช้ have หรือ has ให้ถูก',
        examples: [
          { en: 'Have you got a pen?', th: 'ถามว่ามีปากกาไหม', ok: true },
          { en: 'She hasn’t got any money.', th: 'เธอไม่มีเงิน', ok: true },
        ],
      },
    ],
    vocab: {
      columns: ['ประธาน', 'รูปใช้บอกเล่า', 'รูปคำถาม'],
      rows: [
        ['I / You / We / They', 'have got', 'Have they got...?'],
        ['He / She / It', 'has got', 'Has he got...?'],
        ['ปฏิเสธ', 'haven’t / hasn’t got', 'She hasn’t got...'],
      ],
    },
    tip: 'จำคู่ให้ติด: I/you/we/they = have got · he/she/it = has got',
    tap: [
      pair('I have got two brothers.', 'I has got two brothers.'),
      pair('Has Julia given you her address?', 'Have Julia given you her address?'),
      pair('Have you got three children?', 'Has you got three children?'),
      pair('She hasn’t got any money.', 'She haven’t got any money.'),
      pair('They have got a new house.', 'They has got a new house.'),
    ],
    questions: [
      q('How many children ____ you got?', ['do', 'did', 'have', 'are'], 2, 'โครงสร้าง Have you got...? ใช้ have กับ you'),
      q('She ____ got a new phone.', ['have', 'has', 'had', 'having'], 1, 'she ใช้ has got'),
      q('____ you got a pen?', ['Have', 'Has', 'Did', 'Does'], 0, 'you ใช้ Have got ในคำถาม'),
      q('They ____ got two children.', ['has', 'have', 'having', 'had'], 1, 'they ใช้ have got'),
      q('He hasn’t ____ any brothers.', ['got', 'gets', 'get', 'getting'], 0, 'หลัง hasn’t ใช้ got ใน have got'),
      q('Have you ____ enough time?', ['got', 'gets', 'get', 'getting'], 0, 'Have + subject + got'),
    ],
  },
  {
    title: 'Short Answers — ตอบสั้นด้วย Do / Does / Did',
    sourceSubtopics: ['So do I (ตอบรับสั้น ๆ)'],
    intro: 'เวลาตอบคำถามหรือเห็นด้วย ไม่ต้องพูดยาว ใช้คำช่วยตัวเดิมตอบกลับได้เลย เช่น Yes, I do. หรือ So do I.',
    sections: [
      {
        heading: '🧠 Golden Rule — ตอบด้วยคำช่วยตัวเดิม',
        body: '“คำถามใช้ do ก็ย่อคำตอบด้วย do, ใช้ does ก็ตอบ does, ใช้ did ก็ตอบ did” ส่วน So... แปลว่า “ฉันก็เหมือนกัน”',
        examples: [
          { en: 'Do you like tea? — Yes, I do.', th: 'คำถามใช้ Do → ตอบ do', ok: true },
          { en: 'I like snow. — So do I.', th: 'เห็นด้วยกับประโยค present', ok: true },
          { en: 'I like snow. — So does I.', th: 'ผิด — I ต้องใช้ do', ok: false },
        ],
        table: {
          headers: ['ประโยคแรก', 'ตอบเห็นด้วย', 'ตัวอย่าง'],
          rows: [
            ['I / you / we / they', 'So do I.', 'I like tea. — So do I.'],
            ['he / she / it', 'So does she.', 'He works. — So does she.'],
            ['อดีต', 'So did I.', 'I went. — So did I.'],
          ],
        },
      },
      {
        heading: 'ตอบ Yes / No ก็ใช้คำช่วยเดิม',
        body: 'คำถาม Do you...? ตอบ Yes, I do. / No, I don’t. คำถาม Does she...? ก็ตอบ Yes, she does. แบบนี้เลย',
        examples: [
          { en: 'Does he work here? — No, he doesn’t.', th: 'does → doesn’t', ok: true },
          { en: 'Did they call? — Yes, they did.', th: 'did → did', ok: true },
        ],
      },
    ],
    vocab: {
      columns: ['คำถาม', 'ตอบรับ', 'ตอบปฏิเสธ'],
      rows: [
        ['Do you...? ', 'Yes, I do.', 'No, I don’t.'],
        ['Does she...?', 'Yes, she does.', 'No, she doesn’t.'],
        ['Did they...?', 'Yes, they did.', 'No, they didn’t.'],
      ],
    },
    tip: 'อย่าเดาคำตอบจากกริยาหลัก ให้มองคำช่วยในคำถามแล้วใช้คำนั้นตอบกลับ',
    tap: [
      pair('I like coffee. — So do I.', 'I like coffee. — So does I.'),
      pair('She works here. — So does he.', 'She works here. — So do he.'),
      pair('They went home. — So did we.', 'They went home. — So do we.'),
      pair('Do you swim? — Yes, I do.', 'Do you swim? — Yes, I does.'),
      pair('Does Anna study? — No, she doesn’t.', 'Does Anna study? — No, she don’t.'),
    ],
    questions: [
      q('I always look forward to summer. — So ____ I.', ['do', 'am', 'can', 'have'], 0, 'ประโยคแรกเป็น present simple ใช้ So do I'),
      q('She works on Saturdays. — So ____ he.', ['does', 'do', 'did', 'is'], 0, 'ประธาน he และกริยา present simple ใช้ does'),
      q('They went to Florida. — So ____ we.', ['did', 'do', 'does', 'have'], 0, 'ประโยคเป็นอดีต ใช้ So did we'),
      q('Do you like coffee? — Yes, I ____.', ['do', 'does', 'did', 'am'], 0, 'คำถามขึ้นต้น Do จึงตอบ do'),
      q('Does she live here? — No, she ____.', ['doesn’t', 'don’t', 'didn’t', 'isn’t'], 0, 'Does ปฏิเสธด้วย doesn’t'),
      q('Did he call you? — No, he ____.', ['didn’t', 'doesn’t', 'don’t', 'wasn’t'], 0, 'Did ปฏิเสธด้วย didn’t'),
    ],
  },
  {
    title: 'Future — will และการตัดสินใจตอนนี้',
    sourceSubtopics: ['Future (will / แผนอนาคต)'],
    intro: 'Will ใช้พูดถึงอนาคต โดยเฉพาะการตัดสินใจตอนกำลังพูด การคาดเดา หรือการสัญญา หลัง will ใช้กริยารูปเดิมนะ',
    sections: [
      {
        heading: '🧠 Golden Rule — Will + verb รูปเดิม',
        body: '“ทุกประธานใช้ will + verb ช่อง 1” ไม่ต้องเติม s แม้ประธานเป็น he หรือ she',
        examples: [
          { en: 'I’ll make a cake.', th: 'ตัดสินใจตอนพูด → will make', ok: true },
          { en: 'She will help you.', th: 'will + help รูปเดิม', ok: true },
          { en: 'He will helps you.', th: 'ผิด — หลัง will ไม่เติม s', ok: false },
        ],
        table: {
          headers: ['รูปแบบ', 'ตัวอย่าง', 'ความหมาย'],
          rows: [
            ['will + V.1', 'I will call you.', 'จะโทร'],
            ['will not / won’t + V.1', 'I won’t forget.', 'จะไม่ลืม'],
            ['Will + subject + V.1?', 'Will you come?', 'จะมาไหม'],
          ],
        },
      },
      {
        heading: 'will หรือ going to?',
        body: 'will มักเป็นการตัดสินใจทันทีหรือการคาดเดา ส่วน going to มักเป็นแผนที่คิดไว้ก่อน ทั้งสองแบบพูดถึงอนาคตได้',
        examples: [
          { en: 'I think I’ll make a cake.', th: 'คิดแล้วตัดสินใจตอนนี้', ok: true },
          { en: 'I’m going to visit my aunt next week.', th: 'มีแผนไว้แล้ว', ok: true },
        ],
      },
    ],
    vocab: {
      columns: ['รูปแบบ', 'ตัวอย่าง', 'ใช้เมื่อ'],
      rows: [
        ['will + V.1', 'I’ll help.', 'ตัดสินใจตอนนี้'],
        ['won’t + V.1', 'I won’t go.', 'ปฏิเสธ'],
        ['Will you + V.1?', 'Will you come?', 'ถามอนาคต'],
      ],
    },
    tip: 'เห็น will แล้วกริยาหลังมันไม่เปลี่ยนรูปเลย ไม่เติม s ไม่เติม to',
    tap: [
      pair('I think I’ll make a cake.', 'I think I’ll makes a cake.'),
      pair('She will call you later.', 'She will calls you later.'),
      pair('I won’t forget.', 'I won’t to forget.'),
      pair('Will you come tomorrow?', 'Will you comes tomorrow?'),
      pair('They will help us.', 'They will helped us.'),
    ],
    questions: [
      q('I think ____ make a cake.', ['I’ll', 'I’m', 'I’d', 'I’ve'], 0, 'I think + I’ll ใช้กับการตัดสินใจตอนพูด'),
      q('She will ____ you tomorrow.', ['call', 'calls', 'called', 'calling'], 0, 'หลัง will ใช้ call รูปเดิม'),
      q('I ____ forget your birthday.', ['won’t', 'don’t', 'didn’t', 'am not'], 0, 'won’t = will not'),
      q('____ you help me later?', ['Will', 'Do', 'Did', 'Are'], 0, 'คำถามอนาคตใช้ Will'),
      q('They will ____ with us.', ['come', 'comes', 'came', 'coming'], 0, 'will + come'),
      q('Man: What will you ____ with the apples? Woman: I’ll make a pie.', ['do', 'does', 'did', 'doing'], 0, 'หลัง will ใช้ do รูปเดิม'),
    ],
  },
  {
    title: 'Present Continuous — กำลังทำอยู่',
    sourceSubtopics: ['Present Continuous'],
    intro: 'ถ้ากำลังทำอยู่ตอนนี้หรือช่วงนี้ ให้ใช้ be + verb-ing เช่น I am studying หรือ They are working',
    sections: [
      {
        heading: '🧠 Golden Rule — am / is / are + V-ing',
        body: '“ประธาน + am / is / are + verb-ing” เลือก am, is, are ให้ตรงกับประธาน แล้วเติม -ing ที่กริยา',
        examples: [
          { en: 'She is watching television.', th: 'she → is + watching', ok: true },
          { en: 'They are studying now.', th: 'they → are + studying', ok: true },
          { en: 'She is watch television.', th: 'ผิด — ต้องเป็น watching', ok: false },
        ],
        table: {
          headers: ['ประธาน', 'คำช่วย', 'ตัวอย่าง'],
          rows: [
            ['I', 'am', 'I am reading.'],
            ['He / She / It', 'is', 'She is working.'],
            ['You / We / They', 'are', 'They are listening.'],
          ],
        },
      },
      {
        heading: 'ดูคำใบ้เวลา',
        body: 'คำอย่าง now, right now, at the moment, these days มักบอกว่ากำลังเกิดขึ้น ให้มองหา am/is/are + -ing',
        examples: [
          { en: 'What are you listening to these days?', th: 'these days → กำลังทำช่วงนี้', ok: true },
          { en: 'Is your sister watching TV?', th: 'ถามสิ่งที่กำลังทำ', ok: true },
        ],
      },
    ],
    vocab: {
      columns: ['ประธาน', 'คำช่วย', 'กริยา'],
      rows: [
        ['I', 'am', 'I am working.'],
        ['He / She / It', 'is', 'He is running.'],
        ['You / We / They', 'are', 'We are learning.'],
      ],
    },
    tip: 'Present Continuous ต้องมีคู่ am/is/are กับ -ing มาด้วยกัน อย่าขาดตัวใดตัวหนึ่ง',
    tap: [
      pair('She is watching television.', 'She is watch television.'),
      pair('They are working now.', 'They is working now.'),
      pair('I am reading a book.', 'I are reading a book.'),
      pair('Are you listening?', 'Do you listening?'),
      pair('What are they doing?', 'What do they doing?'),
    ],
    questions: [
      q('What kind of music ____ you listening to?', ['are', 'do', 'is', 'were'], 0, 'you ใช้ are ใน Present Continuous'),
      q('She is ____ television now.', ['watch', 'watches', 'watching', 'watched'], 2, 'is + watching'),
      q('I ____ studying English at the moment.', ['am', 'is', 'are', 'do'], 0, 'I ใช้ am'),
      q('They ____ working today.', ['are', 'is', 'am', 'do'], 0, 'they ใช้ are'),
      q('Is your sister ____ TV?', ['watch', 'watches', 'watching', 'watched'], 2, 'Is + verb-ing'),
      q('Man: What are you ____ these days? Woman: I’m learning Spanish.', ['do', 'does', 'doing', 'did'], 2, 'are + doing ในคำถาม Present Continuous'),
    ],
  },
  {
    title: 'Past Simple — เรื่องที่จบไปแล้ว',
    sourceSubtopics: ['Past Simple'],
    intro: 'Past Simple ใช้เล่าเรื่องที่จบไปแล้ว มองหาคำอย่าง yesterday, last year, ago แล้วเลือกกริยาช่อง 2 หรือใช้ did ช่วยถาม',
    sections: [
      {
        heading: '🧠 Golden Rule — เล่าอดีตใช้ V.2 แต่ถามใช้ Did + V.1',
        body: '“ประโยคบอกเล่าใช้กริยาช่อง 2 ส่วนคำถามใช้ Did + ช่อง 1” อย่าใส่ช่อง 2 สองครั้งในประโยคเดียว',
        examples: [
          { en: 'I went to Vietnam last year.', th: 'บอกเล่าอดีต → went', ok: true },
          { en: 'Did you go last night?', th: 'ถามอดีต → Did + go', ok: true },
          { en: 'Did you went last night?', th: 'ผิด — went ต้องกลับเป็น go', ok: false },
        ],
        table: {
          headers: ['ชนิดประโยค', 'รูปแบบ', 'ตัวอย่าง'],
          rows: [
            ['บอกเล่า', 'subject + V.2', 'She felt ill.'],
            ['คำถาม', 'Did + subject + V.1?', 'Did she feel ill?'],
            ['ปฏิเสธ', 'didn’t + V.1', 'She didn’t feel ill.'],
          ],
        },
      },
      {
        heading: 'คำกริยาไม่ปกติต้องจำเป็นคำๆ',
        body: 'go → went, feel → felt, have → had เป็น irregular verbs ไม่มีสูตรเติม -ed แต่พอมี did แล้วก็กลับไปใช้ช่อง 1 เหมือนเดิม',
        examples: [
          { en: 'She felt ill yesterday.', th: 'feel → felt', ok: true },
          { en: 'Did she feel ill yesterday?', th: 'หลัง Did กลับเป็น feel', ok: true },
        ],
      },
    ],
    vocab: {
      columns: ['ช่อง 1', 'ช่อง 2', 'ตัวอย่าง'],
      rows: [
        ['go', 'went', 'I went home.'],
        ['feel', 'felt', 'She felt ill.'],
        ['have', 'had', 'We had fun.'],
        ['do', 'did', 'I did my homework.'],
      ],
    },
    tip: 'ในประโยคคำถามหรือปฏิเสธที่มี did ให้ใช้กริยาช่อง 1 เสมอ',
    tap: [
      pair('I went to Vietnam last year.', 'I go to Vietnam last year.'),
      pair('She felt ill yesterday.', 'She feel ill yesterday.'),
      pair('Did you go last night?', 'Did you went last night?'),
      pair('They didn’t have a car.', 'They didn’t had a car.'),
      pair('I did my homework.', 'I do my homework yesterday.'),
    ],
    questions: [
      q('I ____ to Vietnam last year.', ['go', 'will go', 'went', 'have gone'], 2, 'last year เป็นอดีต จึงใช้ went'),
      q('She ____ really ill yesterday.', ['feel', 'felt', 'feels', 'feeling'], 1, 'feel ช่อง 2 คือ felt'),
      q('Where did you ____ last night?', ['go', 'went', 'gone', 'going'], 0, 'หลัง did ใช้ go ช่อง 1'),
      q('We ____ a great time at the party.', ['have', 'had', 'has', 'having'], 1, 'have ช่อง 2 คือ had'),
      q('Did you ____ the meeting?', ['attend', 'attended', 'attends', 'attending'], 0, 'หลัง Did ใช้ attend'),
      q('I ____ my homework after dinner yesterday.', ['do', 'does', 'did', 'doing'], 2, 'yesterday → did'),
    ],
  },
  {
    title: 'Present Perfect — เคยทำหรือทำต่อเนื่องถึงตอนนี้',
    sourceSubtopics: ['Present Perfect'],
    intro: 'Present Perfect ใช้พูดถึงประสบการณ์หรือสิ่งที่เริ่มแล้วต่อเนื่องถึงตอนนี้ มักเจอ have/has + กริยาช่อง 3',
    sections: [
      {
        heading: '🧠 Golden Rule — have / has + V.3',
        body: '“I / you / we / they have + V.3” และ “he / she / it has + V.3” คำสำคัญคือ for, since, ever, never, yet',
        examples: [
          { en: 'I have lived here for six years.', th: 'เริ่มอยู่ในอดีตและยังอยู่ถึงตอนนี้', ok: true },
          { en: 'She has never seen snow.', th: 'ประสบการณ์ที่ไม่เคยเกิดขึ้น', ok: true },
          { en: 'She have lived here for six years.', th: 'ผิด — she ต้องใช้ has', ok: false },
        ],
        table: {
          headers: ['ประธาน', 'คำช่วย', 'ตัวอย่าง'],
          rows: [
            ['I / You / We / They', 'have + V.3', 'They have finished.'],
            ['He / She / It', 'has + V.3', 'She has seen it.'],
            ['คำถาม', 'Have / Has + subject + V.3?', 'Have you ever been there?'],
          ],
        },
      },
      {
        heading: 'for กับ since',
        body: 'for ตามด้วยระยะเวลา เช่น for six years ส่วน since ตามด้วยจุดเริ่มต้น เช่น since 2020 หรือ since Monday',
        examples: [
          { en: 'I have lived here for six years.', th: 'for + ช่วงเวลา', ok: true },
          { en: 'She has worked here since 2020.', th: 'since + จุดเริ่มต้น', ok: true },
        ],
      },
    ],
    vocab: {
      columns: ['คำ', 'ใช้กับ', 'ตัวอย่าง'],
      rows: [
        ['for', 'ช่วงเวลา', 'for three months'],
        ['since', 'จุดเริ่มต้น', 'since Monday'],
        ['ever', 'เคยไหม', 'Have you ever...?'],
        ['never', 'ไม่เคย', 'I have never...'],
      ],
    },
    tip: 'เช็กประธานก่อนว่าใช้ have หรือ has แล้วค่อยหากริยาช่อง 3 ต่อท้าย',
    tap: [
      pair('I have lived here for six years.', 'I has lived here for six years.'),
      pair('She has never seen snow.', 'She have never seen snow.'),
      pair('Have you ever been to London?', 'Did you ever been to London?'),
      pair('They have finished the work.', 'They has finished the work.'),
      pair('He has worked here since 2020.', 'He have worked here since 2020.'),
    ],
    questions: [
      q('I ____ in Boston for six years now.', ['live', 'lived', 'have lived', 'was living'], 2, 'for six years ต่อเนื่องถึงตอนนี้ ใช้ have lived'),
      q('Has Julia ____ you her new email address?', ['give', 'gave', 'given', 'giving'], 2, 'หลัง Has ใช้กริยาช่อง 3 คือ given'),
      q('She has ____ seen snow.', ['never', 'ever', 'ago', 'last'], 0, 'never ใช้บอกว่าไม่เคย'),
      q('Have you ____ been to London?', ['ever', 'ago', 'last', 'since'], 0, 'ever ใช้ถามประสบการณ์'),
      q('They have ____ the report.', ['finish', 'finished', 'finishes', 'finishing'], 1, 'have + finished'),
      q('He has worked here ____ 2020.', ['for', 'since', 'during', 'at'], 1, 'since ตามด้วยจุดเริ่มต้นคือ 2020'),
    ],
  },
  {
    title: 'Past Perfect — อดีตที่เกิดก่อนอดีตอีกที',
    sourceSubtopics: ['Past Perfect'],
    intro: 'Past Perfect ใช้เล่าว่าเหตุการณ์หนึ่งเกิดเสร็จก่อนอีกเหตุการณ์ในอดีต ใช้ had + กริยาช่อง 3 ง่ายๆ เลย',
    sections: [
      {
        heading: '🧠 Golden Rule — had + V.3 = เกิดก่อนในอดีต',
        body: '“ประธานทุกตัวใช้ had + V.3” ไม่ว่า I, she หรือ they ก็ใช้ had เหมือนกัน เพราะ had ไม่เปลี่ยนตามประธาน',
        examples: [
          { en: 'She had left before I arrived.', th: 'ออกไปก่อน แล้วฉันค่อยมาถึง', ok: true },
          { en: 'They had finished the work by noon.', th: 'ทำเสร็จก่อนเที่ยง', ok: true },
          { en: 'She had leave before I arrived.', th: 'ผิด — ต้องเป็น had left', ok: false },
        ],
        table: {
          headers: ['ส่วน', 'รูปแบบ', 'ตัวอย่าง'],
          rows: [
            ['คำช่วย', 'had', 'ทุกประธานใช้ had'],
            ['กริยา', 'V.3', 'had left / had finished'],
            ['เหตุการณ์ทีหลัง', 'Past Simple', 'before I arrived'],
          ],
        },
      },
      {
        heading: 'before / after ช่วยเรียงเวลา',
        body: 'มองหาคำว่า before, after, by the time เพื่อดูว่าอะไรเกิดก่อน ถ้าเกิดก่อนในอดีตใช้ had + V.3',
        examples: [
          { en: 'By the time we arrived, the film had started.', th: 'หนังเริ่มก่อนที่เราจะมาถึง', ok: true },
          { en: 'After he had eaten, he went out.', th: 'กินเสร็จแล้วค่อยออกไป', ok: true },
        ],
      },
    ],
    vocab: {
      columns: ['คำช่วย', 'กริยา', 'ตัวอย่าง'],
      rows: [
        ['had', 'left (V.3)', 'She had left.'],
        ['had', 'finished (V.3)', 'They had finished.'],
        ['had', 'seen (V.3)', 'I had seen it.'],
      ],
    },
    tip: 'Past Perfect ไม่ต้องคิดว่าใครเป็นประธาน เพราะทุกคนใช้ had เหมือนกัน',
    tap: [
      pair('She had left before I arrived.', 'She had leave before I arrived.'),
      pair('They had finished by noon.', 'They had finish by noon.'),
      pair('I had seen the film before.', 'I had saw the film before.'),
      pair('Had he eaten before the trip?', 'Did he had eaten before the trip?'),
      pair('We hadn’t started when she called.', 'We hadn’t start when she called.'),
    ],
    questions: [
      q('She ____ left before I arrived.', ['has', 'had', 'have', 'was'], 1, 'เหตุการณ์เกิดก่อนในอดีต ใช้ had left'),
      q('They had ____ the work by noon.', ['finish', 'finished', 'finishes', 'finishing'], 1, 'had + กริยาช่อง 3 คือ finished'),
      q('I had ____ the film before.', ['see', 'saw', 'seen', 'seeing'], 2, 'กริยาช่อง 3 ของ see คือ seen'),
      q('By the time we arrived, the film had ____.', ['start', 'started', 'starts', 'starting'], 1, 'had + started'),
      q('____ he eaten before the trip?', ['Had', 'Did', 'Has', 'Does'], 0, 'คำถาม Past Perfect ใช้ Had ขึ้นหน้า'),
      q('We hadn’t ____ when she called.', ['start', 'started', 'starts', 'starting'], 1, 'Past Perfect ใช้ hadn’t + กริยาช่อง 3 คือ started'),
    ],
  },
  {
    title: 'Reported Speech — เล่าคำพูดของคนอื่น',
    sourceSubtopics: ['Reported Speech'],
    intro: 'Reported Speech คือการเล่าว่าใครพูดอะไร โดยไม่ต้องใส่เครื่องหมายคำพูด และมักเปลี่ยน will เป็น would เมื่อคำกริยานำเป็นอดีต',
    sections: [
      {
        heading: '🧠 Golden Rule — said + ประโยคที่เล่าต่อ',
        body: '“ถ้า said เป็นอดีต will มักถอยเป็น would” เช่น He said, “I will come.” → He said he would come.',
        examples: [
          { en: 'He said he would meet me at five.', th: 'will ถอยเป็น would หลัง said', ok: true },
          { en: 'She said that she was tired.', th: 'เล่าคำพูดต่อโดยไม่ใส่เครื่องหมายคำพูด', ok: true },
          { en: 'He said he will meet me at five.', th: 'ในโจทย์ที่ said เป็นอดีต มักต้องถอยเป็น would', ok: false },
        ],
        table: {
          headers: ['คำพูดเดิม', 'Reported Speech', 'การเปลี่ยน'],
          rows: [
            ['I will go.', 'He said he would go.', 'will → would'],
            ['I am tired.', 'She said she was tired.', 'am → was'],
            ['I can help.', 'He said he could help.', 'can → could'],
          ],
        },
      },
      {
        heading: 'เปลี่ยนคนให้ตรงบริบท',
        body: 'ตอนเล่าต่อให้ดูว่าใครเป็นคนพูด เช่น I อาจเปลี่ยนเป็น he หรือ she และ you อาจเปลี่ยนเป็น me หรือ him',
        examples: [
          { en: 'John said he would call.', th: 'I ในคำพูดของ John เปลี่ยนเป็น he', ok: true },
          { en: 'Mary told me she was busy.', th: 'she ยังหมายถึง Mary', ok: true },
        ],
      },
    ],
    vocab: {
      columns: ['คำพูดเดิม', 'หลัง said', 'ตัวอย่าง'],
      rows: [
        ['will', 'would', 'will go → would go'],
        ['can', 'could', 'can help → could help'],
        ['am / is', 'was', 'is busy → was busy'],
      ],
    },
    tip: 'เจอ said ที่เป็นอดีต ให้ลองเช็ก will → would ก่อนเลย ข้อนี้ออกสอบบ่อย',
    tap: [
      pair('He said he would meet me at five.', 'He said he will meet me at five.'),
      pair('She said she was tired.', 'She said she is tired.'),
      pair('John said he could help.', 'John said he can helped.'),
      pair('Mary told me she was busy.', 'Mary told me she were busy.'),
      pair('He said he had finished.', 'He said he has finish.'),
    ],
    questions: [
      q('He said he ____ meet you at five.', ['would', 'will', 'did', 'has'], 0, 'หลัง said ที่เป็นอดีต will เปลี่ยนเป็น would'),
      q('She said she ____ tired.', ['was', 'were', 'is', 'be'], 0, 'is/am ในคำพูดเดิมมักถอยเป็น was'),
      q('John said he ____ help us.', ['could', 'can', 'does', 'did'], 0, 'can เปลี่ยนเป็น could หลัง said'),
      q('Mary told me she ____ busy.', ['was', 'were', 'be', 'are'], 0, 'she เป็นเอกพจน์ ใช้ was'),
      q('He said he ____ finished the work.', ['had', 'has', 'have', 'did'], 0, 'การเล่าอดีตที่เสร็จแล้วใช้ had finished'),
      q('She said that she ____ come later.', ['would', 'will', 'does', 'is'], 0, 'said + would come'),
    ],
  },
  {
    title: 'Present Simple — กริยาแท้ในชีวิตประจำวัน',
    sourceSubtopics: ['Present Simple'],
    intro: 'Present Simple ใช้พูดถึงนิสัย ตารางเวลา หรือความจริงทั่วไป จำคู่ประธานกับรูปกริยาให้ถูก แล้วทุกอย่างจะง่ายขึ้น',
    sections: [
      {
        heading: '🧠 Golden Rule — คนเดียวเติม s หลายคนใช้รูปเดิม',
        body: '“He / She / It + V-s” แต่ “I / You / We / They + V.1” ถ้ามี Does หรือ don’t ตามหลังก็กลับไปใช้รูปเดิม',
        examples: [
          { en: 'She works every day.', th: 'she คนเดียว → works', ok: true },
          { en: 'They work every day.', th: 'they หลายคน → work', ok: true },
          { en: 'She work every day.', th: 'ผิด — she ต้องใช้ works', ok: false },
        ],
        table: {
          headers: ['ประธาน', 'กริยา', 'ตัวอย่าง'],
          rows: [
            ['He / She / It', 'เติม s / es', 'He goes to school.'],
            ['I / You / We / They', 'รูปเดิม', 'They go to school.'],
            ['คำถาม', 'Do / Does + V.1', 'Does he go?'],
          ],
        },
      },
      {
        heading: 'คำบอกความถี่ช่วยบอก Present Simple',
        body: 'always, often, usually, every day, on Tuesdays บอกว่าสิ่งนั้นเป็นนิสัยหรือทำซ้ำๆ จึงมักใช้ Present Simple',
        examples: [
          { en: 'Anna stays at home on Tuesdays.', th: 'ตารางเวลาซ้ำๆ → stays', ok: true },
          { en: 'He does his homework after dinner.', th: 'กิจวัตร → does', ok: true },
        ],
      },
    ],
    vocab: {
      columns: ['ประธาน', 'รูปกริยา', 'ตัวอย่าง'],
      rows: [
        ['He / She / It', 'V-s / V-es', 'She studies English.'],
        ['I / You / We / They', 'V.1', 'They study English.'],
        ['every day / often', 'Present Simple', 'He works every day.'],
      ],
    },
    tip: 'อย่าลืมว่า do / does ที่เป็นคำช่วยจะทำให้กริยาหลักกลับเป็นรูปเดิม',
    tap: [
      pair('The shop closes at 8 pm.', 'The shop close at 8 pm.'),
      pair('Luca sends funny messages.', 'Luca send funny messages.'),
      pair('Sarah studies English every evening.', 'Sarah study English every evening.'),
      pair('They have two children.', 'They has two children.'),
      pair('Does she like coffee?', 'Does she likes coffee?'),
    ],
    questions: [
      q('The shop ____ at 8 pm.', ['close', 'closes', 'closing', 'closed'], 1, 'The shop เป็นเอกพจน์ จึงใช้ closes'),
      q('Luca often ____ funny messages.', ['send', 'sends', 'sending', 'sent'], 1, 'Luca เป็นคนเดียว จึงใช้ sends'),
      q('Sometimes she ____ a piece of bread.', ['take', 'takes', 'taking', 'took'], 1, 'she เป็นเอกพจน์ จึงใช้ takes'),
      q('Anna ____ at home on Tuesdays.', ['stay', 'stays', 'staying', 'stayed'], 1, 'Anna เป็นเอกพจน์ จึงใช้ stays'),
      q('Sarah ____ English every evening.', ['study', 'studies', 'studying', 'studied'], 1, 'study เปลี่ยน y เป็น ies เมื่อประธานเป็นเอกพจน์'),
      q('He ____ his homework after dinner.', ['do', 'does', 'doing', 'did'], 1, 'He เป็นเอกพจน์ จึงใช้ does'),
    ],
  },
];

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"') {
      if (quoted && next === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((cell) => cell.trim())) rows.push(row);
  }
  return rows;
}

function readCsvQuestions(): CsvQuestion[] {
  try {
    const rows = parseCsv(readFileSync(CSV_PATH, 'utf8').replace(/^\uFEFF/, ''));
    const headers = rows.shift()?.map((header) => header.trim()) ?? [];
    const index = Object.fromEntries(headers.map((header, i) => [header, i]));
    return rows.map((row) => {
      const options = [index.optionA, index.optionB, index.optionC, index.optionD]
        .map((i) => (i === undefined ? '' : (row[i] ?? '').trim()))
        .filter(Boolean);
      const answer = (row[index.correctAnswer] ?? 'A').trim().toUpperCase().charCodeAt(0) - 65;
      return {
        topic: (row[index.grammarTopic] ?? '').trim(),
        subtopic: (row[index.grammarSubTopic] ?? '').trim(),
        sentence: (row[index.questionText] ?? '').trim().replace(/_{3,}/g, '____'),
        options,
        answerIndex: Math.max(0, Math.min(answer, options.length - 1)),
        explanation: (row[index.explanation] ?? '').trim() || 'ดูคำช่วยและรูปกริยาที่อยู่ในประโยคเป็นหลักนะ',
      };
    }).filter((item) => item.sentence && item.options.length >= 2);
  } catch (error) {
    console.warn(`อ่าน CSV ไม่ได้ (${String(error)}) จะใช้ข้อสอบที่เตรียมไว้ทั้งหมด`);
    return [];
  }
}

function questionsFor(spec: NodeSpec, csv: CsvQuestion[]): Question[] {
  const source = csv.filter((item) => {
    const topicMatches = item.topic === AUX_TOPIC || item.topic === TENSE_TOPIC;
    return topicMatches && spec.sourceSubtopics.includes(item.subtopic);
  });
  const result: Question[] = [];
  const seen = new Set<string>();
  for (const item of [...source, ...spec.questions]) {
    if (seen.has(item.sentence)) continue;
    seen.add(item.sentence);
    result.push({
      sentence: item.sentence,
      options: item.options,
      answerIndex: item.answerIndex,
      explanation: item.explanation,
    });
    if (result.length === 6) break;
  }
  if (result.length < 6) throw new Error(`${spec.title} มีข้อสอบไม่ครบ 6 ข้อ (พบ ${result.length})`);
  return result;
}

async function main() {
  const csv = readCsvQuestions();
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
      const questions = questionsFor(spec, csv);

      await tx.insert(lessonPages).values({
        nodeId: node.id,
        pageType: 'explain',
        intro: spec.intro,
        sections: [
          ...spec.sections,
          {
            heading: '✨ Tap & Select — ฝึกแยกประโยคให้ถูก',
            body: 'อ่านประโยค A กับ B แล้วเลือกประโยคที่ถูกต้องนะ ผิดได้ ไม่เป็นไร ลองดูเหตุผลแล้วจำกฎไปด้วย',
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
        quiz: { questions },
        vocabBank: null,
        tip: null,
        intro: null,
        isPublished: true,
        orderIndex: 1,
      });
    }
  });

  const [rebuiltUnit] = await db.select().from(learningUnits).where(eq(learningUnits.id, unit.id));
  const nodes = await db.select({ id: learningNodes.id, title: learningNodes.title, orderIndex: learningNodes.orderIndex }).from(learningNodes).where(eq(learningNodes.unitId, unit.id)).orderBy(asc(learningNodes.orderIndex), asc(learningNodes.id));
  console.log(JSON.stringify({
    unitId: rebuiltUnit.id,
    unitTitle: rebuiltUnit.title,
    nodeCount: nodes.length,
    nodes,
    pagesPerNode: 2,
    tapItemsPerNode: 2,
    questionsPerNode: 6,
    unit2Untouched: true,
  }, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
