/**
 * กติกาข้อมูลของคลังกริยา 3 ช่อง (Figma node 2654:1249)
 * ใช้ร่วมกันระหว่าง API route กับหน้า admin เพื่อไม่ให้ validation ไม่ตรงกัน
 */

export const MAX_VERB_FORM_LENGTH = 100;

export type VerbFormKey = 'v1' | 'v2' | 'v3';

export const VERB_FORM_LABELS: Record<VerbFormKey, string> = {
  v1: 'V.1',
  v2: 'V.2',
  v3: 'V.3',
};

export interface VerbEntry {
  id: number;
  v1: string;
  v2: string;
  v3: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * ตัดช่องว่างหัวท้ายและตรวจความยาว
 * คืน null เมื่อค่าไม่ใช่ข้อความ ว่างเปล่า หรือยาวเกิน 100 ตัวอักษร
 */
export function normalizeVerbForm(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_VERB_FORM_LENGTH) return null;
  return trimmed;
}

export type VerbFormErrors = Partial<Record<VerbFormKey, string>>;

/**
 * ตรวจทั้ง 3 ช่องพร้อมกัน แล้วคืนค่าที่ normalize แล้วพร้อมข้อความผิดพลาดรายช่อง
 * ใช้ทั้งตอนเพิ่มและตอนแก้ไข (ตอนแก้ไขเรียง error ตามลำดับช่องที่ผิด)
 */
export function validateVerbEntry(input: {
  v1: unknown;
  v2: unknown;
  v3: unknown;
}): { values: { v1: string; v2: string; v3: string } | null; errors: VerbFormErrors } {
  const keys: VerbFormKey[] = ['v1', 'v2', 'v3'];
  const errors: VerbFormErrors = {};
  const values = {} as { v1: string; v2: string; v3: string };

  for (const key of keys) {
    const normalized = normalizeVerbForm(input[key]);
    if (normalized === null) {
      const raw = input[key];
      if (raw !== undefined && raw !== null && typeof raw === 'string' && raw.trim()) {
        errors[key] = `ยาวเกิน ${MAX_VERB_FORM_LENGTH} ตัวอักษร`;
      } else {
        errors[key] = 'กรุณากรอกข้อมูล';
      }
    } else {
      values[key] = normalized;
    }
  }

  return { values: Object.keys(errors).length === 0 ? values : null, errors };
}

/** ข้อความแรกที่ผิดพลาด ใช้แสดงเป็นข้อความรวมให้ผู้ใช้ */
export function firstVerbError(errors: VerbFormErrors): string | null {
  for (const key of ['v1', 'v2', 'v3'] as VerbFormKey[]) {
    if (errors[key]) return errors[key]!;
  }
  return null;
}
/**
 * กรองคลังกริยาสำหรับ sidebar หน้าสอบ (ค้นหาได้ทั้ง 3 ช่อง หรือเจาะจงช่องที่เลือกเป็นชิป)
 * ย้ายออกมาเป็น pure function เพื่อเทสต์ได้โดยไม่ต้อง mount React
 */
export function filterVerbEntries(
  entries: VerbEntry[],
  query: string,
  column: VerbFormKey | null = null,
): VerbEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((entry) =>
    column
      ? entry[column].toLowerCase().includes(q)
      : entry.v1.toLowerCase().includes(q)
        || entry.v2.toLowerCase().includes(q)
        || entry.v3.toLowerCase().includes(q),
  );
}
