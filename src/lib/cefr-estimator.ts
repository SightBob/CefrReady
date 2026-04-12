export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

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
