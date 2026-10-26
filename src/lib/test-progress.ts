/**
 * ความคืบหน้าของชุดข้อสอบ — เก็บใน sessionStorage
 * เพื่อให้ **refresh แล้วกลับมาที่ข้อเดิม พร้อมคำตอบและเฉลยที่เปิดดูแล้ว**
 * (ตำแหน่งข้อ: ผู้ใช้กำหนด 2026-10-25 · คำตอบ/สถานะเฉลย: 2026-10-25)
 *
 * - หน้าสอบอ่านค่าตอน mount / เปลี่ยนชุด → เริ่มที่ข้อที่ค้างไว้ พร้อมคำตอบเดิม
 * - เขียนทุกครั้งที่ผู้เรียนเปลี่ยนข้อหรือตอบ/ตรวจข้อ
 * - หนึ่งแท็บต่อหนึ่งชุด · ไม่มีข้อมูลผู้ใช้ · หายเองเมื่อปิดแท็บ
 *
 * ค่าที่มีอยู่ยังใช้เป็นสัญญาณว่า "ชุดนี้เริ่มทำแล้ว" → หน้าสอบจะไม่เด้งไปหน้า
 * /explain ซ้ำ (การ refresh จึงอยู่ที่ข้อเดิมเสมอ ไม่กระโดดออกจากหน้า)
 *
 * รูปแบบที่เก็บเป็น JSON v2 — ของเดิมเคยเก็บเป็นเลขดัชนีเดี่ยว ๆ ซึ่งอ่านได้
 * เช่นเดิม (ตอบ/เฉลยว่าง) จึงไม่ต้องย้ายข้อมูลเก่าของใคร
 */

const KEY_PREFIX = 'cefr_set_progress_';
const BLANKS_KEY_PREFIX = 'cefr_set_blanks_';
const CHOICE_SEED_KEY_PREFIX = 'cefr_set_choice_seed_';

/** เพดานกันค่าที่เสียหาย/ถูกแก้จาก devtools ไม่ให้บวมจน sessionStorage เต็ม */
const MAX_ANSWERS = 500;
const MAX_ANSWER_LENGTH = 2000;
const MAX_CHECKED = 500;

/** ผลตรวจคำตอบที่เก็บไว้ (โครงเดียวกับ AnswerCheck ในหน้า /tests/[sectionId]/[setId]) */
export type SavedAnswerCheck = {
  isCorrect: boolean;
  correctKey: string | null;
  correctText: string | null;
  explanation: string | null;
  answerProof?: string | null;
  aiTutorReady?: boolean | null;
};

export type TestProgressState = {
  index: number;
  /** คำตอบต่อ slot (index = ลำดับ slot ในชุด) */
  answers: (string | null)[];
  /** slot ที่เปิดเฉลยแล้ว (index = ลำดับ slot) */
  checked: Record<number, SavedAnswerCheck>;
};

function key(sectionId: string, setId: number | string): string {
  return `${KEY_PREFIX}${sectionId}-${setId}`;
}

function blanksKey(sectionId: string, setId: number | string): string {
  return `${BLANKS_KEY_PREFIX}${sectionId}-${setId}`;
}

function isIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** แปลงคำตอบที่เก็บไว้ให้อยู่ในรูปที่เชื่อถือได้ (ตัดค่าที่ผิดรูปทิ้ง) */
function normalizeAnswers(raw: unknown): (string | null)[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_ANSWERS).map((value) =>
    typeof value === 'string' ? value.slice(0, MAX_ANSWER_LENGTH) : null,
  );
}

function normalizeChecked(raw: unknown): Record<number, SavedAnswerCheck> {
  if (!raw || typeof raw !== 'object') return {};
  const entries = Object.entries(raw as Record<string, unknown>).slice(0, MAX_CHECKED);
  const checked: Record<number, SavedAnswerCheck> = {};
  for (const [rawIndex, value] of entries) {
    const index = Number.parseInt(rawIndex, 10);
    if (!isIndex(index) || !value || typeof value !== 'object') continue;
    const entry = value as Record<string, unknown>;
    if (typeof entry.isCorrect !== 'boolean') continue;
    const text = (input: unknown): string | null =>
      typeof input === 'string' ? input.slice(0, MAX_ANSWER_LENGTH) : null;
    checked[index] = {
      isCorrect: entry.isCorrect,
      correctKey: text(entry.correctKey),
      correctText: text(entry.correctText),
      explanation: text(entry.explanation),
      answerProof: text(entry.answerProof),
      aiTutorReady: typeof entry.aiTutorReady === 'boolean' ? entry.aiTutorReady : null,
    };
  }
  return checked;
}

/** อ่านค่าดิบแล้วแปลงเป็น state — คืน null เมื่อยังไม่เคยเริ่มชุดนี้หรือค่าเสียหาย */
function readState(sectionId: string, setId: number | string): TestProgressState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key(sectionId, setId));
    if (raw === null) return null;

    // รูปแบบเก่า: เก็บเป็นเลขดัชนีเดี่ยว
    const legacyIndex = Number.parseInt(raw, 10);
    if (!raw.trim().startsWith('{')) {
      return isIndex(legacyIndex) ? { index: legacyIndex, answers: [], checked: {} } : null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed as Record<string, unknown>;
    if (!isIndex(candidate.index)) return null;
    return {
      index: candidate.index,
      answers: normalizeAnswers(candidate.answers),
      checked: normalizeChecked(candidate.checked),
    };
  } catch {
    // sessionStorage ถูกปิด (private mode) หรือ JSON เสียหาย — ทำงานต่อได้ แค่ไม่จำ
    return null;
  }
}

function writeState(sectionId: string, setId: number | string, state: TestProgressState): boolean {
  if (typeof window === 'undefined') return false;
  if (!isIndex(state.index)) return false;
  try {
    window.sessionStorage.setItem(key(sectionId, setId), JSON.stringify({
      index: state.index,
      answers: normalizeAnswers(state.answers),
      checked: normalizeChecked(state.checked),
    }));
    return true;
  } catch {
    return false;
  }
}

/** ข้อที่ค้างไว้ของชุดนี้ — null = ยังไม่เคยเริ่มชุดนี้ */
export function loadTestProgress(sectionId: string, setId: number | string): number | null {
  return readState(sectionId, setId)?.index ?? null;
}

/** ตำแหน่ง + คำตอบ + สถานะเฉลยที่ค้างไว้ — null = ยังไม่เคยเริ่มชุดนี้ */
export function loadTestProgressState(
  sectionId: string,
  setId: number | string,
): TestProgressState | null {
  return readState(sectionId, setId);
}

/**
 * บันทึกทั้งตำแหน่ง คำตอบ และสถานะเฉลย — คืน false เมื่อเก็บไม่ได้
 * (ผู้เรียกใช้ค่านี้ตัดสินใจว่าจะเด้งหน้า /explain ได้หรือไม่ เพราะถ้าเก็บไม่ได้
 * การเด้งจะกลายเป็นลูปไม่จบ)
 */
export function saveTestProgressState(
  sectionId: string,
  setId: number | string,
  state: TestProgressState,
): boolean {
  return writeState(sectionId, setId, state);
}

/**
 * บันทึกเฉพาะตำแหน่งล่าสุด โดยคงคำตอบ/สถานะเฉลยที่เก็บไว้เดิม — คืน false เมื่อเก็บไม่ได้
 */
export function saveTestProgress(
  sectionId: string,
  setId: number | string,
  index: number,
): boolean {
  if (!isIndex(index)) return false;
  const previous = readState(sectionId, setId);
  return writeState(sectionId, setId, {
    index,
    answers: previous?.answers ?? [],
    checked: previous?.checked ?? {},
  });
}

// ─── คำตอบของชุดแบบเติมคำในบทความ (Form & Meaning) ──────────────────────
// ชุดนั้นเก็บคำตอบเป็นราย "ช่อง" (blankId) ไม่ใช่ราย slot จึงแยกคีย์กัน

/** คำตอบที่กรอกไว้ของชุด Form & Meaning — {} = ยังไม่เคยกรอก */
export function loadBlankAnswers(
  sectionId: string,
  setId: number | string,
): Record<number, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(blanksKey(sectionId, setId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const answers: Record<number, string> = {};
    for (const [rawId, value] of Object.entries(parsed as Record<string, unknown>).slice(0, MAX_ANSWERS)) {
      const blankId = Number.parseInt(rawId, 10);
      if (!isIndex(blankId) || typeof value !== 'string' || value === '') continue;
      answers[blankId] = value.slice(0, MAX_ANSWER_LENGTH);
    }
    return answers;
  } catch {
    return {};
  }
}

/** บันทึกคำตอบที่กรอกไว้ — เก็บไม่ได้ก็ไม่เป็นไร (แค่ไม่จำ) */
export function saveBlankAnswers(
  sectionId: string,
  setId: number | string,
  answers: Record<number, string>,
): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const trimmed: Record<number, string> = {};
    for (const [rawId, value] of Object.entries(answers).slice(0, MAX_ANSWERS)) {
      const blankId = Number.parseInt(rawId, 10);
      if (!isIndex(blankId) || typeof value !== 'string' || value === '') continue;
      trimmed[blankId] = value.slice(0, MAX_ANSWER_LENGTH);
    }
    window.sessionStorage.setItem(blanksKey(sectionId, setId), JSON.stringify(trimmed));
    return true;
  } catch {
    return false;
  }
}

// ─── ลำดับตัวเลือกที่ผู้เรียนเห็น ─────────────────────────────────────────
// คำตอบถูกเก็บเป็น "ป้ายบนจอ" (A/B/C/D หลังสลับ) ไม่ใช่ป้ายในฐานข้อมูล
// → ลำดับตัวเลือกต้องคงเดิมตลอดรอบ ไม่งั้น refresh แล้วคำตอบเดิมจะชี้ไปตัวเลือกอื่น
// (อาการจริงบน production: ตอบถูกแล้ว refresh → ขึ้นว่าผิด และส่งคำตอบผิดไปให้ server)

function choiceSeedKey(sectionId: string, setId: number | string): string {
  return `${CHOICE_SEED_KEY_PREFIX}${sectionId}-${setId}`;
}

/** seed ที่ใช้สลับตัวเลือกของชุดนี้ — null = ยังไม่เคยบันทึก (ค่าจากโค้ดรุ่นก่อน) */
export function loadChoiceSeed(sectionId: string, setId: number | string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(choiceSeedKey(sectionId, setId));
    return raw && raw.trim() ? raw : null;
  } catch {
    return null;
  }
}

function createChoiceSeed(setId: number | string): string {
  return `${setId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * seed ของชุดนี้ — ใช้ค่าเดิมถ้ามี สร้างใหม่ถ้ายังไม่มี
 *
 * ต้องเรียก **ก่อน** คืนคำตอบที่บันทึกไว้เสมอ: ลำดับตัวเลือกที่ผู้เรียนเห็นต้องตรงกับ
 * รอบที่เขาตอบ ไม่งั้นป้ายที่เก็บไว้จะชี้ไปคนละตัวเลือก
 */
export function ensureChoiceSeed(sectionId: string, setId: number | string): string {
  const existing = loadChoiceSeed(sectionId, setId);
  if (existing) return existing;

  const seed = createChoiceSeed(setId);
  if (typeof window === 'undefined') return seed;
  try {
    window.sessionStorage.setItem(choiceSeedKey(sectionId, setId), seed);
  } catch {
    // เก็บไม่ได้ก็ใช้ seed ชั่วคราวนี้ต่อ (อย่างน้อยรอบนี้ลำดับก็ไม่เปลี่ยนกลางทาง)
  }
  return seed;
}

/** เริ่มรอบใหม่ (เช่น "ทำชุดใหม่") — ลำดับตัวเลือกชุดใหม่ คำตอบที่จำไว้ใช้ไม่ได้แล้ว */
export function rotateChoiceSeed(sectionId: string, setId: number | string): string {
  const seed = createChoiceSeed(setId);
  if (typeof window === 'undefined') return seed;
  try {
    window.sessionStorage.setItem(choiceSeedKey(sectionId, setId), seed);
  } catch {
    // ไม่มีอะไรต้องทำ
  }
  return seed;
}

/** ล้างคำตอบที่กรอกไว้ (เช่น เริ่มทำชุดใหม่) */
export function clearBlankAnswers(sectionId: string, setId: number | string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(blanksKey(sectionId, setId));
  } catch {
    // ไม่มีอะไรต้องทำ
  }
}
