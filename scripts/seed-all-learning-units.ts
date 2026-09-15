/**
 * Build the 13-unit learning path from the attached focus-form question bank.
 *
 * Each node is represented by three DB pages:
 * - explain page: the Concept Card
 * - explain page: the Tap & Select exercise
 * - quiz page: one Real Exam page containing six questions
 *
 * The learner UI presents those as three steps: Concept Card -> Tap & Select
 * -> Real Exam. Existing one-question quiz rows remain supported by the
 * normalizer in src/lib/learning-path.ts.
 *
 * Run: npx tsx scripts/seed-all-learning-units.ts
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { db } from '../src/db';
import { learningUnits, learningNodes, lessonPages } from '../src/db/schema';
import { asc, eq } from 'drizzle-orm';

const CSV_PATH = 'C:/Users/IHCK/Downloads/focus on form/Focus on form - แยกชุดย่อย (grammarSubTopic).csv';
const UNIT_TITLES = [
  'Part of Speech',
  'Subject-Verb Agreement',
  'Auxiliaries & Verb Forms',
  'Questions & Polite Requests',
  'Quantifiers & Pronouns',
  'Prepositions & Phrasal Verbs',
  'Comparatives & Superlatives',
  'Infinitive / Gerund / Verb Pattern',
  'Collocations & Conjunctions',
  'Relative Clauses',
  'Conditionals & Passive Voice',
  'Adverbs of Frequency',
  'Subjunctive Mood',
] as const;

type Question = {
  sentence: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

type CsvQuestion = Question & { subtopic: string; topic: string; id: string };
type NodeConfig = { title: string; key: string; subtopics?: string[]; topic?: string };

const UNIT_SOURCE_TOPICS: string[][] = [
  [],
  ['ประธาน-กริยาสอดคล้อง (Subject-Verb Agreement)'],
  ['คำกริยาช่วยและกิริยาแท้ (Auxiliaries & Verb Forms)', 'กาลเวลา (Tenses: Past / Present Perfect / Future)'],
  ['ประโยคคำถามและการขอร้องสุภาพ (Questions & Polite Requests)'],
  ['คำบอกปริมาณและสรรพนาม (Quantifiers & Pronouns)'],
  ['บุพบทและวลีบุพบท (Prepositions & Phrasal Verbs)'],
  ['การเปรียบเทียบ (Comparatives & Superlatives)'],
  ['To Infinitive / Gerund / Verb Pattern'],
  ['คำศัพท์คู่สำนวนและคำเชื่อม (Collocations & Conjunctions)'],
  ['อนุประโยคขยายความ (Relative Clauses)'],
  ['ประโยคเงื่อนไขและการถูกกระทำ (Conditionals & Passive Voice)'],
  ['คำวิเศษณ์บอกความถี่ (Adverbs of Frequency)'],
  ['Subjunctive Mood'],
];

const PREFERRED_SUBTOPICS: string[][] = [
  [],
  ['Present Simple เอกพจน์บุรุษที่ 3 (เติม s/es)', 'have / has', 'Neither of + เอกพจน์'],
  [
    "Do / Don't (คำถาม-ปฏิเสธ Present Simple)",
    'Does (คำถามเอกพจน์บุรุษที่ 3)',
    'Did (คำถาม-ตอบอดีต)',
    'Modal Verbs (should/must/had better/won\'t/used to)',
    'Have got',
    'So do I (ตอบรับสั้น ๆ)',
    'Future (will / แผนอนาคต)',
    'Present Continuous',
    'Past Simple',
    'Present Perfect',
    'Past Perfect',
    'Reported Speech',
    'Present Simple',
  ],
];

const FALLBACK_NODE_CONFIGS: NodeConfig[][] = [
  [
    { title: 'Nouns & Verbs', key: 'parts-nouns' },
    { title: 'Adjectives & Adverbs', key: 'parts-adjectives' },
    { title: 'Articles & Word Classes', key: 'parts-articles', subtopics: ['Articles (a/an/the)', 'คำขยายความ (quite / really)'] },
  ],
  [
    { title: 'Singular Subjects', key: 'sva-singular', subtopics: ['Present Simple เอกพจน์บุรุษที่ 3 (เติม s/es)', 'have / has', 'Neither of + เอกพจน์'] },
    { title: 'Plural Subjects', key: 'sva-plural', subtopics: ['Present Simple เอกพจน์บุรุษที่ 3 (เติม s/es)', 'have / has'] },
    { title: 'Indefinite Pronouns', key: 'sva-indefinite', subtopics: ['Indefinite Pronouns (anything/either/none/neither)', 'Neither of + เอกพจน์'] },
  ],
  [
    { title: 'Do', key: 'aux-do', subtopics: ["Do / Don't (คำถาม-ปฏิเสธ Present Simple)"] },
    { title: 'Does', key: 'aux-does', subtopics: ['Does (คำถามเอกพจน์บุรุษที่ 3)'] },
    { title: 'Did', key: 'aux-did', subtopics: ['Did (คำถาม-ตอบอดีต)'] },
    { title: 'Modal Verbs', key: 'aux-modal', subtopics: ['Modal Verbs (should/must/had better/won\'t/used to)'] },
    { title: 'Have got & Short Answers', key: 'aux-have-short', subtopics: ['Have got', 'So do I (ตอบรับสั้น ๆ)'] },
    { title: 'Tenses & Verb Forms', key: 'aux-tenses', subtopics: ['Future (will / แผนอนาคต)', 'Present Continuous', 'Past Simple', 'Reported Speech', 'Present Perfect', 'Past Perfect', 'Present Simple'] },
  ],
  [
    { title: 'Wh-Questions', key: 'questions-wh', subtopics: ['Wh-Questions'] },
    { title: 'Polite Requests', key: 'questions-polite', subtopics: ['Polite Requests (Could I / Would you like)'] },
    { title: 'Question Tags', key: 'questions-tags', subtopics: ['Question Tags'] },
  ],
  [
    { title: 'It / There', key: 'pronouns-it', subtopics: ['สรรพนาม It (How far is it / อ้างอิงสิ่งของ)', 'There is / There are'] },
    { title: 'Some / Any / Quantifiers', key: 'pronouns-quantifiers', subtopics: ['Some / Any', 'Much / Many', 'Enough', 'Such'] },
    { title: 'Possessives & Personal Pronouns', key: 'pronouns-possessives', subtopics: ['Possessive Adjectives (his/her/their)', 'Possessive Pronouns (mine)', 'Personal Pronouns (we/me/them)', 'Reflexive Pronouns (myself)'] },
  ],
  [
    { title: 'Prepositions of Place', key: 'prep-place', subtopics: ['บุพบทบอกสถานที่ (in/on/at/to)'] },
    { title: 'Prepositions of Time', key: 'prep-time', subtopics: ['บุพบทบอกเวลา (in/for/at)'] },
    { title: 'Prepositions in Phrases', key: 'prep-phrases', subtopics: ['บุพบทที่มาคู่กับคำอื่น (look forward to / worried about / a lot of)'] },
    { title: 'Phrasal Verbs', key: 'prep-phrasal', subtopics: ['Phrasal Verbs (eat out / turn on / look for ฯลฯ)', 'Phrasal Verbs (get over)'] },
  ],
  [
    { title: 'Comparatives', key: 'compare-comparative', subtopics: ['ขั้นกว่า (Comparative)'] },
    { title: 'Superlatives', key: 'compare-superlative', subtopics: ['ขั้นสูงสุด (Superlative)'] },
  ],
  [
    { title: 'To + Infinitive', key: 'verbs-to', subtopics: ['To + Infinitive'] },
    { title: 'Bare Infinitive', key: 'verbs-bare', subtopics: ["Bare Infinitive (let / can't help but / see someone do)"] },
    { title: 'Gerund & Verb Patterns', key: 'verbs-gerund', subtopics: ['Gerund (-ing)', 'Verb Pattern อื่น ๆ (get used to)'] },
  ],
  [
    { title: 'And / Or', key: 'colloc-conjunctions', subtopics: ['คำเชื่อม and / or'] },
    { title: 'Verb + Noun Collocations', key: 'colloc-verb-noun', subtopics: ['Collocation กริยา+คำนาม (have a good time / leave a message)'] },
    { title: 'Everyday Expressions', key: 'colloc-expressions', subtopics: ['คำศัพท์ตามบริบท (borrow/lend, shy, no surprise ฯลฯ)', 'สำนวนในบทสนทนา (Here you are ฯลฯ)', 'Phrasal Verbs (get over)', 'Verb + Object + to V.1 (told someone to do)'] },
  ],
  [
    { title: 'Who / That', key: 'relative-who', subtopics: ['who / that (ประธานของอนุประโยค)'] },
    { title: 'Whose / What', key: 'relative-whose', subtopics: ['whose', 'what (= สิ่งที่)'] },
    { title: 'Relative Clauses in Context', key: 'relative-context', subtopics: ['who / that (ประธานของอนุประโยค)', 'whose', 'what (= สิ่งที่)'] },
  ],
  [
    { title: 'Passive Voice', key: 'condition-passive', subtopics: ['Passive Voice'] },
    { title: 'Conditionals', key: 'condition-if', subtopics: ['Conditional (if)'] },
  ],
  [{ title: 'Frequency Words', key: 'frequency', subtopics: ['คำบอกความถี่ (never/often)'] }],
  [{ title: 'Subjunctive after insist', key: 'subjunctive', subtopics: ['Subjunctive (insist that + V.1)'] }],
];

function nodeTitleFor(subtopic: string, unitIndex: number, nodeIndex: number): string {
  const special: Record<string, string> = {
    "Do / Don't (คำถาม-ปฏิเสธ Present Simple)": 'Do',
    'Does (คำถามเอกพจน์บุรุษที่ 3)': 'Does',
    'Did (คำถาม-ตอบอดีต)': 'Did',
    'Modal Verbs (should/must/had better/won\'t/used to)': 'Modal Verbs',
    'Have got': 'Have got',
    'So do I (ตอบรับสั้น ๆ)': 'Short Answers',
  };
  return special[subtopic] ?? subtopic;
}

/** Build one node per real grammar subtopic; node counts are intentionally dynamic. */
function buildNodeConfigs(bank: CsvQuestion[]): NodeConfig[][] {
  return UNIT_TITLES.map((unitTitle, unitIndex) => {
    const sourceTopics = UNIT_SOURCE_TOPICS[unitIndex] ?? [];
    const topicSubtopics = new Map<string, { topic: string; subtopic: string }>();
    for (const question of bank) {
      if (!sourceTopics.includes(question.topic) || !question.subtopic) continue;
      const key = `${question.topic}::${question.subtopic}`;
      topicSubtopics.set(key, { topic: question.topic, subtopic: question.subtopic });
    }
    const pairs = [...topicSubtopics.values()];

    const preferred = PREFERRED_SUBTOPICS[unitIndex] ?? [];
    const orderedPairs = preferred
      .filter((subtopic) => pairs.some((pair) => pair.subtopic === subtopic))
      .map((subtopic) => pairs.find((pair) => pair.subtopic === subtopic)!);
    const remainingPairs = pairs.filter((pair) => !preferred.includes(pair.subtopic));
    const sortedPairs = [...orderedPairs, ...remainingPairs];

    if (sortedPairs.length === 0) {
      return (FALLBACK_NODE_CONFIGS[unitIndex] ?? [{ title: 'พื้นฐาน', key: `unit-${unitIndex}-basic` }])
        .map((config) => ({ ...config, topic: sourceTopics[0] ?? unitTitle }));
    }

    return sortedPairs.map(({ topic, subtopic }, nodeIndex) => ({
      title: nodeTitleFor(subtopic, unitIndex, nodeIndex),
      key: `unit-${unitIndex}-${nodeIndex}`,
      subtopics: [subtopic],
      topic,
    }));
  });
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"') {
      if (quoted && next === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i++;
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

function csvQuestions(): CsvQuestion[] {
  const text = readFileSync(CSV_PATH, 'utf8').replace(/^\uFEFF/, '');
  const rows = parseCsv(text);
  const headers = rows.shift()!.map((header) => header.trim());
  const index = Object.fromEntries(headers.map((header, i) => [header, i]));
  return rows
    .map((row, i) => {
      const answer = (row[index.correctAnswer] ?? 'A').trim().toUpperCase().charCodeAt(0) - 65;
      const options = [row[index.optionA], row[index.optionB], row[index.optionC], row[index.optionD]].map((value) => (value ?? '').trim());
      return {
        id: `csv-${i}`,
        subtopic: (row[index.grammarSubTopic] ?? '').trim(),
        topic: (row[index.grammarTopic] ?? '').trim(),
        sentence: (row[index.questionText] ?? '').trim().replace(/_{3,}/g, '____'),
        options,
        answerIndex: Math.max(0, Math.min(answer, options.length - 1)),
        explanation: (row[index.explanation] ?? '').trim(),
      };
    })
    .filter((question) => question.sentence && question.options.filter(Boolean).length >= 2);
}

function generatedQuestion(key: string, title: string, i: number): Question {
  const titleQuestions: Array<{ match: RegExp; questions: Question[] }> = [
    {
      match: /Do \/ Don't|^Do$/i,
      questions: [
        q('Do you ____ an apple?', ['want', 'wants', 'wanted', 'wanting'], 0, 'หลัง Do ใช้กริยารูปพื้นฐาน คือ want'),
        q('People do ____ want flies around their houses.', ['not', 'no', 'none', 'never'], 0, 'do not ใช้ทำประโยคปฏิเสธ'),
        q('Do they ____ near here?', ['live', 'lives', 'lived', 'living'], 0, 'หลัง Do ใช้ live รูปพื้นฐาน'),
        q('I don’t ____ spicy food.', ['like', 'likes', 'liked', 'liking'], 0, 'หลัง don’t ใช้ like รูปพื้นฐาน'),
        q('Do we ____ to book a table?', ['need', 'needs', 'needed', 'needing'], 0, 'หลัง Do ใช้ need รูปพื้นฐาน'),
        q('Do you ____ coffee every morning?', ['drink', 'drinks', 'drank', 'drinking'], 0, 'หลัง Do ใช้ drink รูปพื้นฐาน'),
      ],
    },
    {
      match: /^Does|Does /i,
      questions: [
        q('Does your brother ____ Christmas with you?', ['spend', 'spends', 'spent', 'spending'], 0, 'หลัง Does ใช้ spend รูปพื้นฐาน'),
        q('Does she ____ tennis?', ['play', 'plays', 'played', 'playing'], 0, 'หลัง Does กริยาหลักไม่เติม s'),
        q('Does the shop ____ at 8 pm?', ['close', 'closes', 'closed', 'closing'], 0, 'หลัง Does ใช้ close รูปพื้นฐาน'),
        q('Does Anna ____ funny messages?', ['send', 'sends', 'sent', 'sending'], 0, 'หลัง Does ใช้ send รูปพื้นฐาน'),
        q('He doesn’t ____ tea.', ['drink', 'drinks', 'drank', 'drinking'], 0, 'หลัง doesn’t ใช้ drink รูปพื้นฐาน'),
        q('Does your sister ____ English?', ['study', 'studies', 'studied', 'studying'], 0, 'หลัง Does ใช้ study รูปพื้นฐาน'),
      ],
    },
    {
      match: /^Did|Did /i,
      questions: [
        q('Did you ____ the basketball game?', ['watch', 'watched', 'watches', 'watching'], 0, 'หลัง Did ใช้กริยาช่อง 1'),
        q('Where did you ____ last night?', ['go', 'went', 'goes', 'going'], 0, 'หลัง did ใช้ go ไม่ใช่ went'),
        q('Did he ____ you yesterday?', ['call', 'called', 'calls', 'calling'], 0, 'หลัง Did ใช้ call รูปพื้นฐาน'),
        q('They didn’t ____ late.', ['arrive', 'arrived', 'arrives', 'arriving'], 0, 'หลัง didn’t ใช้กริยารูปพื้นฐาน'),
        q('Did she ____ the answer?', ['know', 'knew', 'knows', 'knowing'], 0, 'หลัง Did ใช้ know รูปพื้นฐาน'),
        q('Man: Did you order the coffee? Woman: Yes, I ____.', ['did', 'do', 'does', 'doing'], 0, 'ใช้ did ตอบรับคำถามที่ขึ้นต้นด้วย Did'),
      ],
    },
    {
      match: /Prepositions of Place|สถานที่ \(in\/on\/at\/to\)/i,
      questions: [
        q('John lives ____ the United States.', ['at', 'in', 'on', 'to'], 1, 'ใช้ in กับประเทศ'),
        q('The family goes ____ the park.', ['at', 'to', 'in', 'on'], 1, 'go to + สถานที่'),
        q('The keys are ____ the table.', ['in', 'on', 'at', 'to'], 1, 'ใช้ on กับพื้นผิว'),
        q('She is waiting ____ the bus stop.', ['at', 'in', 'on', 'to'], 0, 'ใช้ at กับจุดสถานที่'),
        q('The children are ____ the classroom.', ['in', 'on', 'at', 'to'], 0, 'ใช้ in กับพื้นที่ด้านใน'),
        q('Put the book ____ the desk.', ['to', 'at', 'in', 'on'], 3, 'หนังสืออยู่บนโต๊ะ ใช้ on'),
      ],
    },
    {
      match: /Prepositions of Time|เวลา \(in\/for\/at\)/i,
      questions: [
        q('I leave home ____ 7 a.m.', ['in', 'on', 'at', 'for'], 2, 'ใช้ at กับเวลาที่ระบุ'),
        q('She has lived here ____ six years.', ['since', 'for', 'at', 'on'], 1, 'ใช้ for กับช่วงเวลา'),
        q('We met ____ Monday.', ['at', 'in', 'on', 'for'], 2, 'ใช้ on กับวัน'),
        q('He was born ____ 2001.', ['at', 'on', 'in', 'for'], 2, 'ใช้ in กับปี'),
        q('The shop opens ____ the morning.', ['at', 'on', 'in', 'for'], 2, 'ใช้ in กับช่วงของวัน'),
        q('I waited ____ ten minutes.', ['at', 'on', 'in', 'for'], 3, 'ใช้ for กับระยะเวลา'),
      ],
    },
    {
      match: /Comparative|ขั้นกว่า/i,
      questions: [
        q('This book is ____ than that one.', ['interesting', 'more interesting', 'most interesting', 'interest'], 1, 'คำหลายพยางค์ใช้ more + adjective'),
        q('Sam is ____ than his brother.', ['tall', 'taller', 'tallest', 'more tall'], 1, 'คำสั้นใช้ -er เมื่อเปรียบเทียบ'),
        q('This phone is much ____.', ['cheap', 'cheaper', 'cheapest', 'more cheap'], 1, 'much + comparative ใช้ cheaper'),
        q('The train is ____ than the bus.', ['fast', 'faster', 'fastest', 'more fast'], 1, 'fast เปลี่ยนเป็น faster'),
        q('Today is ____ than yesterday.', ['good', 'better', 'best', 'well'], 1, 'good มี comparative เป็น better'),
        q('This test is ____ difficult than the last one.', ['more', 'most', 'much', 'many'], 0, 'ใช้ more ขยาย difficult'),
      ],
    },
    {
      match: /Superlative|ขั้นสูงสุด/i,
      questions: [
        q('It was one of the ____ films I have seen.', ['bad', 'worse', 'worst', 'badly'], 2, 'one of the + superlative ใช้ worst'),
        q('This is the ____ room in the house.', ['small', 'smaller', 'smallest', 'more small'], 2, 'small เปลี่ยนเป็น smallest'),
        q('She is the ____ student in the class.', ['good', 'better', 'best', 'well'], 2, 'good มี superlative เป็น best'),
        q('That was the ____ day of my trip.', ['happy', 'happier', 'happiest', 'more happy'], 2, 'happy เปลี่ยน y เป็น iest'),
        q('This is the ____ expensive option.', ['more', 'most', 'much', 'many'], 1, 'คำหลายพยางค์ใช้ most'),
        q('Who runs the ____ in your team?', ['fast', 'faster', 'fastest', 'more fast'], 2, 'ถามระดับสูงสุดใช้ fastest'),
      ],
    },
    {
      match: /To \+ Infinitive|To Infinitive/i,
      questions: [
        q('The best way is ____ find the answer.', ['for', 'to', 'at', 'by'], 1, 'to + กริยาช่อง 1'),
        q('I went to the store ____ buy milk.', ['to', 'for', 'at', 'by'], 0, 'to buy บอกจุดประสงค์'),
        q('She wants ____ learn English.', ['to', 'for', 'at', 'by'], 0, 'want ตามด้วย to + verb'),
        q('We decided ____ leave early.', ['to', 'for', 'at', 'in'], 0, 'decide ตามด้วย to + verb'),
        q('He stopped ____ talk to his friend.', ['to', 'for', 'at', 'by'], 0, 'stop to talk = หยุดเพื่อไปคุย'),
        q('I have something ____ do.', ['to', 'for', 'at', 'on'], 0, 'something to do'),
      ],
    },
    {
      match: /Gerund|Verb Pattern อื่น/i,
      questions: [
        q('She enjoys ____ books.', ['read', 'to read', 'reading', 'reads'], 2, 'enjoy ตามด้วย gerund -ing'),
        q('He keeps ____ at his watch.', ['look', 'to look', 'looking', 'looked'], 2, 'keep ตามด้วยกริยา -ing'),
        q('I am getting used ____ this schedule.', ['to', 'for', 'at', 'in'], 0, 'get used to + noun หรือ V-ing'),
        q('They stopped ____ when the bell rang.', ['talk', 'talked', 'talking', 'to talking'], 2, 'stop doing = หยุดการกระทำนั้น'),
        q('She is good at ____ pictures.', ['draw', 'to draw', 'drawing', 'draws'], 2, 'หลังบุพบท at ใช้ gerund'),
        q('He finished ____ the report.', ['write', 'to write', 'writing', 'writes'], 2, 'finish ตามด้วย gerund'),
      ],
    },
    {
      match: /Who \/ That|Relative Clauses|whose|what \(=/i,
      questions: [
        q('The woman ____ won the award is my teacher.', ['which', 'whose', 'whom', 'who'], 3, 'who ใช้แทนคนที่เป็นประธาน'),
        q('The book ____ I bought is useful.', ['who', 'that', 'whose', 'where'], 1, 'that ใช้ขยายสิ่งของ'),
        q('The man ____ car is blue lives next door.', ['who', 'which', 'whose', 'what'], 2, 'whose แสดงความเป็นเจ้าของ'),
        q('She explained ____ she wanted.', ['what', 'who', 'whose', 'where'], 0, 'what = สิ่งที่'),
        q('I know the student ____ helped you.', ['who', 'whose', 'which', 'what'], 0, 'who ใช้กับคน'),
        q('This is the place ____ we met.', ['who', 'whose', 'where', 'what'], 2, 'where ใช้กับสถานที่'),
      ],
    },
    {
      match: /Passive Voice|Passive/i,
      questions: [
        q('The invitations ____ sent yesterday.', ['is', 'was', 'were', 'are'], 2, 'invitations เป็นพหูพจน์และถูกส่งในอดีต ใช้ were'),
        q('The window ____ broken last night.', ['is', 'was', 'were', 'be'], 1, 'window เอกพจน์ใน passive อดีตใช้ was'),
        q('The cake ____ made by Anna.', ['was', 'were', 'are', 'be'], 0, 'cake เอกพจน์ ใช้ was made'),
        q('English ____ spoken in many countries.', ['is', 'are', 'were', 'be'], 0, 'English เอกพจน์ ใช้ is spoken'),
        q('The letters ____ delivered this morning.', ['was', 'is', 'were', 'be'], 2, 'letters เป็นพหูพจน์ ใช้ were'),
        q('The car ____ repaired yesterday.', ['were', 'was', 'are', 'be'], 1, 'car เอกพจน์ ใช้ was repaired'),
      ],
    },
    {
      match: /Conditional|if/i,
      questions: [
        q('____ this does not work, try another way.', ['Because', 'If', 'Although', 'When'], 1, 'If ใช้บอกเงื่อนไข'),
        q('If I ____ more time, I would help.', ['have', 'had', 'will have', 'would have'], 1, 'if clause type 2 ใช้ past simple'),
        q('I will call you if I ____ home early.', ['get', 'got', 'will get', 'getting'], 0, 'หลัง if ในเงื่อนไขอนาคตใช้ present simple'),
        q('If it rains, we ____ stay home.', ['would', 'will', 'did', 'were'], 1, 'ผลลัพธ์ของเงื่อนไขใช้ will'),
        q('If she studied, she ____ pass the test.', ['will', 'would', 'is', 'has'], 1, 'if + past ใช้ would ในผลลัพธ์'),
        q('You can go out if you ____ your work.', ['finish', 'finished', 'will finish', 'finishing'], 0, 'หลัง if ใช้ finish รูปพื้นฐาน'),
      ],
    },
    {
      match: /Frequency|ความถี่/i,
      questions: [
        q('I ____ travel by bus.', ['always', 'yesterday', 'tomorrow', 'now'], 0, 'always บอกความถี่'),
        q('She visits us once a year, so she ____ comes here.', ['often', 'never', 'rarely', 'always'], 2, 'once a year = rarely'),
        q('How ____ do you exercise?', ['often', 'much', 'many', 'long'], 0, 'How often ใช้ถามความถี่'),
        q('He is ____ late for work.', ['never', 'tomorrow', 'last', 'soon'], 0, 'never บอกว่าไม่เคย'),
        q('We ____ eat out on Fridays.', ['usually', 'yesterday', 'already', 'now'], 0, 'usually บอกสิ่งที่ทำเป็นประจำ'),
        q('They ____ watch TV after dinner.', ['sometimes', 'last', 'next', 'ago'], 0, 'sometimes บอกความถี่'),
      ],
    },
  ];
  const matched = titleQuestions.find((entry) => entry.match.test(title));
  if (matched) return matched.questions[i % matched.questions.length];

  const sets: Record<string, Question[]> = {
    'parts-nouns': [
      q('A teacher works at a ____.', ['school', 'quickly', 'kind', 'teach'], 0, 'school เป็นคำนาม ใช้เรียกสถานที่'),
      q('My sister ____ English every day.', ['study', 'studies', 'studying', 'studied'], 1, 'studies เป็นกริยา เพราะบอกการกระทำของ sister'),
      q('The word “happy” is a ____.', ['noun', 'verb', 'adjective', 'adverb'], 2, 'happy ใช้บอกลักษณะ จึงเป็น adjective'),
      q('They ____ lunch at noon.', ['eat', 'eats', 'eating', 'ate'], 0, 'eat เป็นกริยาในประโยคนี้'),
      q('“Friendship” is a ____.', ['noun', 'verb', 'adjective', 'adverb'], 0, 'Friendship เป็นชื่อของสิ่งหนึ่ง จึงเป็น noun'),
      q('He runs ____.', ['quick', 'quickly', 'quicker', 'quickness'], 1, 'quickly เป็น adverb ขยาย runs'),
    ],
    'parts-adjectives': [
      q('She is a ____ driver.', ['carefully', 'careful', 'care', 'cared'], 1, 'careful ขยายคำนาม driver'),
      q('He speaks ____.', ['clear', 'clearly', 'clarity', 'cleared'], 1, 'clearly ขยายกริยา speaks'),
      q('The movie was ____.', ['interesting', 'interestingly', 'interest', 'interestedly'], 0, 'interesting ใช้บอกลักษณะของ movie'),
      q('Please listen ____.', ['careful', 'carefully', 'care', 'caring'], 1, 'carefully ขยายการ listen'),
      q('This is a ____ idea.', ['great', 'greatly', 'greatness', 'greater'], 0, 'great เป็น adjective ขยาย idea'),
      q('They worked ____.', ['hard', 'hardly', 'hardness', 'harder'], 0, 'hard ใช้เป็น adverb ได้ในความหมายว่าทำงานหนัก'),
    ],
    'aux-do': [
      q('Do you ____ coffee?', ['like', 'likes', 'liked', 'liking'], 0, 'หลัง Do ใช้กริยารูปพื้นฐาน'),
      q('They do ____ want to leave.', ['not', 'no', 'none', 'never'], 0, 'do not ใช้ทำประโยคปฏิเสธ'),
      q('Do we ____ to book a table?', ['need', 'needs', 'needed', 'needing'], 0, 'หลัง Do ใช้ need รูปพื้นฐาน'),
      q('I don’t ____ spicy food.', ['like', 'likes', 'liked', 'liking'], 0, 'หลัง don’t ใช้กริยารูปพื้นฐาน'),
      q('Do they ____ near here?', ['live', 'lives', 'living', 'lived'], 0, 'Do + they + live'),
      q('“Do” ใช้กับประธานกลุ่มใด?', ['He / She / It', 'I / You / We / They', 'She only', 'It only'], 1, 'Do ใช้กับ I, you, we, they และพหูพจน์'),
    ],
    'aux-does': [
      q('Does she ____ tennis?', ['play', 'plays', 'played', 'playing'], 0, 'หลัง Does กริยาหลักกลับเป็นรูปพื้นฐาน'),
      q('Does your brother ____ here?', ['work', 'works', 'worked', 'working'], 0, 'Does + your brother + work'),
      q('He doesn’t ____ tea.', ['drink', 'drinks', 'drank', 'drinking'], 0, 'หลัง doesn’t ใช้กริยารูปพื้นฐาน'),
      q('Does the shop ____ at eight?', ['close', 'closes', 'closed', 'closing'], 0, 'หลัง Does ใช้ close ไม่เติม s'),
      q('“Does” ใช้กับประธานแบบใด?', ['I / You', 'We / They', 'He / She / It', 'They only'], 2, 'Does ใช้กับเอกพจน์บุรุษที่ 3'),
      q('Does Anna ____ funny messages?', ['send', 'sends', 'sent', 'sending'], 0, 'หลัง Does ใช้ send รูปพื้นฐาน'),
    ],
    'aux-did': [
      q('Did you ____ the movie?', ['watch', 'watched', 'watches', 'watching'], 0, 'หลัง Did ใช้กริยาช่อง 1'),
      q('Where did they ____ yesterday?', ['go', 'went', 'goes', 'going'], 0, 'หลัง did ใช้ go ไม่ใช่ went'),
      q('Did he ____ you last night?', ['call', 'called', 'calls', 'calling'], 0, 'Did + call รูปพื้นฐาน'),
      q('I ____ my homework yesterday.', ['do', 'did', 'does', 'doing'], 1, 'yesterday บอกอดีต จึงใช้ did'),
      q('Did she ____ the answer?', ['know', 'knew', 'knows', 'knowing'], 0, 'หลัง Did ใช้ know'),
      q('They didn’t ____ late.', ['arrive', 'arrived', 'arrives', 'arriving'], 0, 'หลัง didn’t ใช้กริยารูปพื้นฐาน'),
    ],
    'frequency': [
      q('I ____ drink coffee in the morning.', ['always', 'yesterday', 'tomorrow', 'now'], 0, 'always บอกความถี่'),
      q('She ____ visits her grandparents; maybe once a year.', ['often', 'never', 'rarely', 'always'], 2, 'once a year สื่อว่าทำไม่บ่อย จึงใช้ rarely'),
      q('How ____ do you exercise?', ['often', 'many', 'much', 'long'], 0, 'ถามความถี่ใช้ How often'),
      q('He is ____ late for work.', ['never', 'tomorrow', 'last', 'very'], 0, 'never เป็น adverb of frequency'),
      q('We ____ go out on Fridays.', ['usually', 'yesterday', 'already', 'soon'], 0, 'usually ใช้บอกสิ่งที่ทำเป็นประจำ'),
      q('They sometimes ____ lunch together.', ['have', 'has', 'having', 'had'], 0, 'ประธาน they ใช้ have'),
    ],
    'subjunctive': [
      q('The manager insists that he ____ on time.', ['be', 'is', 'was', 'being'], 0, 'insist that + subject + กริยารูปพื้นฐาน'),
      q('She recommended that we ____ early.', ['leave', 'leaves', 'left', 'leaving'], 0, 'recommended that + leave รูปพื้นฐาน'),
      q('They demanded that the report ____ ready.', ['be', 'is', 'was', 'being'], 0, 'หลัง that ใช้ be รูปพื้นฐาน'),
      q('I suggest that he ____ more carefully.', ['work', 'works', 'worked', 'working'], 0, 'suggest that + work'),
      q('The teacher insisted that everyone ____ quiet.', ['be', 'is', 'was', 'being'], 0, 'ใช้ be หลัง insist that'),
      q('It is important that she ____ informed.', ['be', 'is', 'was', 'being'], 0, 'โครงสร้าง subjunctive ใช้ be'),
    ],
  };
  const common: Record<string, Question[]> = {
    'sva-singular': [q('The shop ____ at 8 pm.', ['close', 'closes', 'closing', 'closed'], 1, 'The shop เป็นเอกพจน์ จึงใช้ closes'), q('Anna ____ at home on Tuesdays.', ['stay', 'stays', 'staying', 'stayed'], 1, 'Anna เป็นเอกพจน์ จึงเติม s'), q('He ____ his homework after dinner.', ['do', 'does', 'doing', 'did'], 1, 'He ใช้ does ใน Present Simple'), q('My friend ____ this song.', ['love', 'loves', 'loving', 'loved'], 1, 'My friend เป็นเอกพจน์ จึงใช้ loves'), q('The cat ____ on the sofa.', ['sleep', 'sleeps', 'sleeping', 'slept'], 1, 'The cat เป็นเอกพจน์ จึงใช้ sleeps'), q('Sarah ____ English every evening.', ['study', 'studies', 'studying', 'studied'], 1, 'study เปลี่ยน y เป็น ies เมื่อประธานเป็นเอกพจน์')],
    'sva-plural': [q('They ____ two children.', ['has', 'have', 'had', 'having'], 1, 'They เป็นพหูพจน์ ใช้ have'), q('My friends ____ a new car.', ['has', 'have', 'having', 'had'], 1, 'My friends เป็นพหูพจน์ ใช้ have'), q('Tom and Jane ____ friends.', ['is', 'are', 'was', 'has'], 1, 'ประธานเชื่อมด้วย and เป็นพหูพจน์'), q('We ____ English every day.', ['study', 'studies', 'studying', 'studied'], 0, 'We ใช้กริยารูปพื้นฐาน'), q('The students ____ hard.', ['work', 'works', 'working', 'worked'], 0, 'students เป็นพหูพจน์'), q('Both teachers ____ strict.', ['is', 'are', 'was', 'has'], 1, 'Both เป็นพหูพจน์')],
    'sva-indefinite': [q('Everybody ____ ready.', ['is', 'are', 'be', 'were'], 0, 'Everybody ถือเป็นเอกพจน์'), q('Nothing ____ impossible.', ['is', 'are', 'were', 'be'], 0, 'Nothing ใช้ is'), q('Somebody ____ left a bag.', ['has', 'have', 'had', 'having'], 0, 'Somebody เป็นเอกพจน์'), q('Everyone ____ the rules.', ['know', 'knows', 'knew', 'knowing'], 1, 'Everyone ใช้ knows'), q('Each student ____ a book.', ['has', 'have', 'having', 'had'], 0, 'Each ตามด้วยกริยาเอกพจน์'), q('Neither answer ____ correct.', ['is', 'are', 'were', 'be'], 0, 'Neither ถือเป็นเอกพจน์')],
    'questions-wh': [q('____ do you live?', ['What', 'Where', 'Who', 'Whose'], 1, 'ถามสถานที่ใช้ Where'), q('____ do you get home?', ['How', 'Who', 'Which', 'Whose'], 0, 'ถามวิธีใช้ How'), q('____ often do you visit?', ['How', 'How much', 'How often', 'What'], 2, 'ถามความถี่ใช้ How often'), q('____ is your name?', ['Who', 'What', 'Where', 'Why'], 1, 'ถามชื่อใช้ What'), q('____ did you arrive?', ['When', 'Who', 'Whose', 'Which'], 0, 'ถามเวลาใช้ When'), q('____ do you do?', ['How', 'What', 'Where', 'Why'], 1, 'What do you do? ถามอาชีพ')],
    'questions-polite': [q('____ I speak to Mr Brown, please?', ['Would', 'Could', 'Do', 'Should'], 1, 'Could I เป็นการขอร้องสุภาพ'), q('____ you like some tea?', ['Do', 'Would', 'Are', 'Did'], 1, 'Would you like ใช้เสนออย่างสุภาพ'), q('Could I ____ your pen?', ['borrow', 'borrowed', 'borrowing', 'borrows'], 0, 'หลัง Could ใช้กริยารูปพื้นฐาน'), q('Would you ____ the window?', ['open', 'opened', 'opens', 'opening'], 0, 'หลัง Would you ใช้กริยารูปพื้นฐาน'), q('May I ____ you?', ['help', 'helped', 'helps', 'helping'], 0, 'หลัง May I ใช้กริยารูปพื้นฐาน'), q('Could you ____ a little louder?', ['speak', 'speaks', 'spoke', 'speaking'], 0, 'หลัง Could you ใช้ speak')],
    'questions-tags': [q('You play the piano, ____ you?', ['do', 'don’t', 'are', 'aren’t'], 1, 'ประโยคบอกเล่าใช้ tag ปฏิเสธ don’t'), q('They didn’t come, ____ they?', ['do', 'didn’t', 'did', 'were'], 2, 'ประโยคปฏิเสธใช้ tag บอกเล่า did'), q('She is ready, ____ she?', ['is', 'isn’t', 'does', 'did'], 1, 'is ในประโยคหลัก จึงใช้ isn’t'), q('He works here, ____ he?', ['does', 'doesn’t', 'is', 'did'], 1, 'works ใช้ tag doesn’t'), q('We can leave, ____ we?', ['can', 'can’t', 'do', 'are'], 1, 'can ในประโยคบอกเล่าใช้ can’t'), q('It is cold, ____ it?', ['is', 'isn’t', 'does', 'did'], 1, 'is ในประโยคหลักใช้ isn’t')],
  };
  const selected = sets[key] ?? common[key];
  if (selected) return selected[i % selected.length];
  return q('This sentence is ____ for practice.', ['ready', 'quickly', 'because', 'under'], 0, 'เลือกคำที่ทำหน้าที่เป็นคำคุณศัพท์ในประโยค');
}

function q(sentence: string, options: string[], answerIndex: number, explanation: string): Question {
  return { sentence, options, answerIndex, explanation };
}

function ruleFor(key: string): { rule: string; intro: string; examples: Array<{ en: string; th: string; ok: boolean }> } {
  const rules: Record<string, { rule: string; intro: string; examples: Array<{ en: string; th: string; ok: boolean }> }> = {
    'aux-do': { rule: '“Do” คู่กับ I, you, we, they และประธานพหูพจน์นะ', intro: 'จำง่ายๆ: Do + ประธานพหูพจน์ แล้วกริยาหลักใช้รูปเดิมเลย', examples: [{ en: 'Do you like coffee?', th: 'Do + you + like', ok: true }, { en: 'Do she like coffee?', th: 'ผิด — she ต้องใช้ Does', ok: false }] },
    'aux-does': { rule: '“Does” คู่กับ he, she, it และประธานเอกพจน์นะ', intro: 'ใช้ Does แล้วกริยาหลักไม่เติม s ต่อ เช่น Does she like...? ง่ายๆ แค่นี้เอง', examples: [{ en: 'Does she like coffee?', th: 'ถูก — Does + she + like', ok: true }, { en: 'Does she likes coffee?', th: 'ผิด — หลัง Does ใช้ like', ok: false }] },
    'aux-did': { rule: '“Did” ใช้ถามอดีต และกริยาหลัง Did เป็นช่อง 1 เสมอ', intro: 'เห็น yesterday หรือ last night ให้คิดถึง Did ได้เลยนะ', examples: [{ en: 'Did you watch the movie?', th: 'ถูก — Did + watch', ok: true }, { en: 'Did you watched the movie?', th: 'ผิด — หลัง Did ไม่เติม -ed', ok: false }] },
  };
  return rules[key] ?? { rule: '“ดูหน้าที่ของคำ แล้วเลือกคำที่เข้าคู่กันให้ถูกนะ”', intro: 'ค่อยๆ ดูประธาน เวลา และคำรอบๆ ก็พอ ไม่ต้องท่องยาวเลย', examples: [{ en: 'This answer is correct.', th: 'ตัวอย่างที่ถูก', ok: true }, { en: 'This answer are correct.', th: 'ตัวอย่างที่ผิด', ok: false }] };
}

function tapFor(key: string, title: string) {
  const items: Record<string, Array<{ prompt: string; choiceA: string; choiceB: string; correct: 0 | 1 }>> = {
    'aux-do': [{ prompt: 'Do you like music?', choiceA: 'ถูก', choiceB: 'ผิด', correct: 0 }, { prompt: 'Do she likes tea?', choiceA: 'ถูก', choiceB: 'ผิด', correct: 1 }, { prompt: 'They do not want flies.', choiceA: 'ถูก', choiceB: 'ผิด', correct: 0 }],
    'aux-does': [{ prompt: 'Does he play football?', choiceA: 'ถูก', choiceB: 'ผิด', correct: 0 }, { prompt: 'Does she plays tennis?', choiceA: 'ถูก', choiceB: 'ผิด', correct: 1 }, { prompt: 'Does the shop close at eight?', choiceA: 'ถูก', choiceB: 'ผิด', correct: 0 }],
    'aux-did': [{ prompt: 'Did you go home?', choiceA: 'ถูก', choiceB: 'ผิด', correct: 0 }, { prompt: 'Did she went there?', choiceA: 'ถูก', choiceB: 'ผิด', correct: 1 }, { prompt: 'They did not call me.', choiceA: 'ถูก', choiceB: 'ผิด', correct: 0 }],
    'sva-singular': [{ prompt: 'She works at a hospital.', choiceA: 'ถูก', choiceB: 'ผิด', correct: 0 }, { prompt: 'He work at a bank.', choiceA: 'ถูก', choiceB: 'ผิด', correct: 1 }, { prompt: 'The cat sleeps on the sofa.', choiceA: 'ถูก', choiceB: 'ผิด', correct: 0 }],
    'sva-plural': [{ prompt: 'They play football.', choiceA: 'ถูก', choiceB: 'ผิด', correct: 0 }, { prompt: 'My friends has a car.', choiceA: 'ถูก', choiceB: 'ผิด', correct: 1 }, { prompt: 'Tom and Jane are friends.', choiceA: 'ถูก', choiceB: 'ผิด', correct: 0 }],
    'sva-indefinite': [{ prompt: 'Everybody likes pizza.', choiceA: 'ถูก', choiceB: 'ผิด', correct: 0 }, { prompt: 'Everyone know the rules.', choiceA: 'ถูก', choiceB: 'ผิด', correct: 1 }, { prompt: 'Neither answer is correct.', choiceA: 'ถูก', choiceB: 'ผิด', correct: 0 }],
  };
  const fallback = [{ prompt: `${title} ใช้ตามกฎนี้ได้ถูกต้อง`, choiceA: 'ถูก', choiceB: 'ผิด', correct: 0 as const }, { prompt: `${title} ใช้แบบนี้ผิดกฎ`, choiceA: 'ถูก', choiceB: 'ผิด', correct: 1 as const }, { prompt: `ลองดูประโยคของ ${title} อีกที`, choiceA: 'ถูก', choiceB: 'ผิด', correct: 0 as const }];
  return { title: 'แตะเลือก — ฝึกแยกถูก/ผิด', items: items[key] ?? fallback };
}

async function main() {
  const bank = csvQuestions();
  const nodeConfigs = buildNodeConfigs(bank);
  const used = new Set<string>();
  const units = await db.select().from(learningUnits).orderBy(asc(learningUnits.orderIndex), asc(learningUnits.id));
  const byTitle = new Map(units.map((unit) => [unit.title, unit]));

  await db.transaction(async (tx) => {
    await tx.delete(lessonPages);
    await tx.delete(learningNodes);

    for (const [unitIndex, unitTitle] of UNIT_TITLES.entries()) {
      let unit = byTitle.get(unitTitle);
      if (!unit) {
        const [created] = await tx.insert(learningUnits).values({ title: unitTitle, subtitle: 'เรียนแบบสั้นๆ เข้าใจเร็ว', colorKey: ['green', 'blue', 'purple', 'orange'][unitIndex % 4], orderIndex: unitIndex, isPublished: true }).returning();
        unit = created;
      } else {
        await tx.update(learningUnits).set({ orderIndex: unitIndex, isPublished: true }).where(eq(learningUnits.id, unit.id));
      }

      for (const [nodeIndex, config] of nodeConfigs[unitIndex].entries()) {
        const [node] = await tx.insert(learningNodes).values({ unitId: unit.id, title: `Node ${nodeIndex + 1}: ${config.title}`, kind: nodeIndex === nodeConfigs[unitIndex].length - 1 ? 'trophy' : 'star', orderIndex: nodeIndex, isPublished: true, passScore: 100 }).returning();
        const matches = bank.filter((question) =>
          question.topic === config.topic &&
          config.subtopics?.includes(question.subtopic) &&
          !used.has(question.id)
        );
        matches.forEach((question) => used.add(question.id));
        const questions = [...matches, ...Array.from({ length: Math.max(0, 6 - matches.length) }, (_, i) => generatedQuestion(config.key, config.title, i))];
        const rule = ruleFor(config.key);
        const tap = tapFor(config.key, config.title);

        await tx.insert(lessonPages).values({
          nodeId: node.id,
          pageType: 'explain',
          intro: rule.intro,
          sections: [{ heading: `🧠 Golden Rule — ${config.title}`, body: `“${rule.rule}”`, examples: rule.examples }],
          quiz: null,
          vocabBank: null,
          tip: 'ค่อยๆ จำกฎสั้นๆ นี้ไว้ เดี๋ยวตอนทำโจทย์จะง่ายเองนะ',
          isPublished: true,
          orderIndex: 0,
        });
        await tx.insert(lessonPages).values({
          nodeId: node.id,
          pageType: 'explain',
          intro: null,
          sections: [{ heading: 'ลองฝึกกันเลย', body: 'แตะเลือกคำตอบที่คิดว่าถูกได้เลย ไม่ต้องกลัวผิดนะ', tap }],
          quiz: null,
          vocabBank: null,
          tip: null,
          isPublished: true,
          orderIndex: 1,
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
          orderIndex: 2,
        });
      }
    }
  });

  const finalUnits = await db.select().from(learningUnits).orderBy(asc(learningUnits.orderIndex), asc(learningUnits.id));
  const finalNodes = await db.select().from(learningNodes).orderBy(asc(learningNodes.unitId), asc(learningNodes.orderIndex), asc(learningNodes.id));
  const finalPages = await db.select().from(lessonPages).orderBy(asc(lessonPages.nodeId), asc(lessonPages.orderIndex), asc(lessonPages.id));
  console.log(JSON.stringify({ units: finalUnits.length, nodes: finalNodes.length, pages: finalPages.length, questions: finalPages.reduce((sum, page) => sum + ((page.quiz as { questions?: unknown[] } | null)?.questions?.length ?? 0), 0), importedQuestions: used.size }, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
