export interface TapExerciseItem {
  prompt: string;
  choiceA: string;
  choiceB: string;
  correct: 0 | 1;
}

export interface TapExerciseData {
  title: string;
  hint?: string;
  items: TapExerciseItem[];
}

export interface ChoiceOption {
  key: string;
  value: string;
}

export interface ShuffledChoiceOption extends ChoiceOption {
  answerKey: string;
}

export type TapChoiceKey = 'A' | 'B';
export type TapChoiceOrder = readonly [TapChoiceKey, TapChoiceKey];

export type PublicTapExerciseData = Omit<TapExerciseData, 'items'> & {
  items: Array<Omit<TapExerciseItem, 'correct'>>;
};

export interface ArticleBlankData {
  id: number;
  correctAnswer: string;
  hint?: string;
}

export interface TestSetQuestionLike {
  id: number;
  testTypeId?: string;
  correctAnswer?: string | null;
  article?: { title: string; text: string; blanks: ArticleBlankData[] } | null;
  tapExercise?: TapExerciseData | PublicTapExerciseData | null;
}

export type TestSetSlot =
  | { questionIndex: number; kind: 'question' }
  | { questionIndex: number; kind: 'tap'; itemIndex: number }
  | { questionIndex: number; kind: 'article'; blankId: number };

function seededRandom(seed: string): () => number {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shuffle displayed choices deterministically while retaining each original answer key. */
export function shuffleChoiceOptions(options: ChoiceOption[], seed: string): ShuffledChoiceOption[] {
  const shuffled = options.map(option => ({ ...option }));
  const random = seededRandom(seed);
  for (let index = shuffled.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  if (shuffled.length > 1 && shuffled.every((option, index) => option.key === options[index].key)) {
    shuffled.push(shuffled.shift()!);
  }
  return shuffled.map((option, index) => ({
    ...option,
    key: options[index]?.key ?? option.key,
    answerKey: option.key,
  }));
}

export function shuffleTapExerciseChoices(
  item: Omit<TapExerciseItem, 'correct'> & { correct?: 0 | 1 },
  seed: string
): { item: Omit<TapExerciseItem, 'correct'> & { correct?: 0 | 1 }; answerKeys: TapChoiceOrder } {
  const choices = shuffleChoiceOptions([
    { key: 'A', value: item.choiceA },
    { key: 'B', value: item.choiceB },
  ], seed);
  const answerKeys: TapChoiceOrder = [choices[0].answerKey as TapChoiceKey, choices[1].answerKey as TapChoiceKey];
  const correctKey = item.correct === undefined ? undefined : item.correct === 0 ? 'A' : 'B';
  const correct = correctKey === undefined ? undefined : answerKeys.indexOf(correctKey) as 0 | 1;
  return {
    item: { ...item, choiceA: choices[0].value, choiceB: choices[1].value, correct },
    answerKeys,
  };
}

export function getDisplayedTapChoiceAnswer(answerKey: string | null, answerKeys: TapChoiceOrder): string | null {
  if (answerKey === null) return null;
  const index = answerKeys.indexOf(answerKey as TapChoiceKey);
  return index < 0 ? answerKey : index === 0 ? 'A' : 'B';
}

export function getOriginalTapChoiceAnswer(displayedKey: string, answerKeys: TapChoiceOrder): string {
  return answerKeys[displayedKey === 'A' ? 0 : 1] ?? displayedKey;
}

export function createQuestionChoiceOptions(
  options: Array<{ key: string; value: string | null | undefined }>,
  seed: string,
  shuffle: boolean
): ShuffledChoiceOption[] {
  const available = options.filter((option): option is { key: string; value: string } => Boolean(option.value));
  if (shuffle) return shuffleChoiceOptions(available, seed);
  return available.map(option => ({ ...option, answerKey: option.key }));
}

export function getDisplayedChoiceAnswer(answerKey: string | null, options: ShuffledChoiceOption[]): string | null {
  if (answerKey === null) return null;
  return options.find(option => option.answerKey === answerKey)?.key ?? answerKey;
}

export function getOriginalChoiceAnswer(displayedKey: string, options: ShuffledChoiceOption[]): string {
  return options.find(option => option.key === displayedKey)?.answerKey ?? displayedKey;
}

/**
 * แปลง answer key ที่บันทึกไว้ (A/B/C/D ต้นฉบับในฐานข้อมูล) กลับเป็นข้อความคำตอบจริง
 * ใช้ในหน้า result เพื่อแสดง “คำตอบที่เลือก” เป็นข้อความ ไม่ใช่ตัวอักษร A–D
 */
export function getChoiceOptionText(
  question: {
    optionA?: string | null;
    optionB?: string | null;
    optionC?: string | null;
    optionD?: string | null;
  },
  key: string | null | undefined
): string | null {
  if (!key) return null;
  const text: Record<string, string | null | undefined> = {
    A: question.optionA,
    B: question.optionB,
    C: question.optionC,
    D: question.optionD,
  };
  if (!(key in text)) return key;
  return text[key] ?? key;
}

/** Preserve set order while expanding each Tap item or form-meaning blank into a question slot. */
export function expandTestSetSlots(questions: TestSetQuestionLike[]): TestSetSlot[] {
  return questions.flatMap<TestSetSlot>((question, questionIndex) => {
    const tapItems = question.tapExercise?.items;
    if (tapItems?.length) {
      return tapItems.map((_, itemIndex) => ({ questionIndex, kind: 'tap' as const, itemIndex }));
    }
    if (question.testTypeId === 'form-meaning' && question.article?.blanks.length) {
      return question.article.blanks.map((blank) => ({ questionIndex, kind: 'article' as const, blankId: blank.id }));
    }
    return [{ questionIndex, kind: 'question' as const }];
  });
}

/** Build one API answer per database question, packing Tap items and article blanks as JSON. */
export function buildTestSubmissionAnswers<T extends TestSetQuestionLike>(
  questions: T[],
  slots: TestSetSlot[],
  slotAnswers: Array<string | null>,
  transformAnswer?: (question: T, slot: TestSetSlot, answer: string) => string
): { questionId: number; selectedAnswer: string }[] {
  return questions.map((question, questionIndex) => {
    const itemAnswers: Record<string, string> = {};
    let regularAnswer = '';

    slots.forEach((slot, slotIndex) => {
      if (slot.questionIndex !== questionIndex) return;
      const answer = slotAnswers[slotIndex] ?? '';
      const transformedAnswer = transformAnswer && answer ? transformAnswer(question, slot, answer) : answer;
      if (slot.kind === 'question') regularAnswer = transformedAnswer;
      else if (slot.kind === 'tap' && transformedAnswer) itemAnswers[String(slot.itemIndex)] = transformedAnswer;
      else if (slot.kind === 'article' && transformedAnswer) itemAnswers[String(slot.blankId)] = transformedAnswer;
    });

    return {
      questionId: question.id,
      selectedAnswer: question.tapExercise?.items?.length || question.testTypeId === 'form-meaning'
        ? JSON.stringify(itemAnswers)
        : regularAnswer,
    };
  });
}

export function countTestSetItems(questions: TestSetQuestionLike[]): number {
  return expandTestSetSlots(questions).length;
}

/** Find incorrect virtual slots on the server without returning answer keys. */
export function findIncorrectTestSetSlots(
  questions: TestSetQuestionLike[],
  slots: TestSetSlot[],
  submittedAnswers: Array<{ questionId: number; selectedAnswer: string }>
): number[] {
  const answersByQuestion = new Map(submittedAnswers.map(answer => [answer.questionId, answer.selectedAnswer]));

  return slots.flatMap((slot, slotIndex) => {
    const question = questions[slot.questionIndex];
    const rawAnswer = answersByQuestion.get(question.id) ?? '';
    let selectedAnswer = rawAnswer;
    let correctAnswer = question.correctAnswer ?? '';

    if (slot.kind === 'tap') {
      let parsed: Record<string, string> = {};
      try { parsed = JSON.parse(rawAnswer); } catch { /* missing/invalid answer is wrong */ }
      selectedAnswer = parsed[String(slot.itemIndex)] ?? '';
      const item = question.tapExercise?.items[slot.itemIndex];
      correctAnswer = item && 'correct' in item ? (item.correct === 0 ? 'A' : 'B') : '';
    } else if (slot.kind === 'article') {
      let parsed: Record<string, string> = {};
      try { parsed = JSON.parse(rawAnswer); } catch { /* missing/invalid answer is wrong */ }
      selectedAnswer = parsed[String(slot.blankId)] ?? '';
      correctAnswer = question.article?.blanks.find(blank => blank.id === slot.blankId)?.correctAnswer ?? '';
    }

    const normalize = (value: string) => value.trim().toLocaleLowerCase();
    return normalize(selectedAnswer) === normalize(correctAnswer) ? [] : [slotIndex];
  });
}
