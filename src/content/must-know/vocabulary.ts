// Vocabulary content organized by CEFR level and topic

export interface VocabularyItem {
  id: string;
  word: string;
  phonetic?: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  thaiMeaning: string;
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  topic: string;
}

export const vocabularyContent: VocabularyItem[] = [
  // A1 - Basic everyday vocabulary
  {
    id: 'a1-family',
    word: 'family',
    phonetic: '/ˈfæm.əl.i/',
    partOfSpeech: 'noun',
    definition: 'A group of people related by blood or marriage',
    example: 'I have a large family with three brothers and two sisters.',
    thaiMeaning: 'ครอบครัว',
    cefrLevel: 'A1',
    topic: 'Family',
  },
  {
    id: 'a1-house',
    word: 'house',
    phonetic: '/haʊs/',
    partOfSpeech: 'noun',
    definition: 'A building for human habitation',
    example: 'They bought a new house near the park.',
    thaiMeaning: 'บ้าน',
    cefrLevel: 'A1',
    topic: 'Home',
  },
  {
    id: 'a1-eat',
    word: 'eat',
    phonetic: '/iːt/',
    partOfSpeech: 'verb',
    definition: 'To consume food',
    example: 'We eat dinner at 7 PM every day.',
    thaiMeaning: 'กิน',
    cefrLevel: 'A1',
    topic: 'Food',
  },
  {
    id: 'a1-happy',
    word: 'happy',
    phonetic: '/ˈhæp.i/',
    partOfSpeech: 'adjective',
    definition: 'Feeling or showing pleasure',
    example: 'She looks very happy today.',
    thaiMeaning: 'มีความสุข',
    cefrLevel: 'A1',
    topic: 'Emotions',
  },

  // A2 - Elementary
  {
    id: 'a2-weather',
    word: 'weather',
    phonetic: '/ˈweð.ər/',
    partOfSpeech: 'noun',
    definition: 'The state of the atmosphere at a place and time',
    example: 'The weather is sunny and warm today.',
    thaiMeaning: 'สภาพอากาศ',
    cefrLevel: 'A2',
    topic: 'Nature',
  },
  {
    id: 'a2-shopping',
    word: 'shopping',
    phonetic: '/ˈʃɒp.ɪŋ/',
    partOfSpeech: 'noun',
    definition: 'The activity of buying goods from shops',
    example: 'I do my grocery shopping on weekends.',
    thaiMeaning: 'การช้อปปิ้ง',
    cefrLevel: 'A2',
    topic: 'Daily Life',
  },
  {
    id: 'a2-decide',
    word: 'decide',
    phonetic: '/dɪˈsaɪd/',
    partOfSpeech: 'verb',
    definition: 'To make a choice or judgment',
    example: 'She decided to study abroad next year.',
    thaiMeaning: 'ตัดสินใจ',
    cefrLevel: 'A2',
    topic: 'Actions',
  },

  // B1 - Intermediate
  {
    id: 'b1-achieve',
    word: 'achieve',
    phonetic: '/əˈtʃiːv/',
    partOfSpeech: 'verb',
    definition: 'To successfully complete or accomplish something',
    example: 'He achieved his goal of running a marathon.',
    thaiMeaning: 'บรรลุผลสำเร็จ',
    cefrLevel: 'B1',
    topic: 'Success',
  },
  {
    id: 'b1-environment',
    word: 'environment',
    phonetic: '/ɪnˈvaɪ.rən.mənt/',
    partOfSpeech: 'noun',
    definition: 'The surroundings or conditions in which a person lives',
    example: 'We should protect the environment for future generations.',
    thaiMeaning: 'สิ่งแวดล้อม',
    cefrLevel: 'B1',
    topic: 'Nature',
  },
  {
    id: 'b1-opportunity',
    word: 'opportunity',
    phonetic: '/ˌɒp.əˈtjuː.nə.ti/',
    partOfSpeech: 'noun',
    definition: 'A set of circumstances that makes it possible to do something',
    example: 'This job is a great opportunity for career growth.',
    thaiMeaning: 'โอกาส',
    cefrLevel: 'B1',
    topic: 'Work',
  },

  // B2 - Upper Intermediate
  {
    id: 'b2-significant',
    word: 'significant',
    phonetic: '/sɪɡˈnɪf.ɪ.kənt/',
    partOfSpeech: 'adjective',
    definition: 'Sufficiently great or important to be worthy of attention',
    example: 'There was a significant improvement in his performance.',
    thaiMeaning: 'สำคัญ, มีนัยสำคัญ',
    cefrLevel: 'B2',
    topic: 'Academic',
  },
  {
    id: 'b2-perspective',
    word: 'perspective',
    phonetic: '/pəˈspek.tɪv/',
    partOfSpeech: 'noun',
    definition: 'A particular attitude toward or way of regarding something',
    example: 'Traveling gives you a new perspective on life.',
    thaiMeaning: 'มุมมอง, แนวคิด',
    cefrLevel: 'B2',
    topic: 'Thinking',
  },
  {
    id: 'b2-sustain',
    word: 'sustain',
    phonetic: '/səˈsteɪn/',
    partOfSpeech: 'verb',
    definition: 'To strengthen or support physically or mentally',
    example: 'The company needs to sustain its growth over the next decade.',
    thaiMeaning: 'ค้ำจุน, รักษาไว้',
    cefrLevel: 'B2',
    topic: 'Business',
  },

  // C1 - Advanced
  {
    id: 'c1-inevitable',
    word: 'inevitable',
    phonetic: '/ɪˈnev.ɪ.tə.bəl/',
    partOfSpeech: 'adjective',
    definition: 'Certain to happen; unavoidable',
    example: 'Change is inevitable in any organization.',
    thaiMeaning: 'หลีกเลี่ยงไม่ได้',
    cefrLevel: 'C1',
    topic: 'Abstract',
  },
  {
    id: 'c1-ambiguous',
    word: 'ambiguous',
    phonetic: '/æmˈbɪɡ.ju.əs/',
    partOfSpeech: 'adjective',
    definition: 'Open to more than one interpretation; unclear',
    example: 'The contract language was deliberately ambiguous.',
    thaiMeaning: 'คลุมเครือ, กำกวม',
    cefrLevel: 'C1',
    topic: 'Academic',
  },
  {
    id: 'c1-mitigate',
    word: 'mitigate',
    phonetic: '/ˈmɪt.ɪ.ɡeɪt/',
    partOfSpeech: 'verb',
    definition: 'To make less severe or painful',
    example: 'Planting trees can help mitigate climate change.',
    thaiMeaning: 'บรรเทา, ลดน้อยลง',
    cefrLevel: 'C1',
    topic: 'Formal',
  },

  // C2 - Proficiency
  {
    id: 'c2-ubiquitous',
    word: 'ubiquitous',
    phonetic: '/juːˈbɪk.wɪ.təs/',
    partOfSpeech: 'adjective',
    definition: 'Present, appearing, or found everywhere',
    example: 'Smartphones have become ubiquitous in modern society.',
    thaiMeaning: 'มีอยู่ทุกที่',
    cefrLevel: 'C2',
    topic: 'Academic',
  },
  {
    id: 'c2-ephemeral',
    word: 'ephemeral',
    phonetic: '/ɪˈfem.ər.əl/',
    partOfSpeech: 'adjective',
    definition: 'Lasting for a very short time',
    example: 'Fashion trends are often ephemeral.',
    thaiMeaning: 'ชั่วคราว, ไม่ยั่งยืน',
    cefrLevel: 'C2',
    topic: 'Literary',
  },
];

export const vocabularyTopics = [
  'Family',
  'Home',
  'Food',
  'Emotions',
  'Nature',
  'Daily Life',
  'Actions',
  'Success',
  'Work',
  'Academic',
  'Thinking',
  'Business',
  'Abstract',
  'Formal',
  'Literary',
];
