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
 * (ไม่รวม "ก็" / "ตาม" เพราะเป็นคำที่มักอยู่กลางประโยค ทำให้ตัดผิดจุด)
 * ยอมให้ตามด้วย * เพราะข้อความที่ตัวหนาอยู่กลางประโยค เช่น "**เสมอ**"
 */
const CLAUSE_END = /(?:ครับ|ค่ะ|นะ|เลย|แล้ว|เสีย|ไหม|อยู่|ด้วย|กัน|เสมอ)(?=[\s.,!?…ๆฯ*]|$)/g;

function lastMatchEnd(text: string, pattern: RegExp): number {
  pattern.lastIndex = 0;
  let last = -1;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    last = match.index + match[0].length;
  }
  return last;
}

/**
 * ทำให้เครื่องหมาย ** (ตัวหน้า) เปิด-ปิดครบเสมอ
 * ถ้ามี ** ค้าง (จำนวนคี่ = โมเดลถูกตัดกลางตัวหนา) → เอาเครื่องหมายตัวสุดท้ายออก
 * (ปิดให้ครบแทนการเดา เพราะการเติม ** จะทำให้ทั้งย่อหน้าไปเป็นตัวหนาทั้งก้อน)
 */
export function balanceBoldMarkers(text: string): string {
  const markers = text.match(/\*\*/g) ?? [];
  if (markers.length % 2 === 0) return text;
  const last = text.lastIndexOf('**');
  if (last === -1) return text;
  return text.slice(0, last) + text.slice(last + 2);
}

/**
 * ปิดจุดตัดให้สมบูรณ์ — ถ้าจุดตัดอยู่ภายในวงเล็บตัวหนา (เช่น "**เสมอ**")
 * ให้ขยายจุดตัดออกมาถึงปลายวงเล็บ เพื่อไม่ให้ตัวหนาหาย
 */
function finalizeCut(text: string, end: number): { text: string; end: number } {
  let cutEnd = end;
  if (text.slice(cutEnd, cutEnd + 2) === '**') {
    cutEnd += 2;
  }
  return { text: balanceBoldMarkers(text.slice(0, cutEnd).replace(/\s+$/, '')), end: cutEnd };
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
      return { text: balanceBoldMarkers(text), trimmed: false, cutReason: 'none', removed: '' };
    }
    const cut = finalizeCut(text, sentenceEnd);
    if (cut.text) {
      return { text: cut.text, trimmed: true, cutReason: 'sentence', removed: text.slice(cut.end) };
    }
  }

  // 2) ประโยคไทยไม่มีจุด → คำลงท้ายของวลี
  const clauseEnd = lastMatchEnd(text, CLAUSE_END);
  if (clauseEnd > 0 && clauseEnd < text.length) {
    const cut = finalizeCut(text, clauseEnd);
    if (cut.text) {
      return { text: cut.text, trimmed: true, cutReason: 'clause', removed: text.slice(cut.end) };
    }
  }

  // 3) ขอบเขตบรรทัด — เก็บทั้งบรรทัดที่จบแล้ว ตัดบรรทัดท้ายที่ค้างอยู่ทิ้ง
  const lastNewline = text.lastIndexOf('\n');
  if (lastNewline > 0) {
    const cut = finalizeCut(text, lastNewline);
    if (cut.text) {
      return { text: cut.text, trimmed: true, cutReason: 'line', removed: text.slice(cut.end) };
    }
  }

  // 4) ไม่พบจุดตัดที่ดี → เก็บทั้งก้อน (ฝั่ง server จะ log เตือน)
  return { text: balanceBoldMarkers(text), trimmed: false, cutReason: 'none', removed: '' };
}
