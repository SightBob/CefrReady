/**
 * ตัดคำตอบที่ถูกตัด (finish_reason = length) ให้เหลือประโยคสมบูรณ์สุดท้าย
 *
 * ทำที่ server ฝั่งเดียว เพื่อให้ "ข้อความที่ผู้เรียนเห็นใน UI" กับ
 * "ข้อความที่บันทึกลง DB" เป็นฉบับเดียวกัน (client รับฉบับที่ตัดแล้วมาแสดงแทนฉบับสตรีม)
 *
 * จุดตัดที่พิจารณาเรียงตามลำดับ:
 * 1. เครื่องหมายจบประโยค — . ! ? … และ ๆ ฯ ของไทย
 * 2. ประโยคไทยที่ไม่มีจุด → คำลงท้ายของวลี (ครับ/ค่ะ/นะ/เลย/แล้ว/เสีย/ไหม/ก็/ตาม) หรือขอบเขตบรรทัด
 * 3. ไม่พบจุดตัดที่ดี → เก็บทั้งก้อนไว้ แล้ว log เตือนฝั่ง server
 */

export type TrimCutReason = 'sentence' | 'clause' | 'line' | 'none';

export type TrimResult = {
  text: string;
  /** true = ตัดออกจากข้อความเดิม */
  trimmed: boolean;
  cutReason: TrimCutReason;
  /** ส่วนที่ถูกตัดทิ้ง (ไว้ log) */
  removed: string;
};

/**
 * เครื่องหมายจบประโยค (อังกฤษ + ไทย ๆ ฯ)
 * - "." ต้องตามด้วยช่องว่างหรือจบประโยค ไม่งั้นจะโดนตัวเลขทศนิยม (เช่น 1.5)
 */
const SENTENCE_END = /[.!?…](?=\s|$)|[ๆฯ](?=\s|$)/g;

/**
 * คำลงท้ายของวลีไทย (ใช้ตัดประโยคที่ไม่มีจุด) — ต้องตามด้วยช่องว่าง/เครื่องหมาย
 * หรือจบข้อความ จึงไม่ไปโดนคำที่ใช้เป็นกริยาวิเศษณกลางประโยค
 */
const CLAUSE_END = /(?:ครับ|ค่ะ|นะ|เลย|แล้ว|เสีย|ไหม|ก็|ตาม|อยู่|ด้วย|กัน|เสมอ)(?=[\s.,!?…ๆฯ]|$)/g;

function lastMatchEnd(text: string, pattern: RegExp): number {
  pattern.lastIndex = 0;
  let last = -1;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    last = match.index + match[0].length;
  }
  return last;
}

export function trimToLastCompleteSentence(input: string): TrimResult {
  const text = input.replace(/\s+$/, '');
  if (!text) {
    return { text: input, trimmed: false, cutReason: 'none', removed: '' };
  }

  // 1) จบประโยคด้วยเครื่องหมาย
  const sentenceEnd = lastMatchEnd(text, SENTENCE_END);
  if (sentenceEnd > 0) {
    if (sentenceEnd >= text.length) {
      return { text, trimmed: false, cutReason: 'none', removed: '' };
    }
    const cut = text.slice(0, sentenceEnd).replace(/\s+$/, '');
    if (cut) {
      return { text: cut, trimmed: true, cutReason: 'sentence', removed: text.slice(sentenceEnd) };
    }
  }

  // 2) ประโยคไทยไม่มีจุด → คำลงท้ายของวลี
  const clauseEnd = lastMatchEnd(text, CLAUSE_END);
  if (clauseEnd > 0 && clauseEnd < text.length) {
    const cut = text.slice(0, clauseEnd).replace(/\s+$/, '');
    if (cut) {
      return { text: cut, trimmed: true, cutReason: 'clause', removed: text.slice(clauseEnd) };
    }
  }

  // 3) ขอบเขตบรรทัด — เก็บทั้งบรรทัดที่จบแล้ว ตัดบรรทัดท้ายที่ค้างอยู่ทิ้ง
  const lastNewline = text.lastIndexOf('\n');
  if (lastNewline > 0) {
    const cut = text.slice(0, lastNewline).replace(/\s+$/, '');
    if (cut) {
      return { text: cut, trimmed: true, cutReason: 'line', removed: text.slice(lastNewline + 1) };
    }
  }

  // 4) ไม่พบจุดตัดที่ดี → เก็บทั้งก้อน (ฝั่ง server จะ log เตือน)
  return { text, trimmed: false, cutReason: 'none', removed: '' };
}
