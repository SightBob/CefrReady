import { type CefrLevel } from '@/lib/full-test/constants';

export type { CefrLevel };

export function estimateCefrLevel(averageScore: number): CefrLevel {
  if (averageScore >= 90) return 'C2';
  if (averageScore >= 78) return 'C1';
  if (averageScore >= 65) return 'B2';
  if (averageScore >= 52) return 'B1';
  if (averageScore >= 38) return 'A2';
  return 'A1';
}

export const CEFR_COLORS: Record<CefrLevel, string> = {
  A1: 'bg-slate-100 text-slate-700 border-slate-300',
  A2: 'bg-blue-100 text-blue-700 border-blue-300',
  B1: 'bg-green-100 text-green-700 border-green-300',
  B2: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  C1: 'bg-orange-100 text-orange-700 border-orange-300',
  C2: 'bg-purple-100 text-purple-700 border-purple-300',
};

export const CEFR_GRADIENT: Record<CefrLevel, string> = {
  A1: 'from-slate-400 to-slate-500',
  A2: 'from-blue-400 to-blue-500',
  B1: 'from-green-400 to-emerald-500',
  B2: 'from-yellow-400 to-amber-500',
  C1: 'from-orange-400 to-red-500',
  C2: 'from-purple-500 to-pink-500',
};

/**
 * ข้อความให้กำลังใจต่อท้ายชื่อทักษะบนการ์ดคะแนน (Figma node 75:70702)
 *
 * เดิมการ์ดคะแนนใช้ข้อความเดียว ("และความหมายของคุณอยู่ในเกณฑ์สูงมาก") กับทุกคะแนน
 * ทำให้คนที่ได้ 20% ก็เห็นว่า "สูงมาก" — ค่าชุดนี้จึงแยกตามระดับที่ประเมินได้
 * โดยใช้คีย์เดียวกับระดับที่โชว์บนการ์ด (CEFR) ข้อความจึงไม่ขัดกับ "ระดับที่ประเมินได้: …"
 * ระดับบนสุดคงข้อความตามดีไซน์เดิม ส่วนระดับอื่นเป็นคำที่เขียนเพิ่ม (ให้กำลังใจทุกช่วง)
 * และจะต่อท้ายป้ายทักษะได้ทุกแบบ (เช่น "ทักษะการฟังและเข้าใจภาษาพูด")
 */
export const SKILL_OUTCOME_MESSAGES: Record<CefrLevel, string> = {
  C2: 'และความหมายของคุณอยู่ในเกณฑ์สูงมาก',
  C1: 'และความหมายของคุณอยู่ในเกณฑ์สูง อีกนิดก็สมบูรณ์',
  B2: 'และความหมายของคุณอยู่ในเกณฑ์ดีมาก ใช้ทำงานได้สบาย',
  B1: 'และความหมายของคุณอยู่ในเกณฑ์ดี พื้นฐานแน่นแล้ว',
  A2: 'และความหมายของคุณอยู่ในเกณฑ์พื้นฐาน กำลังไปได้ดี',
  A1: 'และความหมายของคุณอยู่ในช่วงเริ่มต้น ฝึกต่อไปได้เลย',
};

const CEFR_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** แปลงค่า level ที่รับมาเป็นคีย์ที่รู้จัก (ไม่รู้จัก/ว่าง = null ให้ไปประมาณจาก percentage) */
function asCefrLevel(value: string | null | undefined): CefrLevel | null {
  const key = (value ?? '').trim().toUpperCase();
  return CEFR_LEVELS.find((level) => level === key) ?? null;
}

/**
 * ข้อความต่อท้ายชื่อทักษะตามระดับ — `level` คือระดับที่โชว์บนการ์ด (Full Test ส่งมาจาก server)
 * ถ้าไม่ส่งหรือค่าที่ไม่รู้จัก จะประมาณจาก percentage เหมือนที่การ์ดคำนวณระดับอยู่แล้ว
 */
export function skillOutcomeMessage(level: string | null | undefined, percentage: number): string {
  const resolved = asCefrLevel(level) ?? estimateCefrLevel(percentage);
  return SKILL_OUTCOME_MESSAGES[resolved];
}

export const CEFR_DESCRIPTIONS: Record<CefrLevel, string> = {
  A1: 'ผู้เริ่มต้น — เข้าใจประโยคพื้นฐานง่ายๆ',
  A2: 'ระดับพื้นฐาน — สื่อสารเรื่องใกล้ตัวได้',
  B1: 'ระดับกลาง — จัดการสถานการณ์ทั่วไปได้',
  B2: 'ระดับกลางสูง — เข้าใจเนื้อหาซับซ้อนได้',
  C1: 'ระดับสูง — ใช้ภาษาได้คล่องแคล่ว',
  C2: 'ระดับเชี่ยวชาญ — เทียบเท่าเจ้าของภาษา',
};

export const SCORE_RANGES: Record<CefrLevel, string> = {
  A1: '0–37%',
  A2: '38–51%',
  B1: '52–64%',
  B2: '65–77%',
  C1: '78–89%',
  C2: '90–100%',
};
