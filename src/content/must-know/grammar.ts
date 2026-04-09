// Grammar content organized by CEFR level

export interface GrammarPoint {
  id: string;
  title: string;
  description: string;
  examples: string[];
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  category: string;
}

export const grammarContent: GrammarPoint[] = [
  // A1 - Beginner
  {
    id: 'a1-present-simple',
    title: 'Present Simple',
    description: 'ใช้พูดถึงความจริง นิสัย หรือการกระทำที่ทำเป็นประจำ',
    examples: [
      'I work every day.',
      'She likes coffee.',
      'They live in Bangkok.',
    ],
    cefrLevel: 'A1',
    category: 'Tenses',
  },
  {
    id: 'a1-to-be',
    title: 'Verb "to be" (am/is/are)',
    description: 'กริยา "เป็น/อยู่/คือ" ใช้เชื่อมประธานกับส่วนขยาย',
    examples: [
      'I am a student.',
      'She is happy.',
      'They are at home.',
    ],
    cefrLevel: 'A1',
    category: 'Tenses',
  },
  {
    id: 'a1-articles',
    title: 'Articles (a/an/the)',
    description: 'คำนำหน้าคำนาม - a/an สำหรับทั่วไป, the สำหรับเจาะจง',
    examples: [
      'I have a cat.',
      'She is an engineer.',
      'The sun is bright.',
    ],
    cefrLevel: 'A1',
    category: 'Nouns',
  },
  {
    id: 'a1-plurals',
    title: 'Plural Nouns',
    description: 'พหูพจน์ - เติม -s หรือ -es ท้ายคำนาม',
    examples: [
      'one book → two books',
      'a box → three boxes',
      'a baby → babies',
    ],
    cefrLevel: 'A1',
    category: 'Nouns',
  },

  // A2 - Elementary
  {
    id: 'a2-past-simple',
    title: 'Past Simple',
    description: 'ใช้พูดถึงการกระทำที่เกิดขึ้นและจบลงแล้วในอดีต',
    examples: [
      'I visited Paris last year.',
      'She didn\'t come to work yesterday.',
      'Did you see the movie?',
    ],
    cefrLevel: 'A2',
    category: 'Tenses',
  },
  {
    id: 'a2-future-will',
    title: 'Future with "will"',
    description: 'ใช้พูดถึงอนาคต การตัดสินใจขณะพูด หรือคำทำนาย',
    examples: [
      'I will call you later.',
      'It will rain tomorrow.',
      'She will be 30 next month.',
    ],
    cefrLevel: 'A2',
    category: 'Tenses',
  },
  {
    id: 'a2-comparatives',
    title: 'Comparatives',
    description: 'การเปรียบเทียบขั้นกว่า - เติม -er หรือใช้ more',
    examples: [
      'She is taller than me.',
      'This book is more interesting than that one.',
      'He runs faster than his brother.',
    ],
    cefrLevel: 'A2',
    category: 'Adjectives',
  },
  {
    id: 'a2-modals',
    title: 'Modal Verbs (can/could/should/must)',
    description: 'กริยาช่วยแสดงความสามารถ ความเป็นไปได้ ความจำเป็น',
    examples: [
      'I can swim.',
      'You should study harder.',
      'She must finish her homework.',
    ],
    cefrLevel: 'A2',
    category: 'Verbs',
  },

  // B1 - Intermediate
  {
    id: 'b1-present-perfect',
    title: 'Present Perfect',
    description: 'ใช้พูดถึงการกระทำที่เกิดขึ้นในอดีตแต่ยังเกี่ยวข้องกับปัจจุบัน',
    examples: [
      'I have lived here for 5 years.',
      'She has never been to Japan.',
      'Have you finished your work?',
    ],
    cefrLevel: 'B1',
    category: 'Tenses',
  },
  {
    id: 'b1-conditionals-1-2',
    title: 'Conditionals (Type 1 & 2)',
    description: 'ประโยคเงื่อนไข - Type 1 เป็นไปได้จริง, Type 2 เป็นไปได้ยาก',
    examples: [
      'If it rains, I will stay home. (Type 1)',
      'If I won the lottery, I would travel. (Type 2)',
      'She would quit if she were unhappy. (Type 2)',
    ],
    cefrLevel: 'B1',
    category: 'Conditionals',
  },
  {
    id: 'b1-passive-voice',
    title: 'Passive Voice',
    description: 'ประโยคถูกกระทำ - เน้นที่ผู้ถูกกระทำมากกว่าผู้กระทำ',
    examples: [
      'The book was written by J.K. Rowling.',
      'English is spoken here.',
      'The meeting will be held tomorrow.',
    ],
    cefrLevel: 'B1',
    category: 'Voice',
  },

  // B2 - Upper Intermediate
  {
    id: 'b2-present-perfect-continuous',
    title: 'Present Perfect Continuous',
    description: 'เน้นการกระทำที่เริ่มในอดีตและดำเนินต่อเนื่องถึงปัจจุบัน',
    examples: [
      'I have been studying for 3 hours.',
      'She has been working here since 2020.',
      'They have been waiting since morning.',
    ],
    cefrLevel: 'B2',
    category: 'Tenses',
  },
  {
    id: 'b2-reported-speech',
    title: 'Reported Speech',
    description: 'การพูดรายงาน - เปลี่ยน tense และคำแสดงเวลา',
    examples: [
      'He said he was tired.',
      'She told me she would come.',
      'They said they had finished the work.',
    ],
    cefrLevel: 'B2',
    category: 'Speech',
  },
  {
    id: 'b2-relative-clauses',
    title: 'Relative Clauses',
    description: 'อนุประโยคสัมพัทธ์ - ใช้ who/which/that/whose/whom',
    examples: [
      'The man who lives next door is friendly.',
      'This is the book that I recommended.',
      'She has a friend whose father is a doctor.',
    ],
    cefrLevel: 'B2',
    category: 'Clauses',
  },

  // C1 - Advanced
  {
    id: 'c1-inversion',
    title: 'Inversion',
    description: 'การสลับตำแหน่งกริยากับประธานเพื่อเน้นความ',
    examples: [
      'Never have I seen such a beautiful sunset.',
      'Not only did he forget the gift, but he also arrived late.',
      'Hardly had I sat down when the phone rang.',
    ],
    cefrLevel: 'C1',
    category: 'Advanced Structures',
  },
  {
    id: 'c1-subjunctive',
    title: 'Subjunctive Mood',
    description: 'การใช้ subjunctive แสดงความต้องการ คำแนะนำ',
    examples: [
      'I suggest that he study harder.',
      'It is important that she be on time.',
      'I demand that he leave immediately.',
    ],
    cefrLevel: 'C1',
    category: 'Advanced Structures',
  },
];

export const grammarCategories = [
  'Tenses',
  'Nouns',
  'Adjectives',
  'Verbs',
  'Conditionals',
  'Voice',
  'Speech',
  'Clauses',
  'Advanced Structures',
];
