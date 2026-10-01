// ============================================================
// Lesson content for each clickable node in the UnitsPath.
// Content keyed by node id (u{unitId}-n{index}).
// UI-first mock: replace with DB-backed lessons later.
// ============================================================

/**
 * Review content (UI Reference): one row inside a topic card.
 *  - left  = gray pill (Thai rule / source)
 *  - right = optional yellow result (English example). When absent the row
 *    renders as a standalone gray pill (Compare/Pattern variant).
 * Supports **bold** / ==highlight== inline markup via RichText.
 */
export interface ReviewRow {
  left: string;
  right?: string;
}

/** A practice question embedded in the explanation flow (separate from the exam). */
export interface LessonPracticeQuestion {
  sentence: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
}

export interface LessonPractice {
  questions: LessonPracticeQuestion[];
}

export interface LessonExample {
  en: string;
  th?: string;
  ok?: boolean;
}

export interface LessonTable {
  headers: string[];
  rows: string[][];
}

export type LessonSectionType = 'rule' | 'detailedRule' | 'importantNote' | 'practice';

/**
 * A configurable lesson section. Each item chooses its own presentation type,
 * and carries only the data needed by that block (legacy fields stay optional
 * so existing saved lessons remain readable/editable).
 */
export interface ReviewTopic {
  type?: LessonSectionType;
  heading?: string;
  body?: string;
  /** Yellow chip label for rule cards, e.g. "Past Simple: V.2" or "Does" */
  chip?: string;
  /** Description next to the chip (supports **bold** / ==highlight==) */
  description?: string;
  /** Pattern/example rows */
  rows?: ReviewRow[];
  examples?: LessonExample[];
  practice?: LessonPractice;
  tap?: TapExercise;
  /** Historical type marker accepted while normalizing older saved sections. */
  legacyType?: string;
  /** ℹ️ blue tip line at the card bottom (optional) */
  tip?: string;
}

export interface LessonSection extends ReviewTopic {}

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

/** Tap & Select — ฝึกแยกถูก/ผิด: each item has its own prompt + 2 editable choices */
export interface TapItem {
  prompt: string;
  choiceA: string;
  choiceB: string;
  /** index of the correct choice: 0 = choiceA, 1 = choiceB */
  correct: 0 | 1;
}

export interface TapExercise {
  title: string;
  items: TapItem[];
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
  /** Tap & Select pages rendered between the concept card and the real exam. */
  tapExercises?: TapExercise[];
  /** When true, Tap & Select is shown directly below the concept content. */
  tapInline?: boolean;
  nextNodeId?: number;
  nextNodeTitle?: string;
}

export const LESSONS: Record<string, LessonContent> = {
  'u1-n1': {
    nodeId: 'u1-n1',
    title: 'Basic Rules',
    intro:
      'หลักการพื้นฐานของ Subject-Verb Agreement คือ กริยาต้องเปลี่ยนรูปตามประธานว่าเป็นเอกพจน์ (singular) หรือพหูพจน์ (plural)',
    sections: [
      {
        chip: '1. ประธานเอกพจน์ → กริยาเติม s/es',
        rows: [
        { left: 'เธอทำงานที่โรงพยาบาล', right: 'She works at a hospital.' },
        { left: 'หมาเห่าดัง', right: 'The dog barks loudly.' },
        { left: 'ผิด — กริยาไม่เติม s ทั้งที่ประธานเอกพจน์', right: 'He work at a bank.' }
        ],
      },
      {
        chip: '2. ประธานพหูพจน์ → กริยาไม่เติม s',
        rows: [
        { left: 'พวกเขาเล่นฟุตบอลทุกสุดสัปดาห์', right: 'They play football every weekend.' },
        { left: 'พวกเราเรียนภาษาอังกฤษวันจันทร์', right: 'We study English on Mondays.' },
        { left: 'ผิด — ประธานเอกพจน์ต้องใช้ plays', right: 'She play tennis.' }
        ],
      },
      {
        chip: '3. การใช้ Do / Does ในคำถาม',
        rows: [
        { left: 'Do + you (ถูกต้อง)', right: 'Do you like coffee?' },
        { left: 'ประธานพหูพจน์ใช้ do', right: 'They do not play tennis.' },
        { left: 'ผิด — she เป็นเอกพจน์ ต้องใช้ Does she like…?', right: 'Do she like coffee?' }
        ],
      },
      {
        chip: '4. ใช้กับ Tense อื่น',
        rows: [
        { left: 'Past Simple ใช้ was/were แยกเอกพจน์-พหูพจน์', right: 'He was late. / They were late.' }
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
        chip: '1. ประธานที่ลงท้ายด้วย s แต่เป็นเอกพจน์',
        rows: [
        { left: 'ข่าววันนี้ดี (news = เอกพจน์)', right: 'The news is good today.' },
        { left: 'ฟิสิกส์เป็นวิชาโปรดของฉัน', right: 'Physics is my favorite subject.' }
        ],
      },
      {
        chip: '2. Uncountable nouns',
        rows: [
        { left: 'ข้อมูลมีประโยชน์มาก', right: 'The information is very useful.' },
        { left: 'คำแนะนำของเธอช่วยได้', right: 'Her advice was helpful.' }
        ],
      },
      {
        chip: '3. ประธานพหูพจน์ธรรมดา',
        rows: [
        { left: 'หนังสืออยู่บนโต๊ะ', right: 'The books are on the table.' },
        { left: 'เด็กๆ ชอบการ์ตูน', right: 'Children like cartoons.' }
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
        chip: '1. เชื่อมด้วย and → กริยาพหูพจน์',
        rows: [
        { left: 'ทอมกับเจอร์รี่เป็นเพื่อนกัน', right: 'Tom and Jerry are friends.' },
        { left: 'กาแฟกับชาเป็นเครื่องดื่มยอดนิยม', right: 'Coffee and tea are popular drinks.' }
        ],
      },
      {
        chip: '2. ข้อยกเว้น: คำเดียวกัน/แนวคิดเดียว',
        rows: [
        { left: 'เจ้าของที่เป็นผู้จัดการคนเดียวกันอยู่นี่ (คนเดียว)', right: 'The owner and manager is here.' },
        { left: 'ปลากับข้าวเป็นจานโปรด (ถือเป็นจานเดียว)', right: 'Fish and rice is her favorite dish.' }
        ],
      },
      {
        chip: '3. เชื่อมด้วย or / nor → ดูประธานตัวหลัง',
        rows: [
        { left: 'นักเรียน (พหูพจน์) อยู่ใกล้กริยา → ใช้ are', right: 'Neither the teacher nor the students are ready.' },
        { left: 'ครู (เอกพจน์) อยู่ใกล้กริยา → ใช้ is', right: 'Either the students or the teacher is ready.' }
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
        chip: '1. กลุ่ม -one, -body, -thing → เอกพจน์',
        rows: [
        { left: 'ทุกคนชอบพิซซ่า', right: 'Everybody likes pizza.' },
        { left: 'มีอะไรบางอย่างผิดปกติกับโทรศัพท์', right: 'Something is wrong with my phone.' }
        ],
      },
      {
        chip: '2. each, every, either, neither → เอกพจน์',
        rows: [
        { left: 'นักเรียนแต่ละคนมีหนังสือ (has ไม่ใช่ have)', right: 'Each of the students has a book.' },
        { left: 'ไม่มีคำตอบไหนถูก', right: 'Neither answer is correct.' }
        ],
      },
      {
        chip: '3. กลุ่มที่ขึ้นกับความหมาย',
        rows: [
        { left: 'น้ำบางส่วนเย็น (นับไม่ได้ → เอกพจน์)', right: 'Some of the water is cold.' },
        { left: 'นักเรียนบางคนไม่มา (นับได้ → พหูพจน์)', right: 'Some of the students are absent.' }
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
        chip: '1. มองเป็นหน่วยเดียว → เอกพจน์',
        rows: [
        { left: 'ทีมเล่นได้ดีวันนี้', right: 'The team is playing well today.' },
        { left: 'ครอบครัวฉันอยู่ที่กรุงเทพฯ', right: 'My family lives in Bangkok.' }
        ],
      },
      {
        chip: '2. มองเป็นสมาชิกแยกกัน → พหูพจน์ (British)',
        rows: [
        { left: 'สมาชิกทีมกำลังทะเลาะกันเอง (แยกตัวบุคคล)', right: 'The team are arguing among themselves.' }
        ],
      },
      {
        chip: '3. ในข้อสอบ CEFR',
        rows: [
        { left: 'คณะกรรมการตัดสินใจแล้ว', right: 'The committee has made a decision.' }
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
        chip: '1. There is / There are',
        rows: [
        { left: 'มีหนังสือหนึ่งเล่มบนโต๊ะ', right: 'There is a book on the desk.' },
        { left: 'มีหนังสือหลายเล่มบนโต๊ะ', right: 'There are many books on the desk.' }
        ],
      },
      {
        chip: '2. ขัดจากประธานด้วยวลี (Prepositional phrases)',
        rows: [
        { left: 'ประธานจริงคือ box (เอกพจน์) → is', right: 'The box of chocolates is on the table.' },
        { left: 'ประธานจริงคือ students (พหูพจน์) → work', right: 'The students in this class work hard.' }
        ],
      },
      {
        chip: '3. ประธานเป็น clause หรือ gerund',
        rows: [
        { left: 'ว่ายน้ำเป็นการออกกำลังกายที่ดี', right: 'Swimming is good exercise.' },
        { left: 'สิ่งที่เธอพูดน่าประหลาดใจ', right: 'What she said was surprising.' }
        ],
      },
      {
        chip: '4. Fractions & amounts',
        rows: [
        { left: 'สิบดอลลาร์พอแล้ว (มองเป็นจำนวนเดียว)', right: 'Ten dollars is enough.' },
        { left: 'ห้ากิโลเมตรเป็นทางเดินที่ไกล', right: 'Five kilometers is a long walk.' }
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
        chip: 'สรุปกฎทั้ง 6 ข้อ',
        rows: [
        { left: 'She works · They work', right: '1. เอกพจน์เติม s / พหูพจน์ไม่เติม s' },
        { left: 'The news is good', right: '2. News/physics + uncountable = เอกพจน์' },
        { left: 'Tom and Jerry are…', right: '3. A and B = พหูพจน์ (ยกเว้นคน/สิ่งเดียวกัน)' },
        { left: 'Neither A nor B are/is…', right: '4. or/nor → ดูประธานตัวใกล้กริยา' },
        { left: 'Everybody likes…', right: '5. Everyone/each/either/neither = เอกพจน์' },
        { left: 'The box of… is…', right: '6. ตัดวลีขวางก่อนดูประธานจริง' }
        ],
      },
    ],
    tip: 'พร้อมแล้ว? ลองทำแบบทดสอบยูนิตเพื่อปลดล็อกยูนิตถัดไป!',
  },
};
