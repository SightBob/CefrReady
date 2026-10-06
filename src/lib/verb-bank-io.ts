/**
 * นำเข้า/ส่งออกไฟล์ CSV ของคลังกริยา 3 ช่อง
 * pure function ทั้งหมด เพื่อเทสต์ได้โดยไม่ต้องยุ่งกับ DOM หรือ API
 */

export interface VerbCsvRow {
  /** เลขบรรทัดในไฟล์ (1-based) เอาไว้รายงานตอนแถวไหนผิด */
  line: number;
  v1: string;
  v2: string;
  v3: string;
}

export interface ParsedVerbCsv {
  rows: VerbCsvRow[];
  errors: { line: number; message: string }[];
}

export const VERB_CSV_HEADERS = ['v1', 'v2', 'v3'] as const;

/** ครอบครอง field ด้วยเครื่องหมายคำพูดเมื่อมี , " หรือขึ้นบรรทัดใหม่ */
function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** สร้างเนื้อไฟล์ CSV (ไม่มี BOM — ผู้เรียกเติม \uFEFF ตอนสร้าง Blob เอง) */
export function verbEntriesToCsv(entries: ReadonlyArray<{ v1: string; v2: string; v3: string }>): string {
  const lines: string[] = [VERB_CSV_HEADERS.join(',')];
  for (const entry of entries) {
    lines.push([entry.v1, entry.v2, entry.v3].map(csvEscape).join(','));
  }
  return lines.join('\r\n');
}

/**
 * อ่าน CSV แบบรองรับเครื่องหมายคำพูด (มี , หรือขึ้นบรรทัดใหม่ในเครื่องหมายได้)
 * - ข้ามแถวว่าง
 * - ถ้าแถวแรกเป็นหัวตาราง v1,v2,v3 จะข้ามให้เอง
 * - แถวที่จำนวนคอลัมน์ไม่ใช่ 3 จะถูกเก็บไว้ใน errors พร้อมเลขบรรทัด
 */
export function parseVerbCsv(text: string): ParsedVerbCsv {
  const clean = text.replace(/^\uFEFF/, '');

  // แตกไฟล์เป็น records (แต่ละ record รู้ว่าเริ่มบรรทัดไหน)
  const records: { fields: string[]; line: number }[] = [];
  let fields: string[] = [];
  let field = '';
  let inQuotes = false;
  let recordLine = 1;
  let line = 1;

  const finishRecord = () => {
    fields.push(field);
    field = '';
    // แถวว่าง (ทุกช่องเป็นช่องว่าง) ไม่ถือเป็นข้อมูล
    if (fields.some((value) => value.trim() !== '')) {
      records.push({ fields, line: recordLine });
    }
    fields = [];
    recordLine = line;
  };

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === '\n') line++;
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(field);
      field = '';
    } else if (ch === '\n') {
      line++;
      finishRecord();
    } else if (ch === '\r') {
      if (clean[i + 1] === '\n') i++;
      line++;
      finishRecord();
    } else {
      field += ch;
    }
  }
  // record สุดท้ายที่ไม่มีขึ้นบรรทัดใหม่ปิดท้าย
  if (field !== '' || fields.length > 0) finishRecord();

  const rows: VerbCsvRow[] = [];
  const errors: ParsedVerbCsv['errors'] = [];

  for (const record of records) {
    // ข้ามหัวตารางถ้าเจอ
    const lower = record.fields.map((value) => value.trim().toLowerCase());
    if (record.line === 1 && lower[0] === 'v1' && lower[1] === 'v2' && lower[2] === 'v3') continue;

    if (record.fields.length !== 3) {
      errors.push({
        line: record.line,
        message: `ต้องมี 3 คอลัมน์ (v1, v2, v3) แต่ได้ ${record.fields.length}`,
      });
      continue;
    }
    rows.push({ line: record.line, v1: record.fields[0], v2: record.fields[1], v3: record.fields[2] });
  }

  return { rows, errors };
}
