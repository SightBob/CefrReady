/**
 * รูปแบบและตัวตรวจของ draft — แยกจาก test-draft.ts เพื่อให้เทสต์ได้โดยไม่ต้องมี DATABASE_URL
 * (test-draft.ts import db ซึ่ง throw ทันทีเมื่อไม่มี env)
 */
const MAX_ANSWERS = 500;
const MAX_ANSWER_LENGTH = 2000;
const MAX_CHECKED = 500;
const MAX_SEED_LENGTH = 200;

export type DraftAnswerCheck = {
  isCorrect: boolean;
  correctKey: string | null;
  correctText: string | null;
  explanation: string | null;
  answerProof: string | null;
  aiTutorReady: boolean | null;
};

export type TestDraft = {
  index: number;
  answers: (string | null)[];
  checked: Record<number, DraftAnswerCheck>;
  /** ลำดับตัวเลือกของรอบนี้ — ต้องคงเดิม ไม่งั้นป้ายคำตอบชี้ไปคนละตัวเลือก */
  choiceSeed: string | null;
};

function isIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function asText(value: unknown): string | null {
  return typeof value === 'string' ? value.slice(0, MAX_ANSWER_LENGTH) : null;
}

/** ตรวจ + ตัดค่าที่ผิดรูปทิ้ง — คืน null เมื่อ body ใช้ไม่ได้เลย */
export function sanitizeDraft(raw: unknown): TestDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  if (!isIndex(value.index)) return null;

  const answers = Array.isArray(value.answers)
    ? value.answers.slice(0, MAX_ANSWERS).map((entry) => asText(entry))
    : [];

  const checked: Record<number, DraftAnswerCheck> = {};
  if (value.checked && typeof value.checked === 'object') {
    for (const [rawIndex, entry] of Object.entries(value.checked as Record<string, unknown>).slice(0, MAX_CHECKED)) {
      const index = Number.parseInt(rawIndex, 10);
      if (!isIndex(index) || !entry || typeof entry !== 'object') continue;
      const check = entry as Record<string, unknown>;
      if (typeof check.isCorrect !== 'boolean') continue;
      checked[index] = {
        isCorrect: check.isCorrect,
        correctKey: asText(check.correctKey),
        correctText: asText(check.correctText),
        explanation: asText(check.explanation),
        answerProof: asText(check.answerProof),
        aiTutorReady: typeof check.aiTutorReady === 'boolean' ? check.aiTutorReady : null,
      };
    }
  }

  const seed = asText(value.choiceSeed);
  return {
    index: value.index,
    answers,
    checked,
    choiceSeed: seed ? seed.slice(0, MAX_SEED_LENGTH) : null,
  };
}
