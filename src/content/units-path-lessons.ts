// ============================================================
// Lesson content for each clickable node in the UnitsPath.
// Content keyed by node id (u{unitId}-n{index}).
// UI-first mock: replace with DB-backed lessons later.
// ============================================================

export interface LessonTable {
  headers: string[];
  rows: string[][];
}

export interface LessonSection {
  heading: string;
  body: string;
  examples?: Array<{ en: string; th: string; ok: boolean }>;
  table?: LessonTable;
}

/** หนึ่งแถวในตาราง "คลังศัพท์ช่วยชีวิต" (legacy 3-column shape) */
export interface VocabRow {
  subject: string;
  verbForm: string;
  example: string;
}

/** คลังศัพท์ช่วยชีวิต — table with a flexible number of columns */
export interface VocabBankData {
  columns: string[];
  rows: string[][];
}

/** คำถามเติมคำในบทเรียน */
export interface QuizQuestion {
  sentence: string; // ใช้ ____ เป็นช่องว่าง เช่น "I ____ two brothers."
  options: string[];
  answerIndex: number;
  explanation: string;
}

/** ชุดคำถามของบทเรียน — ทำทีละข้อ กด "เสร็จสิ้น" เองเมื่อทำครบ */
export interface QuizSet {
  questions: QuizQuestion[];
}

export interface LessonContent {
  nodeId: string;
  title: string;
  /** Short "จำไว้เลย" summary — optional; hidden when absent/empty */
  intro?: string;
  sections: LessonSection[];
  tip?: string;
  vocabBank?: VocabBankData;
  quiz?: QuizSet;
}

export const LESSONS: Record<string, LessonContent> = {
  'u1-n1': {
    nodeId: 'u1-n1',
    title: 'Basic Rules',
    intro:
      'หลักการพื้นฐานของ Subject-Verb Agreement คือ กริยาต้องเปลี่ยนรูปตามประธานว่าเป็นเอกพจน์ (singular) หรือพหูพจน์ (plural)',
    sections: [
      {
        heading: '1. ประธานเอกพจน์ → กริยาเติม s/es',
        body: 'ในประโยค Present Simple ถ้าประธานเป็นเอกพจน์บุรุษที่ 3 (he, she, it หรือคน/สิ่งเดียว) กริยาต้องเติม s หรือ es เสมอ',
        examples: [
          { en: 'She works at a hospital.', th: 'เธอทำงานที่โรงพยาบาล', ok: true },
          { en: 'The dog barks loudly.', th: 'หมาเห่าดัง', ok: true },
          { en: 'He work at a bank.', th: 'ผิด — กริยาไม่เติม s ทั้งที่ประธานเอกพจน์', ok: false },
        ],
      },
      {
        heading: '2. ประธานพหูพจน์ → กริยาไม่เติม s',
        body: 'ถ้าประธานเป็นพหูพจน์ (I, you, we, they หรือคน/สิ่งมากกว่าหนึ่ง) กริยาใช้รูปพื้นฐาน ไม่เติม s',
        examples: [
          { en: 'They play football every weekend.', th: 'พวกเขาเล่นฟุตบอลทุกสุดสัปดาห์', ok: true },
          { en: 'We study English on Mondays.', th: 'พวกเราเรียนภาษาอังกฤษวันจันทร์', ok: true },
          { en: 'She play tennis.', th: 'ผิด — ประธานเอกพจน์ต้องใช้ plays', ok: false },
        ],
      },
      {
        heading: '3. การใช้ Do / Does ในคำถาม',
        body: '"Do" คู่กับประธาน I, You, We, They และพหูพจน์ทุกชนิด ส่วน "Does" คู่กับ He, She, It และเอกพจน์ทุกชนิด (และเมื่อใช้ Does แล้ว กริยาหลักต้องกลับเป็นรูปพื้นฐาน)',
        examples: [
          { en: 'Do you like coffee?', th: 'Do + you (ถูกต้อง)', ok: true },
          { en: 'They do not play tennis.', th: 'ประธานพหูพจน์ใช้ do', ok: true },
          { en: 'Do she like coffee?', th: 'ผิด — she เป็นเอกพจน์ ต้องใช้ Does she like…?', ok: false },
        ],
      },
      {
        heading: '4. ใช้กับ Tense อื่น',
        body: 'หลักนี้ใช้ชัดเจนที่สุดใน Present Simple ส่วน tense อื่น เช่น Past Simple กริยาไม่เปลี่ยนตามประธาน (ใช้รูปเดียวกันหมด)',
        examples: [
          { en: 'He was late. / They were late.', th: 'Past Simple ใช้ was/were แยกเอกพจน์-พหูพจน์', ok: true },
        ],
      },
    ],
    vocabBank: {
      columns: ['ประธาน', 'รูปกริยา', 'ตัวอย่าง'],
      rows: [
        ['He / She / It', 'เติม s / es', 'She plays tennis.'],
        ['I / You / We / They', 'ไม่เติม s', 'They play tennis.'],
        ['Everyone / Each / No one', 'เอกพจน์ → เติม s', 'Everyone likes pizza.'],
      ],
    },
    quiz: {
      questions: [
        {
          sentence: 'I ____ two brothers.',
          options: ['has', 'had', 'have', 'having'],
          answerIndex: 2,
          explanation:
            'ประธาน “I” ใน Present Simple ใช้ “have” เสมอ (ไม่เติม s) — “has” ใช้กับ He / She / It เท่านั้น ส่วน “had” เป็นอดีต และ “having” ต้องมี auxiliary verb นำหน้า',
        },
      ],
    },
    tip: 'เทคนิคจำ: เอกพจน์เติม s — พหูพจน์ไม่เติม s (ตรงข้ามกับการเติม s ที่ประธาน!)',
  },
  'u1-n2': {
    nodeId: 'u1-n2',
    title: 'Singular & Plural Subjects',
    intro:
      'ประธานบางประเภทดูเหมือนพหูพจน์แต่จริงๆ เป็นเอกพจน์ และบางประเภทดูเหมือนเอกพจน์แต่ใช้กริยาพหูพจน์',
    sections: [
      {
        heading: '1. ประธานที่ลงท้ายด้วย s แต่เป็นเอกพจน์',
        body: 'คำที่ลงท้าย s แต่เป็นเอกพจน์ เช่น news, physics, mathematics, economics ใช้กริยาเอกพจน์',
        examples: [
          { en: 'The news is good today.', th: 'ข่าววันนี้ดี (news = เอกพจน์)', ok: true },
          { en: 'Physics is my favorite subject.', th: 'ฟิสิกส์เป็นวิชาโปรดของฉัน', ok: true },
        ],
      },
      {
        heading: '2. Uncountable nouns',
        body: 'คำนามไม่นับได้ เช่น water, money, information, advice ถือเป็นเอกพจน์เสมอ',
        examples: [
          { en: 'The information is very useful.', th: 'ข้อมูลมีประโยชน์มาก', ok: true },
          { en: 'Her advice was helpful.', th: 'คำแนะนำของเธอช่วยได้', ok: true },
        ],
      },
      {
        heading: '3. ประธานพหูพจน์ธรรมดา',
        body: 'คำนามพหูพจน์ทั่วไป เช่น books, cars, children ใช้กริยาไม่เติม s',
        examples: [
          { en: 'The books are on the table.', th: 'หนังสืออยู่บนโต๊ะ', ok: true },
          { en: 'Children like cartoons.', th: 'เด็กๆ ชอบการ์ตูน', ok: true },
        ],
      },
    ],
    tip: 'ระวัง: อย่าใช้รูปลักษณ์คำ (ending in s) ตัดสินเสมอ — ต้องดูความหมายของคำด้วย',
  },
  'u1-n3': {
    nodeId: 'u1-n3',
    title: 'Compound Subjects',
    intro:
      'ประธานที่มีมากกว่าหนึ่งตัวเชื่อมด้วย and / or / nor มีกฎที่ต่างกันออกไป',
    sections: [
      {
        heading: '1. เชื่อมด้วย and → กริยาพหูพจน์',
        body: 'ประธานสองตัวขึ้นไปเชื่อมด้วย and ถือเป็นพหูพจน์',
        examples: [
          { en: 'Tom and Jerry are friends.', th: 'ทอมกับเจอร์รี่เป็นเพื่อนกัน', ok: true },
          { en: 'Coffee and tea are popular drinks.', th: 'กาแฟกับชาเป็นเครื่องดื่มยอดนิยม', ok: true },
        ],
      },
      {
        heading: '2. ข้อยกเว้น: คำเดียวกัน/แนวคิดเดียว',
        body: 'ถ้าประธานสองตัวหมายถึงคนเดียวกัน หรือเป็นแนวคิดเดียว ให้ใช้กริยาเอกพจน์',
        examples: [
          { en: 'The owner and manager is here.', th: 'เจ้าของที่เป็นผู้จัดการคนเดียวกันอยู่นี่ (คนเดียว)', ok: true },
          { en: 'Fish and rice is her favorite dish.', th: 'ปลากับข้าวเป็นจานโปรด (ถือเป็นจานเดียว)', ok: true },
        ],
      },
      {
        heading: '3. เชื่อมด้วย or / nor → ดูประธานตัวหลัง',
        body: 'ถ้าเชื่อมด้วย or หรือ nor กริยาจะตรงกับประธานตัวที่อยู่ใกล้กริยาที่สุด (proximity rule)',
        examples: [
          { en: 'Neither the teacher nor the students are ready.', th: 'นักเรียน (พหูพจน์) อยู่ใกล้กริยา → ใช้ are', ok: true },
          { en: 'Either the students or the teacher is ready.', th: 'ครู (เอกพจน์) อยู่ใกล้กริยา → ใช้ is', ok: true },
        ],
      },
    ],
    tip: 'เทคนิคจำ: and = พหูพจน์ · or/nor = ดูตัวหลัง (proximity rule)',
  },
  'u1-n4': {
    nodeId: 'u1-n4',
    title: 'Indefinite Pronouns',
    intro:
      'คำสรรพนามไม่ชี้เฉพาะ อย่าง everyone, someone, anybody, each, neither ส่วนใหญ่เป็นเอกพจน์',
    sections: [
      {
        heading: '1. กลุ่ม -one, -body, -thing → เอกพจน์',
        body: 'everyone, everybody, everything, someone, somebody, something, anyone, anybody, anything, no one, nobody, nothing ล้วนใช้กริยาเอกพจน์',
        examples: [
          { en: 'Everybody likes pizza.', th: 'ทุกคนชอบพิซซ่า', ok: true },
          { en: 'Something is wrong with my phone.', th: 'มีอะไรบางอย่างผิดปกติกับโทรศัพท์', ok: true },
        ],
      },
      {
        heading: '2. each, every, either, neither → เอกพจน์',
        body: 'แม้จะตามด้วยประธานพหูพจน์ คำเหล่านี้ก็ยังถือเป็นเอกพจน์',
        examples: [
          { en: 'Each of the students has a book.', th: 'นักเรียนแต่ละคนมีหนังสือ (has ไม่ใช่ have)', ok: true },
          { en: 'Neither answer is correct.', th: 'ไม่มีคำตอบไหนถูก', ok: true },
        ],
      },
      {
        heading: '3. กลุ่มที่ขึ้นกับความหมาย',
        body: 'some, any, none, most, all อาจเป็นเอกพจน์หรือพหูพจน์ได้ ขึ้นอยู่กับคำนามที่ตามหลัง (นับได้ = พหูพจน์, นับไม่ได้ = เอกพจน์)',
        examples: [
          { en: 'Some of the water is cold.', th: 'น้ำบางส่วนเย็น (นับไม่ได้ → เอกพจน์)', ok: true },
          { en: 'Some of the students are absent.', th: 'นักเรียนบางคนไม่มา (นับได้ → พหูพจน์)', ok: true },
        ],
      },
    ],
    tip: 'เทคนิคจำ: -one/-body/-thing + each/every/either/neither = เอกพจน์เกือบทั้งหมด',
  },
  'u1-n5': {
    nodeId: 'u1-n5',
    title: 'Collective Nouns',
    intro:
      'คำนามรวมกลุ่ม เช่น team, family, class, staff, committee มักใช้กริยาเอกพจน์ในภาษาอเมริกัน',
    sections: [
      {
        heading: '1. มองเป็นหน่วยเดียว → เอกพจน์',
        body: 'ภาษาอังกฤษอเมริกัน (ใช้ในข้อสอบส่วนใหญ่) มองว่า collective noun เป็นหน่วยเดียว',
        examples: [
          { en: 'The team is playing well today.', th: 'ทีมเล่นได้ดีวันนี้', ok: true },
          { en: 'My family lives in Bangkok.', th: 'ครอบครัวฉันอยู่ที่กรุงเทพฯ', ok: true },
        ],
      },
      {
        heading: '2. มองเป็นสมาชิกแยกกัน → พหูพจน์ (British)',
        body: 'ภาษาอังกฤษอังกฤษ (British English) มองสมาชิกภายในกลุ่มแยกกัน จึงใช้กริยาพหูพจน์ได้',
        examples: [
          { en: 'The team are arguing among themselves.', th: 'สมาชิกทีมกำลังทะเลาะกันเอง (แยกตัวบุคคล)', ok: true },
        ],
      },
      {
        heading: '3. ในข้อสอบ CEFR',
        body: 'โจทย์มาตรฐานส่วนใหญ่นิยม American English ให้ตอบเป็นเอกพจน์เมื่อเห็น team/family/class ทำหน้าที่เป็นประธานทั่วไป',
        examples: [
          { en: 'The committee has made a decision.', th: 'คณะกรรมการตัดสินใจแล้ว', ok: true },
        ],
      },
    ],
    tip: 'เทคนิคจำ: ทำข้อสอบไทย/CEFR → collective noun = เอกพจน์เป็นค่าตั้งต้น',
  },
  'u1-n6': {
    nodeId: 'u1-n6',
    title: 'Special Cases',
    intro: 'โครงสร้างพิเศษที่ออกสอบบ่อย แต่คนพลาดบ่อยที่สุด',
    sections: [
      {
        heading: '1. There is / There are',
        body: 'กริยาต้องตรงกับประธานจริงที่อยู่หลัง there',
        examples: [
          { en: 'There is a book on the desk.', th: 'มีหนังสือหนึ่งเล่มบนโต๊ะ', ok: true },
          { en: 'There are many books on the desk.', th: 'มีหนังสือหลายเล่มบนโต๊ะ', ok: true },
        ],
      },
      {
        heading: '2. ขัดจากประธานด้วยวลี (Prepositional phrases)',
        body: 'วลีระหว่างประธานกับกริยา ไม่มีผลต่อการเลือกกริยา — ให้ข้ามไปดูประธานตัวจริง',
        examples: [
          { en: 'The box of chocolates is on the table.', th: 'ประธานจริงคือ box (เอกพจน์) → is', ok: true },
          { en: 'The students in this class work hard.', th: 'ประธานจริงคือ students (พหูพจน์) → work', ok: true },
        ],
      },
      {
        heading: '3. ประธานเป็น clause หรือ gerund',
        body: 'ประโยค วลี หรือ gerund (V-ing) ทำหน้าที่เป็นประธาน ถือเป็นเอกพจน์',
        examples: [
          { en: 'Swimming is good exercise.', th: 'ว่ายน้ำเป็นการออกกำลังกายที่ดี', ok: true },
          { en: 'What she said was surprising.', th: 'สิ่งที่เธอพูดน่าประหลาดใจ', ok: true },
        ],
      },
      {
        heading: '4. Fractions & amounts',
        body: 'จำนวนเงิน ระยะทาง เวลา ที่มองเป็นผลรวมเดียว ใช้กริยาเอกพจน์',
        examples: [
          { en: 'Ten dollars is enough.', th: 'สิบดอลลาร์พอแล้ว (มองเป็นจำนวนเดียว)', ok: true },
          { en: 'Five kilometers is a long walk.', th: 'ห้ากิโลเมตรเป็นทางเดินที่ไกล', ok: true },
        ],
      },
    ],
    tip: 'เทคนิคจำ: ตัดวลีขวาง (of/in/to...) ออกก่อน แล้วดูว่าประธานจริงเป็นเอกพจน์หรือพหูพจน์',
  },
  'u1-n7': {
    nodeId: 'u1-n7',
    title: 'Unit Review',
    intro:
      'ทบทวนกฎทั้งหมดของยูนิต Subject-Verb Agreement ก่อนขึ้นเลเวลถัดไป',
    sections: [
      {
        heading: 'สรุปกฎทั้ง 6 ข้อ',
        body: 'เช็คลิสต์ทบทวนเร็ว:',
        examples: [
          { en: '1. เอกพจน์เติม s / พหูพจน์ไม่เติม s', th: 'She works · They work', ok: true },
          { en: '2. News/physics + uncountable = เอกพจน์', th: 'The news is good', ok: true },
          { en: '3. A and B = พหูพจน์ (ยกเว้นคน/สิ่งเดียวกัน)', th: 'Tom and Jerry are…', ok: true },
          { en: '4. or/nor → ดูประธานตัวใกล้กริยา', th: 'Neither A nor B are/is…', ok: true },
          { en: '5. Everyone/each/either/neither = เอกพจน์', th: 'Everybody likes…', ok: true },
          { en: '6. ตัดวลีขวางก่อนดูประธานจริง', th: 'The box of… is…', ok: true },
        ],
      },
    ],
    tip: 'พร้อมแล้ว? ลองทำแบบทดสอบยูนิตเพื่อปลดล็อกยูนิตถัดไป!',
  },
};
