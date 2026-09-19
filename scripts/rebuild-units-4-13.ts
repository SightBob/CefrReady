/**
 * Rebuild Units 4–13 only.
 *
 * Unit 2 and Unit 3 are explicitly excluded. Each rebuilt node gets:
 *   1) Explain page with friendly Concept Card + inline Tap & Select
 *   2) Quiz page with six Real Exam questions
 *
 * Run: npx tsx scripts/rebuild-units-4-13.ts
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { db } from '../src/db';
import { learningUnits, learningNodes, lessonPages } from '../src/db/schema';
import { asc, eq } from 'drizzle-orm';

type Example = { en: string; th: string; ok: boolean };
type Question = { sentence: string; options: string[]; answerIndex: number; explanation: string };
type TapItem = { prompt: string; choiceA: string; choiceB: string; correct: 0 | 1 };
type CsvQuestion = Question & { topic: string; subtopic: string };

type Copy = {
  title: string;
  intro: string;
  rule: string;
  body: string;
  examples: Example[];
  table: { headers: string[]; rows: string[][] };
  vocab: { columns: string[]; rows: string[][] };
  tip: string;
  fallback: Question[];
  tap: TapItem[];
};

const CSV_PATH = 'C:/Users/IHCK/Downloads/focus on form/Focus on form - แยกชุดย่อย (grammarSubTopic).csv';
const TARGET_ORDER_MIN = 3;
const TARGET_ORDER_MAX = 12;
const PROTECTED_TITLES = new Set(['Subject-Verb Agreement', 'Auxiliaries & Verb Forms']);
const TAP_TITLE = '✨ Tap & Select — ฝึกแยกประโยคให้ถูก';

const UNIT_TOPICS: Record<string, string> = {
  'Questions & Polite Requests': 'ประโยคคำถามและการขอร้องสุภาพ (Questions & Polite Requests)',
  'Quantifiers & Pronouns': 'คำบอกปริมาณและสรรพนาม (Quantifiers & Pronouns)',
  'Prepositions & Phrasal Verbs': 'บุพบทและวลีบุพบท (Prepositions & Phrasal Verbs)',
  'Comparatives & Superlatives': 'การเปรียบเทียบ (Comparatives & Superlatives)',
  'Infinitive / Gerund / Verb Pattern': 'To Infinitive / Gerund / Verb Pattern',
  'Collocations & Conjunctions': 'คำศัพท์คู่สำนวนและคำเชื่อม (Collocations & Conjunctions)',
  'Relative Clauses': 'อนุประโยคขยายความ (Relative Clauses)',
  'Conditionals & Passive Voice': 'ประโยคเงื่อนไขและการถูกกระทำ (Conditionals & Passive Voice)',
  'Adverbs of Frequency': 'คำวิเศษณ์บอกความถี่ (Adverbs of Frequency)',
  'Subjunctive Mood': 'Subjunctive Mood',
};

function q(sentence: string, options: string[], answerIndex: number, explanation: string): Question {
  return { sentence, options, answerIndex, explanation };
}

function pair(correct: string, wrong: string): TapItem {
  return { prompt: 'ข้อไหนถูกต้อง', choiceA: correct, choiceB: wrong, correct: 0 };
}

function fallbackFor(subtopic: string): Question[] {
  const s = subtopic.toLowerCase();
  if (s.includes('wh-questions')) return [
    q('____ did you get home?', ['How', 'What', 'Who', 'Whose'], 0, 'ถามวิธีการใช้ How'),
    q('____ do you live?', ['Where', 'When', 'Why', 'Whose'], 0, 'ถามสถานที่ใช้ Where'),
    q('____ did you arrive?', ['When', 'Who', 'What', 'Which'], 0, 'ถามเวลาใช้ When'),
    q('____ is your teacher?', ['Who', 'Where', 'How', 'Why'], 0, 'ถามคนใช้ Who'),
    q('____ are you late?', ['Why', 'What', 'Who', 'Which'], 0, 'ถามเหตุผลใช้ Why'),
    q('____ book is yours?', ['Whose', 'Who', 'Where', 'When'], 0, 'ถามเจ้าของใช้ Whose'),
  ];
  if (s.includes('polite requests')) return [
    q('____ I speak to Mr Brown, please?', ['Could', 'Did', 'Has', 'Was'], 0, 'Could I เป็นคำขอสุภาพ'),
    q('____ you like some coffee?', ['Would', 'Did', 'Have', 'Are'], 0, 'Would you like ใช้เสนออย่างสุภาพ'),
    q('Could you ____ the door?', ['open', 'opens', 'opened', 'opening'], 0, 'หลัง Could ใช้กริยารูปเดิม'),
    q('Would you like ____ tea?', ['some', 'any', 'many', 'few'], 0, 'การเสนอใช้ some ได้'),
    q('May I ____ your pen?', ['borrow', 'borrows', 'borrowed', 'borrowing'], 0, 'หลัง May I ใช้กริยารูปเดิม'),
    q('Could I have ____ water, please?', ['some', 'any', 'many', 'few'], 0, 'การขอร้องสุภาพใช้ some ได้'),
  ];
  if (s.includes('question tags')) return [
    q('You play tennis, ____ you?', ['don’t', 'do', 'aren’t', 'didn’t'], 0, 'ประโยคหลักบอกเล่า จึงใช้ tag ปฏิเสธ'),
    q('She isn’t late, ____ she?', ['is', 'isn’t', 'does', 'did'], 0, 'ประโยคหลักปฏิเสธ จึงใช้ tag บอกเล่า'),
    q('They went home, ____ they?', ['didn’t', 'did', 'do', 'aren’t'], 0, 'went เป็นอดีต ใช้ didn’t ใน tag'),
    q('He works here, ____ he?', ['doesn’t', 'does', 'isn’t', 'didn’t'], 0, 'works ใช้ does ใน tag'),
    q('We can leave, ____ we?', ['can’t', 'can', 'don’t', 'aren’t'], 0, 'can บอกเล่า ใช้ can’t'),
    q('You don’t like it, ____ you?', ['do', 'don’t', 'are', 'did'], 0, 'ประโยคปฏิเสธ ใช้ do บอกเล่า'),
  ];
  if (s.includes('it (')) return [
    q('How far is ____ to the station?', ['it', 'there', 'that', 'this'], 0, 'โครงสร้าง How far is it...?'),
    q('I like this phone. ____ is very fast.', ['It', 'They', 'He', 'There'], 0, 'phone เป็นสิ่งของเอกพจน์ ใช้ It'),
    q('What time is ____?', ['it', 'there', 'they', 'he'], 0, 'ถามเวลาใช้ What time is it?'),
    q('Is ____ raining outside?', ['it', 'there', 'they', 'this'], 0, 'สภาพอากาศใช้ it'),
    q('How long does ____ take?', ['it', 'they', 'he', 'there'], 0, 'อ้างถึงกิจกรรมหรือการเดินทางใช้ it'),
    q('I found a book. ____ is on the desk.', ['It', 'They', 'He', 'There'], 0, 'book เป็นสิ่งของเอกพจน์ ใช้ It'),
  ];
  if (s.includes('some / any')) return [
    q('Would you like ____ coffee?', ['some', 'any', 'many', 'few'], 0, 'ข้อเสนอสุภาพมักใช้ some'),
    q('I don’t have ____ money.', ['any', 'some', 'many', 'few'], 0, 'ประโยคปฏิเสธใช้ any'),
    q('Are there ____ apples?', ['any', 'some', 'much', 'little'], 0, 'คำถามทั่วไปใช้ any'),
    q('There are ____ books on the desk.', ['some', 'any', 'much', 'little'], 0, 'ประโยคบอกเล่าใช้ some'),
    q('Do you have ____ questions?', ['any', 'some', 'much', 'little'], 0, 'คำถามใช้ any'),
    q('I need ____ help, please.', ['some', 'any', 'many', 'few'], 0, 'การขอความช่วยเหลือใช้ some'),
  ];
  if (s.includes('possessive adjectives')) return [
    q('John has a car. ____ car is blue.', ['His', 'Her', 'Their', 'Our'], 0, 'John เป็นผู้ชาย ใช้ his'),
    q('Mary loves ____ new job.', ['her', 'his', 'their', 'our'], 0, 'Mary ใช้ her'),
    q('The children are with ____ parents.', ['their', 'his', 'her', 'its'], 0, 'children หลายคน ใช้ their'),
    q('I have a dog. ____ name is Max.', ['Its', 'His', 'Their', 'Our'], 0, 'สัตว์หนึ่งตัวใช้ its'),
    q('We brought ____ books.', ['our', 'his', 'her', 'its'], 0, 'we ใช้ our'),
    q('You should take ____ umbrella.', ['your', 'his', 'their', 'our'], 0, 'you ใช้ your'),
  ];
  if (s.includes('possessive pronouns')) return [
    q('This phone is ____.', ['mine', 'my', 'me', 'I'], 0, 'mine ใช้แทนของฉันโดยไม่มีคำนามตามหลัง'),
    q('That car is ____.', ['hers', 'her', 'she', 'herself'], 0, 'hers เป็น possessive pronoun'),
    q('The blue bags are ____.', ['theirs', 'their', 'them', 'they'], 0, 'theirs ใช้แทนของพวกเขา'),
    q('Is this pen ____?', ['yours', 'your', 'you', 'yourself'], 0, 'yours ใช้แทนของคุณ'),
    q('This seat is ____.', ['ours', 'our', 'we', 'us'], 0, 'ours ใช้แทนของพวกเรา'),
    q('The decision was ____.', ['his', 'him', 'he', 'himself'], 0, 'his ใช้แทนของเขาได้'),
  ];
  if (s.includes('reflexive')) return [
    q('I made this cake ____.', ['myself', 'me', 'mine', 'my'], 0, 'ทำด้วยตัวเองใช้ myself'),
    q('She taught ____ English.', ['herself', 'her', 'hers', 'she'], 0, 'she ทำเองใช้ herself'),
    q('They cleaned the room ____.', ['themselves', 'them', 'their', 'they'], 0, 'they ทำเองใช้ themselves'),
    q('He hurt ____ playing football.', ['himself', 'him', 'his', 'he'], 0, 'he ใช้ himself'),
    q('We did it ____.', ['ourselves', 'our', 'us', 'we'], 0, 'we ใช้ ourselves'),
    q('Did you do it ____?', ['yourself', 'you', 'your', 'yours'], 0, 'you คนเดียวใช้ yourself'),
  ];
  if (s.includes('much / many')) return [
    q('How ____ money do you need?', ['much', 'many', 'few', 'several'], 0, 'money นับไม่ได้ ใช้ much'),
    q('How ____ books are there?', ['many', 'much', 'little', 'any'], 0, 'books นับได้หลายเล่ม ใช้ many'),
    q('There isn’t ____ time.', ['much', 'many', 'few', 'several'], 0, 'time นับไม่ได้ ใช้ much'),
    q('She has ____ friends.', ['many', 'much', 'little', 'any'], 0, 'friends นับได้ ใช้ many'),
    q('I don’t eat ____ sugar.', ['much', 'many', 'few', 'several'], 0, 'sugar นับไม่ได้ ใช้ much'),
    q('There are ____ people here.', ['many', 'much', 'little', 'any'], 0, 'people หลายคน ใช้ many'),
  ];
  if (s.includes('enough')) return [
    q('We have ____ time to finish.', ['enough', 'many', 'few', 'several'], 0, 'enough แปลว่าเพียงพอ'),
    q('The room is big ____ for everyone.', ['enough', 'many', 'much', 'few'], 0, 'adjective + enough'),
    q('I am not strong ____ to lift it.', ['enough', 'many', 'much', 'few'], 0, 'strong enough'),
    q('Do you have ____ money?', ['enough', 'many', 'few', 'several'], 0, 'enough money'),
    q('She didn’t sleep ____.', ['enough', 'many', 'few', 'several'], 0, 'sleep enough'),
    q('There are ____ chairs for all of us.', ['enough', 'much', 'little', 'any'], 0, 'enough chairs'),
  ];
  if (s.includes('such')) return [
    q('It was ____ an exciting game.', ['such', 'so', 'very', 'too'], 0, 'such + a/an + adjective + noun'),
    q('She is ____ a kind person.', ['such', 'so', 'very', 'too'], 0, 'such a kind person'),
    q('They had ____ a good time.', ['such', 'so', 'very', 'too'], 0, 'such a good time'),
    q('It was such ____ beautiful day.', ['a', 'an', 'the', 'some'], 0, 'beautiful ขึ้นต้นเสียงพยัญชนะ ใช้ a'),
    q('He is such ____ honest man.', ['an', 'a', 'the', 'some'], 0, 'honest ขึ้นต้นเสียงสระ ใช้ an'),
    q('That was ____ a surprise!', ['such', 'so', 'very', 'too'], 0, 'such a surprise'),
  ];
  if (s.includes('articles')) return [
    q('She is ____ teacher.', ['a', 'an', 'the', 'some'], 0, 'teacher เป็นคำนามเอกพจน์ทั่วไป ใช้ a'),
    q('He ate ____ apple.', ['an', 'a', 'the', 'some'], 0, 'apple ขึ้นต้นเสียงสระ ใช้ an'),
    q('Please close ____ door.', ['the', 'a', 'an', 'some'], 0, 'ประตูที่รู้ว่าพูดถึงบานไหนใช้ the'),
    q('I saw ____ dog in the park.', ['a', 'an', 'the', 'some'], 0, 'พูดถึงสุนัขหนึ่งตัวครั้งแรกใช้ a'),
    q('She bought ____ umbrella.', ['an', 'a', 'the', 'some'], 0, 'umbrella ขึ้นต้นเสียงสระ ใช้ an'),
    q('____ sun is very bright.', ['The', 'A', 'An', 'Some'], 0, 'สิ่งที่มีหนึ่งเดียวใช้ the'),
  ];
  if (s.includes('there is')) return [
    q('____ a book on the desk.', ['There is', 'There are', 'It is', 'They are'], 0, 'book เอกพจน์ใช้ There is'),
    q('____ many people here.', ['There are', 'There is', 'It has', 'They is'], 0, 'people พหูพจน์ใช้ There are'),
    q('Is ____ any milk?', ['there', 'it', 'they', 'that'], 0, 'ถามการมีอยู่ใช้ Is there'),
    q('Are ____ any shops nearby?', ['there', 'it', 'they', 'that'], 0, 'ถามพหูพจน์ใช้ Are there'),
    q('There ____ two chairs in the room.', ['are', 'is', 'be', 'has'], 0, 'two chairs เป็นพหูพจน์'),
    q('There ____ some water in the bottle.', ['is', 'are', 'be', 'have'], 0, 'water นับไม่ได้ใช้ is'),
  ];
  if (s.includes('prepositions of place') || s.includes('สถานที่')) return [
    q('John lives ____ the United States.', ['in', 'at', 'on', 'to'], 0, 'ประเทศใช้ in'),
    q('The family goes ____ the park.', ['to', 'at', 'in', 'on'], 0, 'go to + สถานที่'),
    q('The keys are ____ the table.', ['on', 'in', 'at', 'to'], 0, 'พื้นผิวใช้ on'),
    q('She is waiting ____ the bus stop.', ['at', 'in', 'on', 'to'], 0, 'จุดสถานที่ใช้ at'),
    q('The children are ____ the classroom.', ['in', 'on', 'at', 'to'], 0, 'ด้านในใช้ in'),
    q('Put the book ____ the desk.', ['on', 'to', 'at', 'in'], 0, 'บนโต๊ะใช้ on'),
  ];
  if (s.includes('prepositions of time') || s.includes('เวลา')) return [
    q('I leave home ____ 7 a.m.', ['at', 'in', 'on', 'for'], 0, 'เวลาที่ระบุใช้ at'),
    q('She has lived here ____ six years.', ['for', 'since', 'at', 'on'], 0, 'ช่วงเวลาใช้ for'),
    q('We met ____ Monday.', ['on', 'at', 'in', 'for'], 0, 'วันใช้ on'),
    q('He was born ____ 2001.', ['in', 'at', 'on', 'for'], 0, 'ปีใช้ in'),
    q('The shop opens ____ the morning.', ['in', 'at', 'on', 'for'], 0, 'ช่วงของวันใช้ in'),
    q('I waited ____ ten minutes.', ['for', 'at', 'on', 'in'], 0, 'ระยะเวลาใช้ for'),
  ];
  if (s.includes('look forward') || s.includes('worried') || s.includes('a lot of')) return [
    q('I look forward ____ meeting you.', ['to', 'for', 'at', 'in'], 0, 'look forward to + noun หรือ V-ing'),
    q('She is worried ____ her exam.', ['about', 'to', 'at', 'in'], 0, 'worried about'),
    q('We have a lot ____ work.', ['of', 'to', 'at', 'in'], 0, 'a lot of + noun'),
    q('He is good ____ drawing.', ['at', 'to', 'in', 'on'], 0, 'good at'),
    q('They are interested ____ music.', ['in', 'at', 'to', 'on'], 0, 'interested in'),
    q('I am afraid ____ dogs.', ['of', 'to', 'at', 'in'], 0, 'afraid of'),
  ];
  if (s.includes('phrasal')) return [
    q('Let’s eat ____ tonight.', ['out', 'in', 'on', 'at'], 0, 'eat out = กินข้าวนอกบ้าน'),
    q('Please turn ____ the light.', ['on', 'in', 'at', 'to'], 0, 'turn on = เปิด'),
    q('I am looking ____ my keys.', ['for', 'at', 'on', 'to'], 0, 'look for = ค้นหา'),
    q('She gets ____ her problems quickly.', ['over', 'on', 'at', 'to'], 0, 'get over = ผ่านพ้น'),
    q('Please hang ____ a minute.', ['on', 'in', 'at', 'to'], 0, 'hang on = รอสักครู่'),
    q('He gave ____ smoking.', ['up', 'out', 'in', 'on'], 0, 'give up = เลิก'),
  ];
  if (s.includes('comparative') || s.includes('ขั้นกว่า')) return [
    q('Sam is ____ than his brother.', ['taller', 'tallest', 'more tall', 'tall'], 0, 'คำสั้นใช้ -er'),
    q('This book is ____ interesting than that one.', ['more', 'most', 'much', 'many'], 0, 'คำหลายพยางค์ใช้ more'),
    q('Today is ____ than yesterday.', ['better', 'best', 'good', 'well'], 0, 'good เปลี่ยนเป็น better'),
    q('The train is ____ than the bus.', ['faster', 'fastest', 'more fast', 'fast'], 0, 'fast เปลี่ยนเป็น faster'),
    q('This phone is much ____.', ['cheaper', 'cheapest', 'more cheap', 'cheap'], 0, 'much + comparative'),
    q('My new job is ____ stressful.', ['less', 'least', 'little', 'few'], 0, 'less + adjective'),
  ];
  if (s.includes('superlative') || s.includes('ขั้นสูงสุด')) return [
    q('She is the ____ student in class.', ['best', 'better', 'good', 'well'], 0, 'ระดับสูงสุดของ good คือ best'),
    q('This is the ____ room in the house.', ['smallest', 'smaller', 'more small', 'small'], 0, 'small เปลี่ยนเป็น smallest'),
    q('It was one of the ____ films I have seen.', ['worst', 'worse', 'bad', 'badly'], 0, 'one of the + superlative'),
    q('That was the ____ day of my trip.', ['happiest', 'happier', 'more happy', 'happy'], 0, 'happy เปลี่ยน y เป็น iest'),
    q('This is the ____ expensive option.', ['most', 'more', 'much', 'many'], 0, 'คำหลายพยางค์ใช้ most'),
    q('Who runs the ____?', ['fastest', 'faster', 'fast', 'more fast'], 0, 'ระดับสูงสุดใช้ fastest'),
  ];
  if (s.includes('to + infinitive')) return [
    q('I went to the store ____ buy milk.', ['to', 'for', 'at', 'by'], 0, 'to + V.1 บอกจุดประสงค์'),
    q('She wants ____ learn English.', ['to', 'for', 'at', 'by'], 0, 'want + to + V.1'),
    q('We decided ____ leave early.', ['to', 'for', 'at', 'in'], 0, 'decide + to + V.1'),
    q('He stopped ____ talk to his friend.', ['to', 'for', 'at', 'by'], 0, 'stop to talk = หยุดเพื่อไปคุย'),
    q('I have something ____ do.', ['to', 'for', 'at', 'on'], 0, 'something to do'),
    q('The best way is ____ find the answer.', ['to', 'for', 'at', 'by'], 0, 'is to + V.1'),
  ];
  if (s.includes('bare infinitive')) return [
    q('My mother let me ____ out.', ['go', 'to go', 'going', 'went'], 0, 'let + someone + V.1'),
    q('I can’t help but ____.', ['laugh', 'to laugh', 'laughing', 'laughed'], 0, 'can’t help but + V.1'),
    q('I saw him ____ the room.', ['leave', 'to leave', 'leaving', 'left'], 0, 'see someone + V.1'),
    q('Please let her ____.', ['speak', 'to speak', 'speaking', 'spoke'], 0, 'let + someone + V.1'),
    q('We watched the dog ____.', ['run', 'to run', 'running', 'ran'], 0, 'watch + object + V.1'),
    q('She made me ____ again.', ['try', 'to try', 'trying', 'tried'], 0, 'make + object + V.1'),
  ];
  if (s.includes('gerund')) return [
    q('She enjoys ____ books.', ['reading', 'read', 'to read', 'reads'], 0, 'enjoy + V-ing'),
    q('He keeps ____ at his watch.', ['looking', 'look', 'to look', 'looked'], 0, 'keep + V-ing'),
    q('They stopped ____ when the bell rang.', ['talking', 'talk', 'to talk', 'talked'], 0, 'stop doing = หยุดการกระทำ'),
    q('She is good at ____ pictures.', ['drawing', 'draw', 'to draw', 'draws'], 0, 'หลังบุพบทใช้ V-ing'),
    q('He finished ____ the report.', ['writing', 'write', 'to write', 'writes'], 0, 'finish + V-ing'),
    q('I avoid ____ late.', ['arriving', 'arrive', 'to arrive', 'arrived'], 0, 'avoid + V-ing'),
  ];
  if (s.includes('get used')) return [
    q('I am getting used ____ this schedule.', ['to', 'for', 'at', 'in'], 0, 'get used to + noun/V-ing'),
    q('She is used ____ early.', ['to waking', 'to wake', 'waking to', 'wake'], 0, 'be used to + V-ing'),
    q('They got used ____ in a new city.', ['to living', 'to live', 'living to', 'live'], 0, 'get used to + V-ing'),
    q('He is not used ____ spicy food.', ['to eating', 'to eat', 'eating to', 'eat'], 0, 'be used to + V-ing'),
    q('You will get used ____ here.', ['to working', 'to work', 'working to', 'work'], 0, 'get used to + V-ing'),
    q('I am used to ____ alone.', ['working', 'work', 'to work', 'worked'], 0, 'used to ในความหมายคุ้นเคยตามด้วย V-ing'),
  ];
  if (s.includes('and / or')) return [
    q('Sally ____ Billy are children.', ['and', 'or', 'but', 'because'], 0, 'and แปลว่าและ'),
    q('Coffee ____ tea?', ['or', 'and', 'but', 'because'], 0, 'or ใช้ให้เลือก'),
    q('I like tea ____ coffee.', ['and', 'or', 'because', 'so'], 0, 'and เชื่อมสิ่งที่ชอบทั้งคู่'),
    q('Do you want milk ____ sugar?', ['or', 'and', 'because', 'so'], 0, 'or ใช้ถามตัวเลือก'),
    q('Tom ____ Anna went home.', ['and', 'or', 'but', 'if'], 0, 'and เชื่อมคนสองคน'),
    q('You can call ____ email me.', ['or', 'and', 'because', 'so'], 0, 'or ให้เลือกทางใดทางหนึ่ง'),
  ];
  if (s.includes('collocation')) return [
    q('We had a good ____.', ['time', 'make', 'do', 'take'], 0, 'have a good time เป็น collocation'),
    q('Please ____ a message.', ['leave', 'make', 'do', 'take'], 0, 'leave a message'),
    q('Have a good ____!', ['weekend', 'make', 'do', 'take'], 0, 'have a good weekend'),
    q('She ____ a decision.', ['made', 'did', 'took', 'put'], 0, 'make a decision'),
    q('Please ____ a seat.', ['take', 'make', 'do', 'leave'], 0, 'take a seat'),
    q('I ____ a photo.', ['took', 'made', 'did', 'left'], 0, 'take a photo ในอดีตคือ took'),
  ];
  if (s.includes('borrow/lend') || s.includes('บริบท')) return [
    q('Can I ____ your pen?', ['borrow', 'lend', 'give', 'leave'], 0, 'borrow = ขอยืม'),
    q('Can you ____ me your pen?', ['lend', 'borrow', 'take', 'find'], 0, 'lend = ให้ยืม'),
    q('She is quiet and not very outgoing. She is ____.', ['shy', 'silly', 'kind', 'calm'], 0, 'shy = ขี้อาย'),
    q('I can’t ____ how good this is!', ['get over', 'get in', 'get at', 'get to'], 0, 'can’t get over = ทึ่งมาก'),
    q('Please ____ me a message.', ['leave', 'borrow', 'lend', 'make'], 0, 'leave a message'),
    q('He is very ____; he always helps people.', ['kind', 'shy', 'silly', 'late'], 0, 'kind = ใจดี'),
  ];
  if (s.includes('quite / really')) return [
    q('The film was ____ good.', ['quite', 'many', 'few', 'any'], 0, 'quite ใช้ขยาย adjective'),
    q('I am ____ tired today.', ['really', 'many', 'few', 'any'], 0, 'really ใช้ขยาย tired'),
    q('She is ____ happy with the result.', ['quite', 'much', 'few', 'many'], 0, 'quite happy'),
    q('That is ____ interesting.', ['really', 'many', 'few', 'any'], 0, 'really interesting'),
    q('He was ____ surprised.', ['quite', 'much', 'many', 'few'], 0, 'quite surprised'),
    q('This book is ____ useful.', ['really', 'many', 'few', 'any'], 0, 'really useful'),
  ];
  if (s.includes('here you are')) return [
    q('Waiter: Here ____ are.', ['you', 'your', 'yours', 'they'], 0, 'สำนวน Here you are ใช้ตอนส่งของให้'),
    q('Here you are. — ____.', ['Thank you', 'Please', 'Sorry', 'Hello'], 0, 'ตอบรับเมื่อได้รับของคือ Thank you'),
    q('Can I borrow a pen? — ____.', ['Sure', 'Never', 'Yesterday', 'Because'], 0, 'Sure ใช้ตอบรับคำขอ'),
    q('Would you like some tea? — Yes, ____.', ['please', 'thanks you', 'do', 'am'], 0, 'Yes, please ตอบรับข้อเสนอ'),
    q('Sorry, I’m late. — ____.', ['That’s OK', 'Here you are', 'How many', 'Never'], 0, 'That’s OK ใช้ตอบปลอบใจ'),
    q('Thanks for your help. — You’re ____.', ['welcome', 'sure', 'right', 'fine'], 0, 'You’re welcome'),
  ];
  if (s.includes('get over')) return [
    q('I can’t get ____ how beautiful it is.', ['over', 'on', 'in', 'at'], 0, 'get over = หยุดรู้สึกทึ่ง/ผ่านพ้น'),
    q('It took weeks to get ____ the illness.', ['over', 'on', 'at', 'to'], 0, 'get over an illness'),
    q('She cannot get ____ the surprise.', ['over', 'in', 'at', 'to'], 0, 'get over the surprise'),
    q('He got ____ his fear.', ['over', 'on', 'at', 'to'], 0, 'get over a fear'),
    q('I’m trying to get ____ the breakup.', ['over', 'in', 'at', 'to'], 0, 'get over = ฟื้นจาก'),
    q('They finally got ____ the problem.', ['over', 'on', 'at', 'to'], 0, 'get over a problem'),
  ];
  if (s.includes('verb + object')) return [
    q('The teacher told us ____ quietly.', ['to work', 'work', 'working', 'worked'], 0, 'tell + someone + to V.1'),
    q('She asked me ____ early.', ['to come', 'come', 'coming', 'came'], 0, 'ask + someone + to V.1'),
    q('He wants me ____ him.', ['to help', 'help', 'helping', 'helped'], 0, 'want + someone + to V.1'),
    q('They told him ____ the truth.', ['to tell', 'tell', 'telling', 'told'], 0, 'told + someone + to V.1'),
    q('I asked her ____ the door.', ['to close', 'close', 'closing', 'closed'], 0, 'asked + someone + to V.1'),
    q('The doctor advised me ____ more water.', ['to drink', 'drink', 'drinking', 'drank'], 0, 'advise + someone + to V.1'),
  ];
  if (s.includes('who / that')) return [
    q('The woman ____ won the award is my teacher.', ['who', 'which', 'whose', 'where'], 0, 'who ใช้แทนคน'),
    q('The book ____ I bought is useful.', ['that', 'who', 'whose', 'where'], 0, 'that ใช้ขยายสิ่งของ'),
    q('The man ____ lives next door is a doctor.', ['who', 'which', 'whose', 'what'], 0, 'who ใช้กับคน'),
    q('This is the phone ____ I lost.', ['that', 'who', 'whose', 'where'], 0, 'that ใช้กับสิ่งของ'),
    q('The girl ____ helped me was kind.', ['who', 'which', 'whose', 'what'], 0, 'who ใช้เป็นประธานแทนคน'),
    q('I like the song ____ you sent.', ['that', 'who', 'whose', 'where'], 0, 'that ใช้ขยาย song'),
  ];
  if (s.includes('whose')) return [
    q('The man ____ car is blue lives next door.', ['whose', 'who', 'which', 'what'], 0, 'whose แสดงความเป็นเจ้าของ'),
    q('The girl ____ mother is a doctor is my friend.', ['whose', 'who', 'which', 'where'], 0, 'whose + noun'),
    q('Do you know the boy ____ bike was stolen?', ['whose', 'who', 'which', 'what'], 0, 'whose bike = จักรยานของเขา'),
    q('That is the woman ____ son won.', ['whose', 'who', 'which', 'where'], 0, 'whose ใช้บอกความเป็นเจ้าของ'),
    q('I met a writer ____ books are famous.', ['whose', 'who', 'which', 'what'], 0, 'whose books'),
    q('The house ____ roof is red is old.', ['whose', 'who', 'which', 'where'], 0, 'whose roof'),
  ];
  if (s.includes('what (=')) return [
    q('She explained ____ she wanted.', ['what', 'who', 'whose', 'where'], 0, 'what = สิ่งที่'),
    q('I know ____ you mean.', ['what', 'who', 'whose', 'where'], 0, 'what you mean = สิ่งที่คุณหมายถึง'),
    q('Tell me ____ happened.', ['what', 'who', 'whose', 'where'], 0, 'what happened'),
    q('This is ____ I need.', ['what', 'who', 'whose', 'where'], 0, 'what I need'),
    q('He showed us ____ he bought.', ['what', 'who', 'whose', 'where'], 0, 'what he bought'),
    q('Do you remember ____ she said?', ['what', 'who', 'whose', 'where'], 0, 'what she said'),
  ];
  if (s.includes('passive')) return [
    q('The window ____ broken yesterday.', ['was', 'were', 'is', 'be'], 0, 'window เอกพจน์ใน passive อดีตใช้ was'),
    q('The invitations ____ sent yesterday.', ['were', 'was', 'is', 'be'], 0, 'invitations พหูพจน์ใช้ were'),
    q('English ____ spoken in many countries.', ['is', 'are', 'were', 'be'], 0, 'English เอกพจน์ใช้ is'),
    q('The cake ____ made by Anna.', ['was', 'were', 'are', 'be'], 0, 'cake เอกพจน์ใช้ was'),
    q('The letters ____ delivered this morning.', ['were', 'was', 'is', 'be'], 0, 'letters พหูพจน์ใช้ were'),
    q('The car ____ repaired yesterday.', ['was', 'were', 'are', 'be'], 0, 'car เอกพจน์ใช้ was'),
  ];
  if (s.includes('conditional')) return [
    q('____ this does not work, try another way.', ['If', 'Because', 'Although', 'When'], 0, 'If ใช้บอกเงื่อนไข'),
    q('If I ____ more time, I would help.', ['had', 'have', 'will have', 'would have'], 0, 'Type 2 ใช้ past simple ใน if clause'),
    q('I will call you if I ____ home early.', ['get', 'got', 'will get', 'getting'], 0, 'หลัง if ใช้ present simple'),
    q('If it rains, we ____ stay home.', ['will', 'would', 'did', 'were'], 0, 'ผลลัพธ์ใช้ will'),
    q('If she studied, she ____ pass.', ['would', 'will', 'is', 'has'], 0, 'if + past ใช้ would'),
    q('You can go if you ____ your work.', ['finish', 'finished', 'will finish', 'finishing'], 0, 'หลัง if ใช้ finish'),
  ];
  if (s.includes('frequency')) return [
    q('I ____ travel by bus.', ['often', 'yesterday', 'tomorrow', 'now'], 0, 'often บอกความถี่'),
    q('She comes once a year, so she ____ visits us.', ['rarely', 'always', 'often', 'usually'], 0, 'once a year = rarely'),
    q('How ____ do you exercise?', ['often', 'much', 'many', 'long'], 0, 'How often ใช้ถามความถี่'),
    q('He is ____ late for work.', ['never', 'tomorrow', 'last', 'ago'], 0, 'never บอกว่าไม่เคย'),
    q('We ____ eat out on Fridays.', ['usually', 'yesterday', 'already', 'now'], 0, 'usually บอกกิจวัตร'),
    q('They ____ watch TV after dinner.', ['sometimes', 'last', 'next', 'ago'], 0, 'sometimes บอกความถี่'),
  ];
  if (s.includes('subjunctive')) return [
    q('The manager insists that he ____.', ['be', 'is', 'was', 'being'], 0, 'insist that + V.1'),
    q('She recommended that we ____ early.', ['leave', 'leaves', 'left', 'leaving'], 0, 'recommend that + V.1'),
    q('They demanded that the report ____ ready.', ['be', 'is', 'was', 'being'], 0, 'หลัง that ใช้ be รูปเดิม'),
    q('I suggest that he ____ more carefully.', ['work', 'works', 'worked', 'working'], 0, 'suggest that + V.1'),
    q('It is important that she ____ informed.', ['be', 'is', 'was', 'being'], 0, 'โครงสร้าง subjunctive ใช้ be'),
    q('The teacher insisted that everyone ____ quiet.', ['be', 'is', 'was', 'being'], 0, 'insist that + be'),
  ];
  return [
    q(`${subtopic}: เลือกคำตอบที่ถูกต้อง`, ['ถูกต้อง', 'ผิด', 'อาจจะ', 'ไม่แน่ใจ'], 0, 'เลือกตัวเลือกที่ตรงกับกฎของหัวข้อนี้'),
    q(`${subtopic}: ข้อไหนใช้ได้`, ['ประโยค A', 'ประโยค B', 'ทั้งคู่ผิด', 'ไม่มีคำตอบ'], 0, 'ประโยค A เป็นรูปแบบมาตรฐาน'),
    q('เลือกคำตอบที่ถูกต้องสำหรับบทนี้', ['ตัวเลือก A', 'ตัวเลือก B', 'ตัวเลือก C', 'ตัวเลือก D'], 0, 'ทบทวนกฎหลักของบทนี้'),
    q('ก่อนทำโจทย์ควรทำอะไร', ['อ่าน Golden Rule', 'ข้ามทุกอย่าง', 'เดาสุ่ม', 'ไม่ต้องดูประโยค'], 0, 'อ่านกฎสั้นๆ ก่อนจะช่วยให้ทำโจทย์ง่ายขึ้น'),
    q('ข้อไหนช่วยให้เข้าใจ Grammar', ['ดูประธานและกริยา', 'ดูแค่คำสุดท้าย', 'เดาจากความยาว', 'ไม่ต้องอ่าน'], 0, 'ดูโครงสร้างประโยคเป็นหลัก'),
    q('เมื่อยังไม่แน่ใจควรทำอย่างไร', ['อ่านคำอธิบายอีกครั้ง', 'กดข้ามทันที', 'เลือกทุกข้อ', 'ปิดบทเรียน'], 0, 'ลองอ่านเหตุผลแล้วทำใหม่ได้'),
  ];
}

function copyFor(subtopic: string): Copy {
  const s = subtopic.toLowerCase();
  const base = fallbackFor(subtopic);
  const first = base[0];
  const title = subtopic
    .replace(' (', ' — ')
    .replace(')', '')
    .replace('คำบอกความถี่', 'คำบอกความถี่');
  let rule = '“อ่านคำที่อยู่รอบช่องว่าง แล้วเลือกคำที่เข้าคู่กัน” จำโครงสร้างหลักไว้ก่อน แล้วค่อยดูบริบทนะ';
  let body = `หัวข้อนี้คือ ${subtopic} แบบที่เจอในชีวิตจริง ไม่ต้องจำยาว ให้จับคู่คำสำคัญกับรูปประโยค แล้วลองทำโจทย์ทีละข้อ`;
  let examples: Example[] = [
    { en: first.sentence.replace('____', first.options[first.answerIndex]), th: 'ตัวอย่างที่ใช้กฎของหัวข้อนี้', ok: true },
    { en: first.sentence.replace('____', first.options[(first.answerIndex + 1) % first.options.length]), th: 'ตัวอย่างนี้ควรตรวจสอบกฎอีกครั้ง', ok: false },
  ];
  let table = { headers: ['จำอะไร', 'รูปแบบ', 'ตัวอย่าง'], rows: [['คำสำคัญ', subtopic, examples[0].en], ['เช็กก่อนตอบ', 'ดูบริบท', 'อ่านทั้งประโยค'], ['ถ้าผิด', 'ดูเหตุผล', 'ลองใหม่ได้เลย']] };
  let vocab = { columns: ['คำสำคัญ', 'ความหมาย', 'ตัวอย่าง'], rows: [[subtopic, 'กฎของบทนี้', examples[0].en], ['จำง่ายๆ', 'ดูโครงสร้าง', 'ลองทำโจทย์']] };
  let tip = 'ค่อยๆ ดูคำใบ้ในประโยค ไม่ต้องรีบเดานะ';

  if (s.includes('สรรพนาม it')) {
    rule = '“it ใช้แทนสิ่งของ เวลา หรือสภาพอากาศที่กำลังพูดถึง” และใช้ใน How far is it...?';
    body = 'เห็น it ให้ดูบริบทว่าเรากำลังพูดถึงอะไร ไม่ได้แปลว่ามันแบบเดียวเสมอไปนะ';
    examples = [{ en: 'How far is it to the station?', th: 'ถามระยะทางใช้ it', ok: true }, { en: 'It is raining.', th: 'สภาพอากาศใช้ it', ok: true }, { en: 'How far is there to the station?', th: 'รูปที่ใช้คือ How far is it?', ok: false }];
    table = { headers: ['ใช้ it เมื่อ', 'รูปแบบ', 'ตัวอย่าง'], rows: [['สิ่งของ', 'It + be', 'It is my phone.'], ['ระยะทาง', 'How far is it...?', 'How far is it to school?'], ['อากาศ/เวลา', 'It is...', 'It is raining.']] };
  } else if (s.includes('some / any')) {
    rule = '“some ใช้บอกว่ามีหรือใช้เสนอ · any ใช้ถามหรือบอกว่าไม่มี”';
    body = 'มีของอยู่ใช้ some ถามว่ามีไหมหรือบอกว่าไม่มีใช้ any จำหลักนี้ก่อน แล้วค่อยดูบริบทนะ';
    examples = [{ en: 'There are some apples.', th: 'บอกเล่าใช้ some', ok: true }, { en: 'I don’t have any money.', th: 'ปฏิเสธใช้ any', ok: true }, { en: 'I don’t have some money.', th: 'ปฏิเสธทั่วไปใช้ any', ok: false }];
    table = { headers: ['คำ', 'ใช้เมื่อ', 'ตัวอย่าง'], rows: [['some', 'บอกเล่า/เสนอ', 'I have some tea.'], ['any', 'คำถาม', 'Do you have any tea?'], ['any', 'ปฏิเสธ', 'I don’t have any tea.']] };
  } else if (s.includes('indefinite pronouns')) {
    rule = '“everyone / someone / nobody เป็นเอกพจน์ แม้ความหมายจะพูดถึงคนหลายคน”';
    body = 'คำกลุ่ม -one, -body และ -thing ไม่ได้บอกว่าเป็นใครหรืออะไรแบบเฉพาะเจาะจง และส่วนใหญ่ใช้กริยาเอกพจน์';
    examples = [{ en: 'Everyone likes pizza.', th: 'everyone ใช้ likes', ok: true }, { en: 'Nobody knows the answer.', th: 'nobody ใช้ knows', ok: true }, { en: 'Everyone like pizza.', th: 'ผิด — ต้องเป็น likes', ok: false }];
    table = { headers: ['คำ', 'ความหมาย', 'ตัวอย่าง'], rows: [['everyone', 'ทุกคน', 'Everyone is ready.'], ['someone', 'ใครบางคน', 'Someone is calling.'], ['nobody', 'ไม่มีใคร', 'Nobody knows.']] };
  } else if (s.includes('personal pronouns')) {
    rule = '“คนทำใช้ I / he / she / we / they · คนถูกกระทำใช้ me / him / her / us / them”';
    body = 'ให้ถามตัวเองว่าใครเป็นคนทำ ถ้าเป็นคนรับการกระทำหรืออยู่หลังบุพบท ให้เปลี่ยนเป็นรูปกรรม';
    examples = [{ en: 'She called me.', th: 'she เป็นคนโทร, me เป็นคนรับสาย', ok: true }, { en: 'They gave us the keys.', th: 'us เป็นผู้รับกุญแจ', ok: true }, { en: 'Me called she.', th: 'ประธานต้องใช้รูปประธาน เช่น She called me', ok: false }];
    table = { headers: ['หน้าที่', 'คำที่ใช้', 'ตัวอย่าง'], rows: [['ประธาน', 'I / he / she / we / they', 'She called me.'], ['กรรม', 'me / him / her / us / them', 'I helped him.'], ['หลังบุพบท', 'me / him / her / us / them', 'Come with us.']] };
  } else if (s.includes('reflexive')) {
    rule = '“ถ้าคนทำกับคนรับเป็นคนเดียวกัน ใช้ myself / yourself / himself...”';
    body = 'ใช้ reflexive pronoun เมื่ออยากบอกว่าทำกับตัวเอง หรือทำด้วยตัวเอง';
    examples = [{ en: 'I made it myself.', th: 'ฉันทำเอง', ok: true }, { en: 'She taught herself English.', th: 'เธอสอนตัวเอง', ok: true }, { en: 'I made it me.', th: 'ต้องใช้ myself เมื่อหมายถึงทำเอง', ok: false }];
    table = { headers: ['ประธาน', 'คำสะท้อนกลับ', 'ตัวอย่าง'], rows: [['I', 'myself', 'I did it myself.'], ['he / she', 'himself / herself', 'She taught herself.'], ['we / they', 'ourselves / themselves', 'They did it themselves.']] };
  } else if (s.includes('much / many')) {
    rule = '“much ใช้กับคำนามนับไม่ได้ · many ใช้กับคำนามนับได้หลายชิ้น”';
    body = 'money, time และ water นับเป็นชิ้นๆ ไม่ได้ จึงใช้ much ส่วน books, people และ questions ใช้ many';
    examples = [{ en: 'How much money do you need?', th: 'money นับไม่ได้ → much', ok: true }, { en: 'How many books are there?', th: 'books นับได้ → many', ok: true }, { en: 'How many money do you need?', th: 'money ใช้ much', ok: false }];
    table = { headers: ['คำ', 'ใช้กับ', 'ตัวอย่าง'], rows: [['much', 'นับไม่ได้', 'much time'], ['many', 'นับได้', 'many books'], ['How much', 'ถามปริมาณ', 'How much water?']] };
  } else if (s.includes('enough')) {
    rule = '“enough + noun · adjective/adverb + enough” แปลว่าเพียงพอ';
    body = 'ถ้า enough อยู่หน้าคำนาม เช่น enough time แต่ถ้าอยู่หลังคำคุณศัพท์ เช่น strong enough';
    examples = [{ en: 'We have enough time.', th: 'enough อยู่หน้าคำนาม', ok: true }, { en: 'The room is big enough.', th: 'enough อยู่หลัง adjective', ok: true }, { en: 'We have time enough.', th: 'รูปที่ใช้บ่อยคือ enough time', ok: false }];
    table = { headers: ['ตำแหน่ง', 'รูปแบบ', 'ตัวอย่าง'], rows: [['หน้าคำนาม', 'enough + noun', 'enough money'], ['หลัง adjective', 'adjective + enough', 'old enough'], ['หลัง adverb', 'adverb + enough', 'quickly enough']] };
  } else if (s.includes('such')) {
    rule = '“such + a/an + adjective + noun” ใช้เน้นว่ามากหรือสุดๆ';
    body = 'ถ้าหลังช่องว่างมี adjective และคำนาม ให้คิดถึง such a/an เช่น such an exciting game';
    examples = [{ en: 'It was such an exciting game.', th: 'such + an + adjective + noun', ok: true }, { en: 'She is such a kind person.', th: 'such a kind person', ok: true }, { en: 'It was so an exciting game.', th: 'so ไม่วางหน้า a/an แบบนี้', ok: false }];
    table = { headers: ['รูปแบบ', 'ตัวอย่าง', 'จำว่า'], rows: [['such a + adjective + noun', 'such a good day', 'เสียงพยัญชนะ'], ['such an + adjective + noun', 'such an exciting game', 'เสียงสระ'], ['such + plural noun', 'such nice people', 'พหูพจน์']] };
  } else if (s.includes('articles')) {
    rule = '“a/an = หนึ่งสิ่งทั่วไป · the = สิ่งที่รู้ว่าคืออันไหน”';
    body = 'ใช้ a หน้าเสียงพยัญชนะ, an หน้าเสียงสระ และ the เมื่อผู้พูดกับผู้ฟังรู้ว่าพูดถึงสิ่งไหน';
    examples = [{ en: 'I saw a dog.', th: 'พูดถึงครั้งแรกใช้ a', ok: true }, { en: 'The dog was friendly.', th: 'พูดถึงตัวเดิมใช้ the', ok: true }, { en: 'He ate a apple.', th: 'ต้องเป็น an apple', ok: false }];
    table = { headers: ['คำ', 'ใช้เมื่อ', 'ตัวอย่าง'], rows: [['a', 'เสียงพยัญชนะ', 'a book'], ['an', 'เสียงสระ', 'an apple'], ['the', 'สิ่งที่รู้ว่าอันไหน', 'the door']] };
  } else if (s.includes('there is')) {
    rule = '“There is + หนึ่งสิ่ง/นับไม่ได้ · There are + หลายสิ่ง”';
    body = 'มองคำนามหลัง there ถ้ามีหนึ่งสิ่งหรือนับไม่ได้ใช้ is ถ้ามีหลายสิ่งใช้ are';
    examples = [{ en: 'There is a book on the desk.', th: 'book หนึ่งเล่ม → is', ok: true }, { en: 'There are many books here.', th: 'books หลายเล่ม → are', ok: true }, { en: 'There is many books here.', th: 'books พหูพจน์ต้องใช้ are', ok: false }];
    table = { headers: ['คำนามหลัง there', 'ใช้', 'ตัวอย่าง'], rows: [['หนึ่งสิ่ง', 'There is', 'There is a chair.'], ['หลายสิ่ง', 'There are', 'There are two chairs.'], ['นับไม่ได้', 'There is', 'There is some water.']] };
  } else if (s.includes('phrasal')) {
    rule = '“phrasal verb = verb + คำสั้นๆ ที่รวมกันแล้วได้ความหมายใหม่”';
    body = 'คำอย่าง eat out, turn on และ look for ต้องจำเป็นคู่ เพราะเติมคำหลังแล้วความหมายเปลี่ยนไปเลย';
    examples = [{ en: 'Let’s eat out tonight.', th: 'eat out = กินข้าวนอกบ้าน', ok: true }, { en: 'Please turn on the light.', th: 'turn on = เปิด', ok: true }, { en: 'I am looking at my keys. (ถ้าหมายถึงค้นหา)', th: 'ค้นหาต้องใช้ look for', ok: false }];
    table = { headers: ['วลี', 'ความหมาย', 'ตัวอย่าง'], rows: [['eat out', 'กินนอกบ้าน', 'We eat out.'], ['turn on', 'เปิด', 'Turn on the light.'], ['look for', 'ค้นหา', 'Look for my keys.']] };
  } else if (s.includes('look forward') || s.includes('worried') || s.includes('a lot of')) {
    rule = '“คำบางคำต้องจับคู่กับบุพบทเฉพาะ” เช่น look forward to, worried about และ a lot of';
    body = 'กลุ่มนี้ให้จำเป็นชุด อย่าแปลแยกคำอย่างเดียว เพราะบุพบทที่ตามหลังทำให้ความหมายและโครงสร้างถูกต้อง';
    examples = [{ en: 'I look forward to meeting you.', th: 'look forward to + V-ing', ok: true }, { en: 'She is worried about her exam.', th: 'worried about', ok: true }, { en: 'We have a lot work.', th: 'ต้องเป็น a lot of work', ok: false }];
    table = { headers: ['คู่คำ', 'ความหมาย', 'ตัวอย่าง'], rows: [['look forward to', 'ตั้งตารอ', 'look forward to meeting'], ['worried about', 'กังวลเรื่อง', 'worried about the exam'], ['a lot of', 'จำนวนมาก', 'a lot of time']] };
  }
  if (s.includes('it (')) {
    rule = '“it ใช้แทนสิ่งของ เวลา ระยะทาง หรือสภาพอากาศที่กำลังพูดถึง”';
    body = 'เห็น it ให้ดูบริบทว่าเรากำลังพูดถึงอะไร เช่น How far is it...? ใช้ถามระยะทาง และ It is raining ใช้พูดถึงอากาศ';
    examples = [{ en: 'How far is it to the station?', th: 'ถามระยะทางใช้ it', ok: true }, { en: 'It is raining.', th: 'สภาพอากาศใช้ it', ok: true }, { en: 'How far is there to the station?', th: 'รูปที่ใช้คือ How far is it?', ok: false }];
    table = { headers: ['ใช้ it เมื่อ', 'รูปแบบ', 'ตัวอย่าง'], rows: [['สิ่งของ', 'It + be', 'It is my phone.'], ['ระยะทาง', 'How far is it...?', 'How far is it to school?'], ['อากาศ/เวลา', 'It is...', 'It is raining.']] };
  } else if (s.includes('some / any')) {
    rule = '“some ใช้บอกว่ามีหรือใช้เสนอ · any ใช้ถามหรือบอกว่าไม่มี”';
    body = 'มีของอยู่ใช้ some ถามว่ามีไหมหรือบอกว่าไม่มีใช้ any จำหลักนี้ก่อน แล้วค่อยดูบริบทนะ';
    examples = [{ en: 'There are some apples.', th: 'บอกเล่าใช้ some', ok: true }, { en: 'I don’t have any money.', th: 'ปฏิเสธใช้ any', ok: true }, { en: 'I don’t have some money.', th: 'ปฏิเสธทั่วไปใช้ any', ok: false }];
    table = { headers: ['คำ', 'ใช้เมื่อ', 'ตัวอย่าง'], rows: [['some', 'บอกเล่า/เสนอ', 'I have some tea.'], ['any', 'คำถาม', 'Do you have any tea?'], ['any', 'ปฏิเสธ', 'I don’t have any tea.']] };
  } else if (s.includes('indefinite pronouns')) {
    rule = '“everyone / someone / nobody เป็นเอกพจน์ แม้ความหมายจะพูดถึงหลายคน”';
    body = 'คำกลุ่ม -one, -body และ -thing ไม่ได้ชี้เฉพาะ และส่วนใหญ่ใช้กริยาเอกพจน์ เช่น everyone likes และ nobody knows';
    examples = [{ en: 'Everyone likes pizza.', th: 'everyone ใช้ likes', ok: true }, { en: 'Nobody knows the answer.', th: 'nobody ใช้ knows', ok: true }, { en: 'Everyone like pizza.', th: 'ผิด — ต้องเป็น likes', ok: false }];
    table = { headers: ['คำ', 'ความหมาย', 'ตัวอย่าง'], rows: [['everyone', 'ทุกคน', 'Everyone is ready.'], ['someone', 'ใครบางคน', 'Someone is calling.'], ['nobody', 'ไม่มีใคร', 'Nobody knows.']] };
  } else if (s.includes('personal pronouns')) {
    rule = '“คนทำใช้ I / he / she / we / they · คนถูกกระทำใช้ me / him / her / us / them”';
    body = 'ถามตัวเองว่าใครเป็นคนทำ ถ้าเป็นคนรับการกระทำหรืออยู่หลังบุพบท ให้ใช้รูปกรรม';
    examples = [{ en: 'She called me.', th: 'she เป็นคนโทร, me เป็นคนรับสาย', ok: true }, { en: 'They gave us the keys.', th: 'us เป็นผู้รับกุญแจ', ok: true }, { en: 'Me called she.', th: 'ประธานต้องใช้รูปประธาน', ok: false }];
    table = { headers: ['หน้าที่', 'คำที่ใช้', 'ตัวอย่าง'], rows: [['ประธาน', 'I / he / she / we / they', 'She called me.'], ['กรรม', 'me / him / her / us / them', 'I helped him.'], ['หลังบุพบท', 'me / him / her / us / them', 'Come with us.']] };
  } else if (s.includes('reflexive')) {
    rule = '“ถ้าคนทำกับคนรับเป็นคนเดียวกัน ใช้ myself / yourself / himself...”';
    body = 'ใช้ reflexive pronoun เมื่ออยากบอกว่าทำกับตัวเอง หรือทำด้วยตัวเอง';
    examples = [{ en: 'I made it myself.', th: 'ฉันทำเอง', ok: true }, { en: 'She taught herself English.', th: 'เธอสอนตัวเอง', ok: true }, { en: 'I made it me.', th: 'ต้องใช้ myself เมื่อหมายถึงทำเอง', ok: false }];
    table = { headers: ['ประธาน', 'คำสะท้อนกลับ', 'ตัวอย่าง'], rows: [['I', 'myself', 'I did it myself.'], ['he / she', 'himself / herself', 'She taught herself.'], ['we / they', 'ourselves / themselves', 'They did it themselves.']] };
  } else if (s.includes('much / many')) {
    rule = '“much ใช้กับคำนามนับไม่ได้ · many ใช้กับคำนามนับได้หลายชิ้น”';
    body = 'money, time และ water นับเป็นชิ้นๆ ไม่ได้ จึงใช้ much ส่วน books, people และ questions ใช้ many';
    examples = [{ en: 'How much money do you need?', th: 'money นับไม่ได้ → much', ok: true }, { en: 'How many books are there?', th: 'books นับได้ → many', ok: true }, { en: 'How many money do you need?', th: 'money ใช้ much', ok: false }];
    table = { headers: ['คำ', 'ใช้กับ', 'ตัวอย่าง'], rows: [['much', 'นับไม่ได้', 'much time'], ['many', 'นับได้', 'many books'], ['How much', 'ถามปริมาณ', 'How much water?']] };
  } else if (s.includes('enough')) {
    rule = '“enough + noun · adjective/adverb + enough” แปลว่าเพียงพอ';
    body = 'ถ้า enough อยู่หน้าคำนาม เช่น enough time แต่ถ้าอยู่หลังคำคุณศัพท์ เช่น strong enough';
    examples = [{ en: 'We have enough time.', th: 'enough อยู่หน้าคำนาม', ok: true }, { en: 'The room is big enough.', th: 'enough อยู่หลัง adjective', ok: true }, { en: 'We have time enough.', th: 'รูปที่ใช้บ่อยคือ enough time', ok: false }];
    table = { headers: ['ตำแหน่ง', 'รูปแบบ', 'ตัวอย่าง'], rows: [['หน้าคำนาม', 'enough + noun', 'enough money'], ['หลัง adjective', 'adjective + enough', 'old enough'], ['หลัง adverb', 'adverb + enough', 'quickly enough']] };
  } else if (s.includes('such')) {
    rule = '“such + a/an + adjective + noun” ใช้เน้นว่ามากหรือสุดๆ';
    body = 'ถ้าหลังช่องว่างมี adjective และคำนาม ให้คิดถึง such a/an เช่น such an exciting game';
    examples = [{ en: 'It was such an exciting game.', th: 'such + an + adjective + noun', ok: true }, { en: 'She is such a kind person.', th: 'such a kind person', ok: true }, { en: 'It was so an exciting game.', th: 'so ไม่วางหน้า a/an แบบนี้', ok: false }];
    table = { headers: ['รูปแบบ', 'ตัวอย่าง', 'จำว่า'], rows: [['such a + adjective + noun', 'such a good day', 'เสียงพยัญชนะ'], ['such an + adjective + noun', 'such an exciting game', 'เสียงสระ'], ['such + plural noun', 'such nice people', 'พหูพจน์']] };
  } else if (s.includes('articles')) {
    rule = '“a/an = หนึ่งสิ่งทั่วไป · the = สิ่งที่รู้ว่าคืออันไหน”';
    body = 'ใช้ a หน้าเสียงพยัญชนะ, an หน้าเสียงสระ และ the เมื่อผู้พูดกับผู้ฟังรู้ว่าพูดถึงสิ่งไหน';
    examples = [{ en: 'I saw a dog.', th: 'พูดถึงครั้งแรกใช้ a', ok: true }, { en: 'The dog was friendly.', th: 'พูดถึงตัวเดิมใช้ the', ok: true }, { en: 'He ate a apple.', th: 'ต้องเป็น an apple', ok: false }];
    table = { headers: ['คำ', 'ใช้เมื่อ', 'ตัวอย่าง'], rows: [['a', 'เสียงพยัญชนะ', 'a book'], ['an', 'เสียงสระ', 'an apple'], ['the', 'สิ่งที่รู้ว่าอันไหน', 'the door']] };
  } else if (s.includes('there is')) {
    rule = '“There is + หนึ่งสิ่ง/นับไม่ได้ · There are + หลายสิ่ง”';
    body = 'มองคำนามหลัง there ถ้ามีหนึ่งสิ่งหรือนับไม่ได้ใช้ is ถ้ามีหลายสิ่งใช้ are';
    examples = [{ en: 'There is a book on the desk.', th: 'book หนึ่งเล่ม → is', ok: true }, { en: 'There are many books here.', th: 'books หลายเล่ม → are', ok: true }, { en: 'There is many books here.', th: 'books พหูพจน์ต้องใช้ are', ok: false }];
    table = { headers: ['คำนามหลัง there', 'ใช้', 'ตัวอย่าง'], rows: [['หนึ่งสิ่ง', 'There is', 'There is a chair.'], ['หลายสิ่ง', 'There are', 'There are two chairs.'], ['นับไม่ได้', 'There is', 'There is some water.']] };
  } else if (s.includes('สถานที่')) {
    rule = '“in = อยู่ข้างใน/ประเทศ · on = อยู่บนพื้นผิว · at = จุดหนึ่ง · to = ไปยัง”';
    body = 'บุพบทสถานที่ให้ดูความสัมพันธ์ของสิ่งนั้นกับสถานที่ เช่น อยู่ในห้อง อยู่บนโต๊ะ หรือกำลังไปสวน';
    examples = [{ en: 'John lives in the United States.', th: 'ประเทศใช้ in', ok: true }, { en: 'The keys are on the table.', th: 'พื้นผิวใช้ on', ok: true }, { en: 'The family goes in the park.', th: 'go กับจุดหมายใช้ to the park', ok: false }];
    table = { headers: ['คำ', 'ใช้กับ', 'ตัวอย่าง'], rows: [['in', 'ข้างใน/ประเทศ', 'in the room'], ['on', 'พื้นผิว', 'on the table'], ['at / to', 'จุด/จุดหมาย', 'at the stop / go to school']] };
  } else if (s.includes('เวลา')) {
    rule = '“at = เวลาเจาะจง · on = วัน · in = เดือน/ปี/ช่วงเวลา · for = ระยะเวลา”';
    body = 'เลือกบุพบทจากชนิดของเวลา ถ้าเป็นนาฬิกาใช้ at ถ้าเป็นวันใช้ on ถ้าเป็นปีหรือช่วงเวลาใช้ in';
    examples = [{ en: 'I leave home at 7 a.m.', th: 'เวลาที่เจาะจงใช้ at', ok: true }, { en: 'We met on Monday.', th: 'วันใช้ on', ok: true }, { en: 'She lived here since six years.', th: 'ระยะเวลาใช้ for six years', ok: false }];
    table = { headers: ['คำ', 'ใช้กับ', 'ตัวอย่าง'], rows: [['at', 'เวลาจุดเดียว', 'at 7 a.m.'], ['on', 'วัน/วันที่', 'on Monday'], ['in / for', 'ปี/ช่วง/ระยะเวลา', 'in 2020 / for six years']] };
  } else if (s.includes('look forward') || s.includes('worried') || s.includes('a lot of')) {
    rule = '“คำบางคำต้องจับคู่กับบุพบทเฉพาะ” เช่น look forward to, worried about และ a lot of';
    body = 'กลุ่มนี้ให้จำเป็นชุด อย่าแปลแยกคำอย่างเดียว เพราะบุพบทที่ตามหลังทำให้โครงสร้างถูกต้อง';
    examples = [{ en: 'I look forward to meeting you.', th: 'look forward to + V-ing', ok: true }, { en: 'She is worried about her exam.', th: 'worried about', ok: true }, { en: 'We have a lot work.', th: 'ต้องเป็น a lot of work', ok: false }];
    table = { headers: ['คู่คำ', 'ความหมาย', 'ตัวอย่าง'], rows: [['look forward to', 'ตั้งตารอ', 'look forward to meeting'], ['worried about', 'กังวลเรื่อง', 'worried about the exam'], ['a lot of', 'จำนวนมาก', 'a lot of time']] };
  } else if (s.includes('phrasal')) {
    rule = '“phrasal verb = verb + คำสั้นๆ ที่รวมกันแล้วได้ความหมายใหม่”';
    body = 'คำอย่าง eat out, turn on และ look for ต้องจำเป็นคู่ เพราะเติมคำหลังแล้วความหมายเปลี่ยนไปเลย';
    examples = [{ en: 'Let’s eat out tonight.', th: 'eat out = กินข้าวนอกบ้าน', ok: true }, { en: 'Please turn on the light.', th: 'turn on = เปิด', ok: true }, { en: 'I am looking at my keys. (ถ้าหมายถึงค้นหา)', th: 'ค้นหาต้องใช้ look for', ok: false }];
    table = { headers: ['วลี', 'ความหมาย', 'ตัวอย่าง'], rows: [['eat out', 'กินนอกบ้าน', 'We eat out.'], ['turn on', 'เปิด', 'Turn on the light.'], ['look for', 'ค้นหา', 'Look for my keys.']] };
  } else if (s.includes('collocation')) {
    rule = '“คำบางคำชอบอยู่ด้วยกัน ต้องจำเป็นคู่” เช่น have a good time และ leave a message';
    body = 'Collocation คือคู่คำที่เจ้าของภาษาใช้ด้วยกันบ่อยๆ เลือกกริยาให้เข้าคู่กับคำนาม อย่าแปลทีละคำอย่างเดียว';
    examples = [{ en: 'We had a good time.', th: 'have a good time = สนุก/มีช่วงเวลาดีๆ', ok: true }, { en: 'Please leave a message.', th: 'leave a message = ฝากข้อความ', ok: true }, { en: 'We did a good time.', th: 'คู่คำที่ถูกคือ had a good time', ok: false }];
    table = { headers: ['คู่คำ', 'ความหมาย', 'ตัวอย่าง'], rows: [['have a good time', 'มีช่วงเวลาดีๆ', 'We had a good time.'], ['leave a message', 'ฝากข้อความ', 'Please leave a message.'], ['take a seat', 'เชิญนั่ง', 'Take a seat.']] };
  } else if (s.includes('borrow/lend') || s.includes('บริบท')) {
    rule = '“borrow = ขอยืม · lend = ให้ยืม” เลือกคำจากมุมของคนพูด';
    body = 'ถ้าเราเอาของคนอื่นมาใช้คือ borrow แต่ถ้าเราให้ของคนอื่นใช้คือ lend ส่วนคำอย่าง shy และ kind ให้ดูความหมายจากบริบท';
    examples = [{ en: 'Can I borrow your pen?', th: 'ฉันขอยืมปากกา', ok: true }, { en: 'Can you lend me your pen?', th: 'ช่วยให้ฉันยืมปากกา', ok: true }, { en: 'Can I lend your pen?', th: 'ถ้าเป็นคนขอยืมต้องใช้ borrow', ok: false }];
    table = { headers: ['คำ', 'ความหมาย', 'ตัวอย่าง'], rows: [['borrow', 'ขอยืม', 'Can I borrow it?'], ['lend', 'ให้ยืม', 'Can you lend it to me?'], ['shy / kind', 'ขี้อาย / ใจดี', 'She is shy and kind.']] };
  } else if (s.includes('quite / really')) {
    rule = '“quite และ really ใช้ขยาย adjective เพื่อบอกระดับความรู้สึก”';
    body = 'สองคำนี้ช่วยเน้นคำคุณศัพท์ เช่น quite nice = ค่อนข้างดี และ really tired = เหนื่อยจริงๆ';
    examples = [{ en: 'The film was quite good.', th: 'ค่อนข้างดี', ok: true }, { en: 'I am really tired.', th: 'เหนื่อยมาก/จริงๆ', ok: true }, { en: 'The film was quite books.', th: 'quite ต้องขยาย adjective ไม่ใช่คำนามพหูพจน์', ok: false }];
    table = { headers: ['คำ', 'ความหมาย', 'ตัวอย่าง'], rows: [['quite', 'ค่อนข้าง', 'quite nice'], ['really', 'มาก/จริงๆ', 'really useful'], ['ตำแหน่ง', 'หน้าคำคุณศัพท์', 'really interesting']] };
  } else if (s.includes('here you are')) {
    rule = '“Here you are ใช้ตอนยื่นของให้ใคร และมักตอบกลับว่า Thank you”';
    body = 'สำนวนสั้นๆ ในบทสนทนาให้จำเป็นก้อน เช่น Here you are, That’s OK และ You’re welcome';
    examples = [{ en: 'Here you are. — Thank you.', th: 'ยื่นของให้และตอบขอบคุณ', ok: true }, { en: 'Thanks for your help. — You’re welcome.', th: 'ตอบรับคำขอบคุณ', ok: true }, { en: 'Here you are. — Yesterday.', th: 'คำตอบควรเป็นคำตอบในบทสนทนา เช่น Thank you', ok: false }];
    table = { headers: ['สำนวน', 'ใช้เมื่อ', 'ตัวอย่าง'], rows: [['Here you are', 'ยื่นของให้', 'Here you are.'], ['That’s OK', 'ตอบคำขอโทษ', 'Sorry. — That’s OK.'], ['You’re welcome', 'ตอบคำขอบคุณ', 'Thanks. — You’re welcome.']] };
  } else if (s.includes('get over')) {
    rule = '“get over + ปัญหา/ความรู้สึก = ผ่านพ้นหรือหายจากสิ่งนั้น”';
    body = 'จำเป็นก้อนว่า get over an illness, get over a problem หรือ get over a surprise ไม่ได้แปลว่าไปอยู่ด้านบนอย่างเดียว';
    examples = [{ en: 'It took weeks to get over the illness.', th: 'ใช้ get over เมื่อหายจากอาการป่วย', ok: true }, { en: 'She got over her fear.', th: 'เธอผ่านพ้นความกลัว', ok: true }, { en: 'She got in her fear.', th: 'วลีที่ถูกคือ got over her fear', ok: false }];
    table = { headers: ['วลี', 'ความหมาย', 'ตัวอย่าง'], rows: [['get over an illness', 'หายจากอาการป่วย', 'He got over it.'], ['get over a problem', 'ผ่านพ้นปัญหา', 'We got over the problem.'], ['get over a surprise', 'หายทึ่ง/ทำใจได้', 'I can’t get over it.']] };
  } else if (s.includes('verb + object')) {
    rule = '“tell / ask / want + คน + to + V.1”';
    body = 'ถ้ามีคนเป็นกรรมอยู่กลางประโยค แล้วตามด้วยสิ่งที่อยากให้เขาทำ ให้ใช้ to + กริยาช่อง 1';
    examples = [{ en: 'The teacher told us to work quietly.', th: 'told + us + to work', ok: true }, { en: 'I asked her to close the door.', th: 'asked + her + to close', ok: true }, { en: 'She told me close the door.', th: 'ต้องเป็น told me to close', ok: false }];
    table = { headers: ['กริยา', 'รูปแบบ', 'ตัวอย่าง'], rows: [['tell', 'tell + คน + to V.1', 'Tell him to wait.'], ['ask', 'ask + คน + to V.1', 'Ask her to call.'], ['want', 'want + คน + to V.1', 'I want you to try.']] };
  } else if (s.includes('bare infinitive')) {
    rule = '“let / make / see someone + V.1” หลังคำกลุ่มนี้ไม่ต้องใส่ to';
    body = 'Bare infinitive คือกริยาช่อง 1 ที่ไม่มี to เช่น let me go, make me try และ see him leave';
    examples = [{ en: 'My mother let me go out.', th: 'let + คน + go', ok: true }, { en: 'I saw him leave the room.', th: 'see + คน + leave', ok: true }, { en: 'She let me to go out.', th: 'หลัง let ไม่ใส่ to', ok: false }];
    table = { headers: ['โครงสร้าง', 'ตัวอย่าง', 'จำว่า'], rows: [['let + คน + V.1', 'Let me go.', 'ไม่ใส่ to'], ['make + คน + V.1', 'She made me try.', 'ไม่ใส่ to'], ['see + คน + V.1', 'I saw him leave.', 'ไม่ใส่ to']] };
  } else if (s.includes('get used')) {
    rule = '“be/get used to + noun หรือ V-ing = คุ้นเคยกับ...”';
    body = 'ระวัง used to มีสองความหมาย: used to + V.1 คือเคยทำในอดีต แต่ get used to + noun/V-ing คือเริ่มชินกับสิ่งนั้น';
    examples = [{ en: 'I am getting used to this schedule.', th: 'เริ่มชินกับตารางนี้', ok: true }, { en: 'She is used to waking early.', th: 'คุ้นเคยกับการตื่นเช้า', ok: true }, { en: 'He is getting used to wake early.', th: 'หลัง to ใน get used to ใช้ V-ing', ok: false }];
    table = { headers: ['รูปแบบ', 'ความหมาย', 'ตัวอย่าง'], rows: [['used to + V.1', 'เคยทำ', 'I used to walk.'], ['be used to + V-ing', 'คุ้นเคย', 'I am used to walking.'], ['get used to + V-ing', 'เริ่มชิน', 'I get used to working.']] };
  } else if (s.includes('wh-questions')) {
    rule = '“What = อะไร · Where = ที่ไหน · When = เมื่อไหร่ · Why = ทำไม · How = อย่างไร” เลือกตามสิ่งที่อยากถาม';
    body = 'คำถาม Wh ไม่ได้ยาก แค่ถามให้ตรงเรื่องที่อยากรู้ ถามคนใช้ who ถามที่ใช้ where ถามวิธีใช้ how เท่านั้นเอง';
    examples = [{ en: 'Where do you live?', th: 'ถามสถานที่ → Where', ok: true }, { en: 'How do you get home?', th: 'ถามวิธี → How', ok: true }, { en: 'Why do you live?', th: 'ถ้าถามสถานที่ ประโยคนี้ไม่ตรงความหมาย', ok: false }];
    table = { headers: ['คำถาม', 'ถามเรื่อง', 'ตัวอย่าง'], rows: [['Who', 'คน', 'Who called you?'], ['Where', 'สถานที่', 'Where do you live?'], ['How', 'วิธีการ', 'How did you get home?']] };
    vocab = { columns: ['คำ', 'ใช้ถาม', 'ตัวอย่าง'], rows: [['What', 'สิ่งของ/ข้อมูล', 'What is it?'], ['When', 'เวลา', 'When do you leave?'], ['Why', 'เหตุผล', 'Why are you late?']] };
  } else if (s.includes('polite requests')) {
    rule = '“Could I / Could you / Would you like...?” ใช้ขอหรือเสนอแบบสุภาพ ฟังนุ่มขึ้นเยอะเลย';
    body = 'อยากขออะไรแบบสุภาพให้ใช้ Could I...? ถ้าขอให้อีกคนช่วยใช้ Could you...? ส่วน Would you like...? ใช้เสนอของหรือชวน';
    examples = [{ en: 'Could I borrow your pen?', th: 'ขอยืมอย่างสุภาพ', ok: true }, { en: 'Would you like some coffee?', th: 'เสนออย่างสุภาพ', ok: true }, { en: 'Could you opens the door?', th: 'หลัง Could ใช้ open รูปเดิม', ok: false }];
    table = { headers: ['รูปแบบ', 'ใช้เมื่อ', 'ตัวอย่าง'], rows: [['Could I...?', 'ขออนุญาต', 'Could I sit here?'], ['Could you...?', 'ขอให้ช่วย', 'Could you wait?'], ['Would you like...?', 'เสนอ/ชวน', 'Would you like tea?']] };
  } else if (s.includes('question tags')) {
    rule = '“ประโยคหลักบอกเล่า → tag ปฏิเสธ · ประโยคหลักปฏิเสธ → tag บอกเล่า” แล้วใช้คำช่วยให้ตรงกัน';
    body = 'Question tag คือคำถามสั้นๆ ท้ายประโยค ใช้เช็กว่าอีกคนเห็นด้วยไหม มองคำช่วยในประโยคหลักก่อน แล้วกลับขั้วท้ายประโยค';
    examples = [{ en: 'You like tea, don’t you?', th: 'บอกเล่า → don’t you', ok: true }, { en: 'She isn’t late, is she?', th: 'ปฏิเสธ → is she', ok: true }, { en: 'He works here, isn’t he?', th: 'works ต้องใช้ doesn’t he', ok: false }];
    table = { headers: ['ประโยคหลัก', 'ท้ายประโยค', 'ตัวอย่าง'], rows: [['บอกเล่า', 'ปฏิเสธ', 'You work, don’t you?'], ['ปฏิเสธ', 'บอกเล่า', 'You don’t work, do you?'], ['อดีต', 'ใช้ did', 'She went, didn’t she?']] };
  } else if (s.includes('possessive adjectives')) {
    rule = '“my, your, his, her, its, our, their ต้องอยู่หน้าคำนาม” แปลว่า ของใคร';
    body = 'ถ้าหลังช่องว่างยังมีคำนามตามมา ให้ใช้ possessive adjective เช่น his car, her book, their house';
    examples = [{ en: 'John loves his new car.', th: 'his อยู่หน้าคำนาม car', ok: true }, { en: 'They visit their parents.', th: 'their อยู่หน้า parents', ok: true }, { en: 'This book is his one.', th: 'ถ้าไม่มีคำนามตามหลังให้ใช้ his เฉยๆ', ok: false }];
    table = { headers: ['คน', 'คำแสดงเจ้าของ', 'ตัวอย่าง'], rows: [['I', 'my', 'my book'], ['he / she', 'his / her', 'her phone'], ['they', 'their', 'their house']] };
  } else if (s.includes('possessive pronouns')) {
    rule = '“mine, yours, his, hers, ours, theirs ใช้แทนของทั้งก้อน และไม่ต้องมีคำนามตามหลัง”';
    body = 'ถ้าไม่อยากพูดคำนามซ้ำ ให้ใช้ mine, yours, hers หรือ theirs ได้เลย เช่น This pen is mine';
    examples = [{ en: 'This phone is mine.', th: 'mine = ของฉัน ไม่ต้องพูด phone ซ้ำ', ok: true }, { en: 'That bag is hers.', th: 'hers = ของเธอ', ok: true }, { en: 'This is mine phone.', th: 'ผิด — mine ห้ามวางหน้าคำนาม', ok: false }];
    table = { headers: ['คำ', 'ความหมาย', 'ตัวอย่าง'], rows: [['mine', 'ของฉัน', 'The pen is mine.'], ['hers', 'ของเธอ', 'The bag is hers.'], ['theirs', 'ของพวกเขา', 'The seats are theirs.']] };
  } else if (s.includes('who / that')) {
    rule = '“who ใช้กับคน · that ใช้กับคนหรือสิ่งของ” ดูคำนามที่อยู่หน้าช่องว่างก่อน';
    body = 'who เอาไว้ขยายคน ส่วน that ใช้ขยายสิ่งของหรือคนได้ในประโยคทั่วไป จำคู่นี้ไว้ทำโจทย์ได้เยอะเลย';
    examples = [{ en: 'The woman who called is my teacher.', th: 'woman เป็นคน → who', ok: true }, { en: 'The book that I bought is useful.', th: 'book เป็นสิ่งของ → that', ok: true }, { en: 'The woman which called is my teacher.', th: 'คนใช้ who ไม่ใช่ which', ok: false }];
    table = { headers: ['คำ', 'ใช้กับ', 'ตัวอย่าง'], rows: [['who', 'คน', 'The man who helped me'], ['that', 'คน/สิ่งของ', 'The book that I read'], ['which', 'สิ่งของ', 'The car which I bought']] };
  } else if (s.includes('whose')) {
    rule = '“whose + คำนาม = ของใคร” เห็นคำนามตามหลัง whose ให้คิดเรื่องเจ้าของไว้ก่อน';
    body = 'whose ใช้ถามหรือขยายความเป็นเจ้าของ เช่น the man whose car is blue = ผู้ชายที่รถของเขาสีน้ำเงิน';
    examples = [{ en: 'The man whose car is blue lives here.', th: 'รถเป็นของผู้ชายคนนั้น → whose', ok: true }, { en: 'The girl whose mother is a doctor is my friend.', th: 'whose + mother', ok: true }, { en: 'The man who car is blue lives here.', th: 'ต้องเป็น whose car', ok: false }];
    table = { headers: ['รูปแบบ', 'ความหมาย', 'ตัวอย่าง'], rows: [['whose + noun', 'คำนามของใคร', 'whose car'], ['the man whose...', 'คนที่ของเขา...', 'the man whose car...'], ['the house whose...', 'สิ่งที่มีของ...', 'the house whose roof...']] };
  } else if (s.includes('what (=')) {
    rule = '“what = สิ่งที่...” ใช้รวมความหมายของ the thing that ไว้ในคำเดียว';
    body = 'what ในแบบนี้ไม่ได้แปลว่าอะไรอย่างเดียว แต่แปลว่า สิ่งที่... เช่น I know what you mean = ฉันรู้ว่าสิ่งที่คุณหมายถึงคืออะไร';
    examples = [{ en: 'I know what you mean.', th: 'what you mean = สิ่งที่คุณหมายถึง', ok: true }, { en: 'Tell me what happened.', th: 'what happened = สิ่งที่เกิดขึ้น', ok: true }, { en: 'I know what the book that.', th: 'what ต้องตามด้วยประโยคที่สมบูรณ์', ok: false }];
    table = { headers: ['รูปแบบ', 'ความหมาย', 'ตัวอย่าง'], rows: [['what + clause', 'สิ่งที่...', 'what you need'], ['I know what...', 'ฉันรู้ว่าอะไร', 'I know what you mean'], ['what happened', 'สิ่งที่เกิดขึ้น', 'Tell me what happened']] };
  } else if (s.includes('passive')) {
    rule = '“be + V.3 = ถูกกระทำ” ดูประธานว่าเอกพจน์หรือพหูพจน์ แล้วเลือก is/are/was/were';
    body = 'Passive ใช้เมื่อเราอยากเน้นสิ่งที่ถูกทำมากกว่าคนทำ เช่น The cake was made by Anna';
    examples = [{ en: 'The cake was made by Anna.', th: 'เค้กถูกทำโดย Anna', ok: true }, { en: 'The letters were sent yesterday.', th: 'letters หลายฉบับ → were sent', ok: true }, { en: 'The cake was make by Anna.', th: 'หลัง was ต้องใช้ V.3 คือ made', ok: false }];
    table = { headers: ['เวลา', 'รูปแบบ', 'ตัวอย่าง'], rows: [['ปัจจุบัน', 'is/are + V.3', 'The door is closed.'], ['อดีต', 'was/were + V.3', 'The door was closed.'], ['ผู้กระทำ', 'by + คน', 'by Anna']] };
  } else if (s.includes('conditional')) {
    rule = '“If + เงื่อนไข, ผลลัพธ์” ถ้าเป็นเรื่องจริง/อนาคตใช้ present หลัง if; ถ้าเป็นสมมติใช้ past + would';
    body = 'Conditional คือประโยคถ้า...ก็... ให้ดูว่ากำลังพูดถึงเงื่อนไขจริงหรือสมมติ แล้วเลือก tense ให้เข้าคู่กัน';
    examples = [{ en: 'If it rains, we will stay home.', th: 'เงื่อนไขอนาคต → if + present', ok: true }, { en: 'If I had time, I would help.', th: 'สมมติ → if + past, would', ok: true }, { en: 'If it will rain, we stay home.', th: 'หลัง if แบบนี้ไม่ใช้ will', ok: false }];
    table = { headers: ['แบบ', 'รูปแบบ', 'ตัวอย่าง'], rows: [['First', 'If + present, will', 'If I finish, I will call.'], ['Second', 'If + past, would', 'If I had time, I would go.'], ['คำสำคัญ', 'if = ถ้า', 'If it rains...']] };
  } else if (s.includes('comparative') || s.includes('ขั้นกว่า')) {
    rule = '“เปรียบเทียบ 2 อย่างใช้ -er หรือ more + adjective และมักมี than ตามหลัง”';
    body = 'คำสั้นเติม -er เช่น taller ส่วนคำยาวใช้ more เช่น more interesting แล้วใส่ than เมื่อเทียบกับอีกสิ่ง';
    examples = [{ en: 'Sam is taller than Tom.', th: 'คำสั้นเติม -er', ok: true }, { en: 'This book is more interesting than that one.', th: 'คำยาวใช้ more', ok: true }, { en: 'She is more taller than me.', th: 'ห้ามใช้ more กับ taller ซ้ำกัน', ok: false }];
    table = { headers: ['ชนิดคำ', 'รูปเปรียบเทียบ', 'ตัวอย่าง'], rows: [['คำสั้น', 'adjective + er', 'faster than'], ['คำยาว', 'more + adjective', 'more useful'], ['ไม่ปกติ', 'รูปพิเศษ', 'good → better']] };
  } else if (s.includes('superlative') || s.includes('ขั้นสูงสุด')) {
    rule = '“เปรียบเทียบที่สุดใช้ the + -est หรือ the most + adjective”';
    body = 'ถ้าเทียบตั้งแต่ 3 อย่างขึ้นไปและบอกว่าใคร/อะไรที่สุด ให้ใช้ the best, the smallest หรือ the most interesting';
    examples = [{ en: 'She is the tallest in the class.', th: 'คำสั้นใช้ the + -est', ok: true }, { en: 'This is the most useful tool.', th: 'คำยาวใช้ the most', ok: true }, { en: 'He is taller in the class.', th: 'ถ้าหมายถึงที่สุดต้องเป็น the tallest', ok: false }];
    table = { headers: ['ชนิดคำ', 'รูปสูงสุด', 'ตัวอย่าง'], rows: [['คำสั้น', 'the + adjective-est', 'the fastest'], ['คำยาว', 'the most + adjective', 'the most useful'], ['ไม่ปกติ', 'รูปพิเศษ', 'good → best']] };
  } else if (s.includes('frequency')) {
    rule = '“always / usually / often / sometimes / rarely / never บอกว่าทำบ่อยแค่ไหน”';
    body = 'คำบอกความถี่ช่วยเล่าว่านิสัยหรือกิจกรรมนั้นเกิดบ่อยแค่ไหน โดยปกติวางหน้ากริยาแท้ แต่หลัง verb to be';
    examples = [{ en: 'I usually walk to work.', th: 'usually อยู่หน้ากริยา walk', ok: true }, { en: 'She is always kind.', th: 'หลัง is วาง always', ok: true }, { en: 'I walk usually to work.', th: 'ตำแหน่งนี้ฟังไม่เป็นธรรมชาติในโจทย์ทั่วไป', ok: false }];
    table = { headers: ['ความถี่', 'คำ', 'ตัวอย่าง'], rows: [['100%', 'always', 'I always study.'], ['บ่อย', 'often / usually', 'We often cook.'], ['0%', 'never', 'He never smokes.']] };
  } else if (s.includes('subjunctive')) {
    rule = '“insist / suggest / recommend + that + subject + V.1” แม้ประธานเป็น he/she ก็ไม่เติม s';
    body = 'Subjunctive แบบนี้ใช้หลังคำอย่าง insist, suggest, recommend หรือ important that ฟังเหมือนทางการนิดหน่อย แต่จำรูปเดียวพอ';
    examples = [{ en: 'She suggested that he leave early.', th: 'หลัง that ใช้ leave รูปเดิม', ok: true }, { en: 'It is important that everyone be ready.', th: 'ใช้ be กับทุกประธาน', ok: true }, { en: 'She suggested that he leaves early.', th: 'หลัง that ไม่เติม s', ok: false }];
    table = { headers: ['คำก่อน that', 'หลัง that', 'ตัวอย่าง'], rows: [['insist', 'V.1', 'insist that he go'], ['suggest', 'V.1', 'suggest that she leave'], ['important', 'be / V.1', 'important that he be ready']] };
    vocab = { columns: ['คำสำคัญ', 'รูปตามหลัง', 'ตัวอย่าง'], rows: [['insist', 'that + V.1', 'insist that he go'], ['suggest', 'that + V.1', 'suggest that she leave'], ['recommend', 'that + V.1', 'recommend that we try']] };
  } else if (s.includes('modal')) {
    rule = '“should / must / might / could + verb รูปเดิม” หลัง modal ไม่เติม s ไม่เติม to';
    body = 'Modal ช่วยเติมความหมายอย่างควร ต้อง อาจจะ หรือเคยทำ กฎเดียวที่ต้องจำคือกริยาหลัง modal ใช้รูปเดิม';
    examples = [{ en: 'You should rest.', th: 'should + rest', ok: true }, { en: 'She must leave now.', th: 'must + leave', ok: true }, { en: 'He should rests.', th: 'หลัง should ไม่เติม s', ok: false }];
  } else if (s.includes('future')) {
    rule = '“will + verb รูปเดิม” ทุกประธานใช้เหมือนกัน ไม่เติม s';
    body = 'will ใช้พูดถึงอนาคต การตัดสินใจตอนนี้ หรือการคาดเดา หลัง will ใช้กริยารูปเดิมเลย';
    examples = [{ en: 'I think I’ll make a cake.', th: 'ตัดสินใจตอนพูด', ok: true }, { en: 'She will help you.', th: 'will + help', ok: true }, { en: 'He will helps you.', th: 'ผิด — ไม่เติม s หลัง will', ok: false }];
  } else if (s.includes('continuous')) {
    rule = '“am / is / are + V-ing = กำลังทำอยู่” เลือก be ให้ตรงกับประธาน';
    body = 'ถ้ามี now, right now หรือ these days ให้ลองเช็กว่าในประโยคมี am/is/are และกริยา -ing ครบหรือยัง';
    examples = [{ en: 'She is watching TV.', th: 'she → is + watching', ok: true }, { en: 'They are working now.', th: 'they → are + working', ok: true }, { en: 'She is watch TV.', th: 'ต้องเติม -ing เป็น watching', ok: false }];
  } else if (s.includes('past simple')) {
    rule = '“บอกเล่าอดีตใช้ V.2 แต่ถาม/ปฏิเสธใช้ did/didn’t + V.1”';
    body = 'เห็น yesterday, last หรือ ago ให้คิดถึงอดีต แต่ถ้ามี did แล้วกริยาหลักต้องกลับเป็นช่อง 1';
    examples = [{ en: 'I went home yesterday.', th: 'บอกเล่าใช้ went', ok: true }, { en: 'Did you go home?', th: 'ถามใช้ Did + go', ok: true }, { en: 'Did you went home?', th: 'ผิด — went ต้องกลับเป็น go', ok: false }];
  } else if (s.includes('present perfect')) {
    rule = '“have / has + V.3” ใช้กับประสบการณ์หรือสิ่งที่ต่อเนื่องถึงตอนนี้';
    body = 'ถ้าเจอ for, since, ever, never หรือ yet ให้ลองเช็ก Present Perfect โดยเลือก have/has ตามประธาน';
    examples = [{ en: 'I have lived here for six years.', th: 'have + V.3', ok: true }, { en: 'She has never seen snow.', th: 'she → has', ok: true }, { en: 'She have lived here.', th: 'she ต้องใช้ has', ok: false }];
  } else if (s.includes('past perfect')) {
    rule = '“had + V.3 = เหตุการณ์ที่เกิดก่อนอีกเหตุการณ์ในอดีต” ทุกประธานใช้ had เหมือนกัน';
    body = 'มองหาคำว่า before, after หรือ by the time แล้วเรียงว่าอะไรเกิดก่อน เหตุการณ์ก่อนใช้ had + V.3';
    examples = [{ en: 'She had left before I arrived.', th: 'ออกไปก่อนฉันมาถึง', ok: true }, { en: 'They had finished by noon.', th: 'เสร็จก่อนเที่ยง', ok: true }, { en: 'She had leave before I arrived.', th: 'ต้องเป็น had left', ok: false }];
  } else if (s.includes('reported speech')) {
    rule = '“said ที่เป็นอดีตมักทำให้ will → would, can → could, is → was”';
    body = 'เวลาเล่าคำพูดของคนอื่น ให้ดูคำกริยานำและเปลี่ยนเวลาให้เข้ากัน ไม่ต้องใส่เครื่องหมายคำพูดแล้ว';
    examples = [{ en: 'He said he would come.', th: 'will → would', ok: true }, { en: 'She said she was tired.', th: 'is → was', ok: true }, { en: 'He said he will come.', th: 'ในโจทย์ reported speech ทั่วไปควรเป็น would', ok: false }];
  } else if (s.includes('present simple')) {
    rule = '“he / she / it เติม s ส่วน I / you / we / they ใช้กริยารูปเดิม”';
    body = 'Present Simple ใช้กับนิสัย ตารางเวลา และความจริงทั่วไป ดูประธานก่อนแล้วค่อยเลือกกริยา';
    examples = [{ en: 'She works every day.', th: 'she → works', ok: true }, { en: 'They work every day.', th: 'they → work', ok: true }, { en: 'She work every day.', th: 'she ต้องใช้ works', ok: false }];
  } else if (s.includes('and / or')) {
    rule = '“and = และ · or = หรือ” ใช้เชื่อมคำหรือประโยคให้ตรงความหมาย';
    body = 'ถ้าพูดถึงสองอย่างพร้อมกันใช้ and แต่ถ้าให้เลือกอย่างใดอย่างหนึ่งใช้ or';
    examples = [{ en: 'Sally and Billy are children.', th: 'and = และ', ok: true }, { en: 'Tea or coffee?', th: 'or = หรือ', ok: true }, { en: 'Tea and coffee? (ถ้าถามให้เลือก)', th: 'ถ้าต้องเลือกควรใช้ or', ok: false }];
  } else if (s.includes('gerund')) {
    rule = '“enjoy / keep / finish และหลังบุพบท มักตามด้วย V-ing”';
    body = 'Gerund คือกริยาเติม -ing ที่ทำหน้าที่เหมือนคำนาม จำคำที่ชอบตามด้วย -ing แล้วลองดูบริบท';
    examples = [{ en: 'She enjoys reading.', th: 'enjoy + V-ing', ok: true }, { en: 'He is good at drawing.', th: 'หลัง at ใช้ V-ing', ok: true }, { en: 'She enjoys to read.', th: 'ข้อสอบทั่วไปใช้ enjoys reading', ok: false }];
  } else if (s.includes('to + infinitive')) {
    rule = '“want / decide / need หรือบอกจุดประสงค์ + to + V.1”';
    body = 'ถ้าพูดว่าอยาก ตัดสินใจ ต้องการ หรือทำอะไรเพื่ออะไร มักเห็น to ตามด้วยกริยาช่อง 1';
  }
  return { title, intro: `มาเรียนเรื่อง ${title} แบบสั้นๆ กันนะ ${rule}`, rule, body, examples, table, vocab, tip, fallback: base, tap: [] };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"') {
      if (quoted && next === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(field); field = '';
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field || row.length) { row.push(field); if (row.some((cell) => cell.trim())) rows.push(row); }
  return rows;
}

function readCsv(): CsvQuestion[] {
  const rows = parseCsv(readFileSync(CSV_PATH, 'utf8').replace(/^\uFEFF/, ''));
  const headers = rows.shift()?.map((h) => h.trim()) ?? [];
  const index = Object.fromEntries(headers.map((h, i) => [h, i]));
  return rows.map((row) => {
    const rawOptions = [index.optionA, index.optionB, index.optionC, index.optionD].map((i) => (row[i] ?? '').trim());
    const options = rawOptions.filter(Boolean);
    const rawAnswer = (row[index.correctAnswer] ?? 'A').trim().toUpperCase().charCodeAt(0) - 65;
    const answerIndex = Math.max(0, Math.min(rawAnswer, options.length - 1));
    return {
      sentence: (row[index.questionText] ?? '').trim().replace(/_{3,}/g, '____'),
      options,
      answerIndex,
      explanation: (row[index.explanation] ?? '').trim() || 'ค่อยๆ ดูคำใบ้และโครงสร้างในประโยคนะ',
      topic: (row[index.grammarTopic] ?? '').trim(),
      subtopic: (row[index.grammarSubTopic] ?? '').trim(),
    };
  }).filter((item) => item.sentence && item.options.length >= 2);
}

function tapFromQuestions(questions: Question[], copy: Copy): TapItem[] {
  // ฝึกเบาๆ แค่ 2 ข้อต่อ Node เพื่ออบอุ่นความเข้าใจก่อนลง Real Exam
  const TAP_COUNT = 2;
  const items: TapItem[] = [];
  for (const question of questions) {
    if (items.length >= TAP_COUNT) break;
    if (!question.sentence.includes('____')) continue;
    const correct = question.options[question.answerIndex];
    const wrong = question.options.find((_, i) => i !== question.answerIndex);
    if (!correct || !wrong) continue;
    items.push(pair(question.sentence.replace('____', correct), question.sentence.replace('____', wrong)));
  }
  if (items.length < TAP_COUNT) items.push(...copy.tap.slice(0, TAP_COUNT - items.length));
  while (items.length < TAP_COUNT) {
    items.push(pair('ประโยคนี้ใช้กฎของบทได้ถูกต้อง', 'ประโยคนี้ใช้กฎของบทไม่ถูกต้อง'));
  }
  return items.slice(0, TAP_COUNT);
}

function questionsFor(subtopic: string, csv: CsvQuestion[], copy: Copy): Question[] {
  const source = csv.filter((item) => item.subtopic === subtopic);
  const result: Question[] = [];
  const seen = new Set<string>();
  for (const item of [...source, ...copy.fallback]) {
    if (seen.has(item.sentence)) continue;
    seen.add(item.sentence);
    result.push(item);
    if (result.length === 6) break;
  }
  if (result.length < 6) throw new Error(`${subtopic} มีข้อสอบไม่ครบ 6 ข้อ`);
  return result;
}

async function main() {
  const csv = readCsv();
  const units = await db.select().from(learningUnits).orderBy(asc(learningUnits.orderIndex), asc(learningUnits.id));
  const targets = units.filter((unit) => unit.orderIndex >= TARGET_ORDER_MIN && unit.orderIndex <= TARGET_ORDER_MAX);
  if (targets.length !== 10) throw new Error(`คาดว่าจะมี Unit 4–13 จำนวน 10 ยูนิต แต่พบ ${targets.length}`);
  if (units.some((unit) => PROTECTED_TITLES.has(unit.title) && unit.orderIndex >= TARGET_ORDER_MIN && unit.orderIndex <= TARGET_ORDER_MAX)) {
    throw new Error('พบ Unit ที่ไม่ควรถูกล้างอยู่ในขอบเขตเป้าหมาย');
  }

  const targetIds = new Set(targets.map((unit) => unit.id));
  await db.transaction(async (tx) => {
    const oldNodes = await tx.select({ id: learningNodes.id, unitId: learningNodes.unitId }).from(learningNodes);
    for (const node of oldNodes.filter((item) => targetIds.has(item.unitId))) {
      await tx.delete(learningNodes).where(eq(learningNodes.id, node.id));
    }

    for (const unit of targets) {
      const topic = UNIT_TOPICS[unit.title];
      if (!topic) throw new Error(`ยังไม่มี topic mapping สำหรับ ${unit.title}`);
      const subtopics = [...new Set(csv.filter((item) => item.topic === topic && item.subtopic).map((item) => item.subtopic))];
      if (subtopics.length === 0) throw new Error(`ไม่พบ subtopic ใน CSV สำหรับ ${unit.title}`);

      for (const [index, subtopic] of subtopics.entries()) {
        const copy = copyFor(subtopic);
        const nodeQuestions = questionsFor(subtopic, csv, copy);
        const tap = tapFromQuestions(nodeQuestions, copy);
        const [node] = await tx.insert(learningNodes).values({
          unitId: unit.id,
          title: `Node ${index + 1}: ${copy.title}`,
          kind: index === subtopics.length - 1 ? 'trophy' : index % 4 === 3 ? 'chest' : 'star',
          orderIndex: index,
          isPublished: true,
          passScore: 100,
        }).returning();

        await tx.insert(lessonPages).values({
          nodeId: node.id,
          pageType: 'explain',
          intro: copy.intro,
          sections: [
            {
              heading: `🧠 Golden Rule — ${copy.title}`,
              body: `${copy.rule}\n\n${copy.body}`,
              examples: copy.examples,
              table: copy.table,
            },
            {
              heading: TAP_TITLE,
              body: 'อ่านประโยค A กับ B แล้วแตะประโยคที่ถูกต้องนะ ผิดได้ ไม่เป็นไร ดูเหตุผลแล้วลองใหม่ได้เลย',
              tap: { title: 'ข้อไหนถูกต้อง', items: tap },
            },
          ],
          quiz: null,
          vocabBank: copy.vocab,
          tip: copy.tip,
          isPublished: true,
          orderIndex: 0,
        });
        await tx.insert(lessonPages).values({
          nodeId: node.id,
          pageType: 'quiz',
          sections: [],
          quiz: { questions: nodeQuestions },
          vocabBank: null,
          tip: null,
          intro: null,
          isPublished: true,
          orderIndex: 1,
        });
      }
    }
  });

  const rebuilt = [];
  for (const unit of targets) {
    const nodes = await db.select({ id: learningNodes.id, title: learningNodes.title }).from(learningNodes).where(eq(learningNodes.unitId, unit.id)).orderBy(asc(learningNodes.orderIndex), asc(learningNodes.id));
    rebuilt.push({ unitId: unit.id, title: unit.title, nodeCount: nodes.length, nodes });
  }
  console.log(JSON.stringify({ targetUnits: rebuilt.length, rebuilt, protectedUnits: ['Subject-Verb Agreement', 'Auxiliaries & Verb Forms'] }, null, 2));
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
