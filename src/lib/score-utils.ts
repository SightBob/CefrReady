/**
 * Scoring utilities for REGULAR (non-adaptive) section tests.
 *
 * NOTE: The adaptive full-test feature uses its own scoring logic in
 * `src/lib/full-test/submit-attempt.ts` which incorporates CEFR weights
 * and per-blank granularity. Do not mix these two systems.
 */

interface Answer {
  questionId: number;
  selectedAnswer: string;
}

interface ArticleBlank {
  id: number;
  correctAnswer: string;
  hint?: string;
}

interface DbQuestion {
  id: number;
  testTypeId?: string;
  correctAnswer: string | null;
  explanation: string | null;
  article?: unknown;
  tapExercise?: {
    title: string;
    hint?: string;
    items: { prompt: string; choiceA: string; choiceB: string; correct: 0 | 1 }[];
  } | null;
}

interface ScoreResult {
  questionId: number;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string | null;
  explanation: string | null;
}

interface ScoreCalculation {
  results: ScoreResult[];
  correctCount: number;
  totalQuestions: number;
  score: number;
}

/**
 * เทียบคำตอบที่ผู้ใช้พิมพ์เอง — เครื่องหมายและช่องว่างที่พิมพ์ไม่ควรตัดสินถูกผิด
 *
 * มือถือใส่ apostrophe โค้ง (’) ให้อัตโนมัติ: ผู้เรียนตอบ i’m แต่เฉลยเก็บ i'm
 * ระบบเดิมตัดสินว่าผิด (พ.ย. 2026 ข้อ 1984 มี 19 คำตอบที่ถูกแต่ถูกให้ 0 คะแนน)
 * จงใจไม่แตะความหมายของคำ: is ≠ are, was ≠ were ยังต้องผิดตามเดิม
 */
export function normalizeFreeText(value: string): string {
  return value
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** JSON answers must be a string record, never null, an array or numeric values. */
export function parseStructuredAnswer(value: string): Record<string, string> | null {
  if (value.trim() === '') return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    if (Object.values(parsed).some((entry) => typeof entry !== 'string')) return null;
    return parsed as Record<string, string>;
  } catch {
    return null;
  }
}

/**
 * นับ "ชิ้นคำตอบ" ที่ผู้เรียนตอบจริงจาก selectedAnswer หนึ่งค่า
 *
 * ปกติ 1 ข้อ = 1 คำตอบ แต่ Tap & Select และบทความเติมคำส่งเป็น JSON
 * (คีย์ = item/blank) จึงต้องนับรายชิ้น ไม่ใช่รายข้อ — ไม่งั้น answered_count
 * จะเป็น 1 ทั้งที่ตอบไป 8 ช่อง
 */
export function countAnsweredItems(userAnswer: string): number {
  const raw = (userAnswer ?? '').trim();
  if (!raw) return 0;
  if (raw.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return Object.values(parsed as Record<string, unknown>).filter(
          (value) => typeof value === 'string' && value.trim() !== '',
        ).length;
      }
    } catch {
      // ไม่ใช่ JSON ที่สมบูรณ์ — นับเป็น 1 ชิ้นตามที่ผู้เรียนส่งมา
    }
  }
  return 1;
}

/**
 * Calculates score from submitted answers against DB questions.
 * For form-meaning, selectedAnswer is JSON-encoded per-blank answers
 * (e.g. {"1":"running","2":"is"}) and scoring is done per-blank.
 */
export function calculateScore(
  answers: Answer[],
  dbQuestions: DbQuestion[]
): ScoreCalculation {
  let correctCount = 0;
  let totalItems = 0;

  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.selectedAnswer]));
  if (answerMap.size !== answers.length) throw new Error('Duplicate question IDs');
  if (answers.some((answer) => !dbQuestions.some((question) => question.id === answer.questionId))) {
    throw new Error('Unknown question IDs');
  }
  // The server's question list is authoritative, including unanswered questions.
  const results: ScoreResult[] = dbQuestions.map((question) => {
    const answer = { questionId: question.id, selectedAnswer: answerMap.get(question.id) ?? '' };

    // Tap & Select: selectedAnswer is JSON keyed by item index; each item counts independently.
    if (question.tapExercise?.items?.length) {
      const parsedAnswers = parseStructuredAnswer(answer.selectedAnswer) ?? {};
      let itemCorrect = 0;
      const correctJson: Record<string, string> = {};
      question.tapExercise.items.forEach((item, index) => {
        totalItems++;
        const correctKey = item.correct === 0 ? 'A' : 'B';
        correctJson[String(index)] = correctKey;
        if ((parsedAnswers[String(index)] ?? '').trim().toUpperCase() === correctKey) {
          correctCount++;
          itemCorrect++;
        }
      });
      return {
        questionId: answer.questionId,
        isCorrect: itemCorrect === question.tapExercise.items.length,
        userAnswer: answer.selectedAnswer,
        correctAnswer: JSON.stringify(correctJson),
        explanation: question.explanation,
      };
    }

    // Form-meaning: score per-blank using article.blanks
    if (question.testTypeId === 'form-meaning' && question.article) {
      const art = question.article as { title: string; text: string; blanks: ArticleBlank[] };
      let blankCorrect = 0;
      const parsedAnswers = parseStructuredAnswer(answer.selectedAnswer) ?? {};

      const correctJson: Record<string, string> = {};
      art.blanks.forEach((blank) => {
        totalItems++;
        correctJson[String(blank.id)] = blank.correctAnswer;
        const userAns = normalizeFreeText(parsedAnswers[String(blank.id)] ?? '');
        if (userAns && userAns === normalizeFreeText(blank.correctAnswer)) {
          blankCorrect++;
          correctCount++;
        }
      });

      return {
        questionId: answer.questionId,
        isCorrect: blankCorrect === art.blanks.length,
        userAnswer: answer.selectedAnswer,
        correctAnswer: JSON.stringify(correctJson),
        explanation: question.explanation,
      };
    }

    // MCQ types: direct string comparison
    totalItems++;
    const isCorrect = !!question.correctAnswer?.trim() && normalizeFreeText(answer.selectedAnswer) === normalizeFreeText(question.correctAnswer);
    if (isCorrect) correctCount++;

    return {
      questionId: answer.questionId,
      isCorrect,
      userAnswer: answer.selectedAnswer,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
    };
  });

  const score = totalItems > 0 ? (correctCount / totalItems) * 100 : 0;

  return { results, correctCount, totalQuestions: totalItems, score };
}
