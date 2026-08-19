import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { db } from '@/db';
import { questions, testSetQuestions, testSets } from '@/db/schema';
import { eq, count as drizzleCount, and, sql, inArray } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

interface ImportQuestion {
  testTypeId: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  cefrLevel: string;
  conversation?: string;
  article?: string;
  audioUrl?: string;
  transcript?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const CSV_COLUMNS = [
  'testTypeId','questionText','optionA','optionB','optionC','optionD',
  'correctAnswer','explanation','cefrLevel','difficulty','testSetId',
  'conversation','article','audioUrl','transcript',
] as const;

const MAX_ERROR_MESSAGES = 100;

function snippet(value: string | null | undefined, max = 60): string {
  const s = (value ?? '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function jsonErrorDetail(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function capMessages(list: string[], cap = MAX_ERROR_MESSAGES): string[] {
  if (list.length <= cap) return list;
  return [...list.slice(0, cap), `…และอีก ${list.length - cap} ข้อความลักษณะเดียวกัน`];
}

// rowNo maps a 0-based data-row index to the line number an admin sees when
// opening the CSV in a spreadsheet (header occupies line 1 when present).
function makeRowNumberer(hadHeader: boolean): (idx: number) => number {
  const offset = hadHeader ? 2 : 1;
  return (idx: number) => idx + offset;
}

function validateQuestion(row: Record<string, string>, rowNum: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate testTypeId first
  const validTestTypes = ['focus-form', 'focus-meaning', 'form-meaning', 'listening'];
  if (!row.testTypeId?.trim()) {
    errors.push(`Row ${rowNum}: Missing required field "testTypeId"`);
  } else if (!validTestTypes.includes(row.testTypeId)) {
    errors.push(`Row ${rowNum}: Invalid testTypeId "${row.testTypeId}". Must be one of: ${validTestTypes.join(', ')}`);
  }

  // Common required fields
  if (!row.questionText?.trim()) {
    errors.push(`Row ${rowNum}: Missing required field "questionText"`);
  }

  // Validate CEFR level
  const validCefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  if (!row.cefrLevel?.trim()) {
    errors.push(`Row ${rowNum}: Missing required field "cefrLevel"`);
  } else if (!validCefrLevels.includes(row.cefrLevel)) {
    errors.push(`Row ${rowNum}: Invalid cefrLevel "${row.cefrLevel}". Must be one of: ${validCefrLevels.join(', ')}`);
  }

  // Validate difficulty
  const validDifficulties = ['easy', 'medium', 'hard'];
  if (row.difficulty && !validDifficulties.includes(row.difficulty.toLowerCase())) {
    warnings.push(`Row ${rowNum}: Unknown difficulty "${row.difficulty}". Using default`);
  }

  // Validate testSetId (optional)
  if (row.testSetId && row.testSetId.trim()) {
    const setId = parseInt(row.testSetId.trim());
    if (isNaN(setId)) {
      errors.push(`Row ${rowNum}: Invalid testSetId "${row.testSetId}". Must be a number.`);
    }
  }

  // Type-specific validation
  const testType = row.testTypeId?.trim();

  if (testType === 'form-meaning') {
    // form-meaning: requires article JSON, NOT optionA-D
    if (!row.article?.trim()) {
      errors.push(`Row ${rowNum}: form-meaning requires "article" column (JSON)`);
    } else {
      let parsed: unknown;
      try {
        parsed = JSON.parse(row.article);
      } catch (err) {
        errors.push(`Row ${rowNum}: "article" is not valid JSON — ${jsonErrorDetail(err)} (ข้อมูลที่ได้รับ: "${snippet(row.article)}")`);
        return { valid: false, errors, warnings };
      }

      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        errors.push(`Row ${rowNum}: "article" must be a JSON object with {title, text, blanks} — ได้รับ: ${Array.isArray(parsed) ? 'array' : typeof parsed}`);
      } else {
        const obj = parsed as Record<string, unknown>;
        if (!obj.title || typeof obj.title !== 'string') {
          errors.push(`Row ${rowNum}: article.title is required and must be a string`);
        }
        if (!obj.text || typeof obj.text !== 'string') {
          errors.push(`Row ${rowNum}: article.text is required and must be a string`);
        }
        if (!Array.isArray(obj.blanks) || obj.blanks.length === 0) {
          errors.push(`Row ${rowNum}: article.blanks must be a non-empty array`);
        } else {
          for (let b = 0; b < obj.blanks.length; b++) {
            const blank = obj.blanks[b] as Record<string, unknown>;
            if (typeof blank.id !== 'number') {
              errors.push(`Row ${rowNum}: article.blanks[${b}].id must be a number — ได้รับ: ${JSON.stringify(blank.id)}`);
            }
            if (!blank.correctAnswer || typeof blank.correctAnswer !== 'string') {
              errors.push(`Row ${rowNum}: article.blanks[${b}].correctAnswer is required and must be a string`);
            }
          }
        }
      }
    }
  } else if (testType === 'focus-meaning') {
    // focus-meaning: requires conversation JSON, options C/D optional
    for (const field of ['optionA', 'optionB', 'correctAnswer']) {
      if (!row[field]?.trim()) {
        errors.push(`Row ${rowNum}: Missing required field "${field}"`);
      }
    }
    if (row.correctAnswer && !['A', 'B', 'C', 'D'].includes(row.correctAnswer.toUpperCase())) {
      errors.push(`Row ${rowNum}: Invalid correctAnswer "${row.correctAnswer}". Must be A, B, C, or D`);
    }
    if (!row.conversation?.trim()) {
      errors.push(`Row ${rowNum}: focus-meaning requires "conversation" column (JSON array)`);
    } else {
      let parsed: unknown;
      try {
        parsed = JSON.parse(row.conversation);
      } catch (err) {
        errors.push(`Row ${rowNum}: "conversation" is not valid JSON — ${jsonErrorDetail(err)} (ข้อมูลที่ได้รับ: "${snippet(row.conversation)}")`);
        return { valid: false, errors, warnings };
      }
      if (!Array.isArray(parsed)) {
        errors.push(`Row ${rowNum}: "conversation" must be a JSON array — ได้รับ: ${typeof parsed}`);
      }
    }
  } else if (testType === 'listening') {
    // listening: standard MCQ + optional audio
    const mcqRequired = ['optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer'];
    for (const field of mcqRequired) {
      if (!row[field]?.trim()) {
        errors.push(`Row ${rowNum}: Missing required field "${field}"`);
      }
    }
    if (row.correctAnswer && !['A', 'B', 'C', 'D'].includes(row.correctAnswer.toUpperCase())) {
      errors.push(`Row ${rowNum}: Invalid correctAnswer "${row.correctAnswer}". Must be A, B, C, or D`);
    }
  } else {
    // focus-form and unknown: standard MCQ
    const mcqRequired = ['optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer'];
    for (const field of mcqRequired) {
      if (!row[field]?.trim()) {
        errors.push(`Row ${rowNum}: Missing required field "${field}"`);
      }
    }
    if (row.correctAnswer && !['A', 'B', 'C', 'D'].includes(row.correctAnswer.toUpperCase())) {
      errors.push(`Row ${rowNum}: Invalid correctAnswer "${row.correctAnswer}". Must be A, B, C, or D`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Pre-process CSV text to fix copy-paste artifacts:
 * - Strip leading whitespace (indentation)
 * - Rejoin lines that were split by word-wrap (no comma, not inside quotes)
 * - Rejoin header fragments that were word-wrapped
 */
const TEST_TYPE_IDS = ['focus-form', 'focus-meaning', 'form-meaning', 'listening'];

function hasHeaderLine(line: string): boolean {
  return line.trimStart().startsWith('testTypeId,');
}

function isDataRowStart(line: string): boolean {
  const trimmed = line.trimStart();
  return TEST_TYPE_IDS.some(t => trimmed.startsWith(t + ',') || trimmed.startsWith(t + '"'));
}

function normalizeCSV(text: string): string {
  const lines = text.replace(/\r/g, '').split('\n');
  const result: string[] = [];
  let buffer = '';
  let inQuotes = false;

  for (const rawLine of lines) {
    const line = rawLine.trimStart();
    if (!line) continue;

    if (inQuotes) {
      // Inside a quoted field — keep joining
      buffer += '\n' + line;
      for (const ch of line) {
        if (ch === '"') inQuotes = !inQuotes;
      }
      if (!inQuotes) {
        result.push(buffer);
        buffer = '';
      }
    } else {
      // Detect if this line opens a quoted field that doesn't close
      let tempInQuotes = false;
      for (const ch of line) {
        if (ch === '"') tempInQuotes = !tempInQuotes;
      }

      if (tempInQuotes) {
        // Unclosed quote — start buffering multi-line field
        buffer = line;
        inQuotes = true;
      } else if (isDataRowStart(line) || hasHeaderLine(line)) {
        // Definitely a new row or header — flush buffer first
        if (buffer) { result.push(buffer); buffer = ''; }
        result.push(line);
      } else if (!line.includes(',') && line.length > 0) {
        // No comma, not in quotes → likely a word-wrapped continuation
        if (result.length > 0) {
          result[result.length - 1] += ' ' + line;
        } else {
          buffer += (buffer ? ' ' : '') + line;
        }
      } else if (result.length > 0 && !isDataRowStart(line) && !hasHeaderLine(line)) {
        // Has commas but doesn't look like a new row — continuation of previous
        result[result.length - 1] += ' ' + line;
      } else if (buffer) {
        buffer += ' ' + line;
      } else {
        result.push(line);
      }
    }
  }
  if (buffer) result.push(buffer);
  return result.join('\n');
}

interface CSVParseOutput {
  rows: Record<string, string>[];
  hadHeader: boolean;
  parseErrors: string[];
  headerIssues: string[];
}

function parseCSV(text: string): CSVParseOutput {
  const normalized = normalizeCSV(text);
  const nonEmptyLines = normalized.split('\n').filter(l => l.trim());
  const hadHeader = nonEmptyLines.length > 0 && hasHeaderLine(nonEmptyLines[0]);

  if (!hadHeader) {
    // No header — parse with default column order
    const result = Papa.parse<string[]>(normalized, {
      header: false,
      skipEmptyLines: true,
    });
    const parseErrors: string[] = result.errors.map(e =>
      `CSV parse ผิดพลาดที่บรรทัด ~${(e.row ?? 0) + 1}: ${e.message} (${e.type})`
    );
    const rows: Record<string, string>[] = [];
    result.data.forEach((values, idx) => {
      if (values.length < CSV_COLUMNS.length) {
        parseErrors.push(
          `Row ${idx + 1}: มี ${values.length} คอลัมน์ แต่ระบบคาดหวัง ${CSV_COLUMNS.length} คอลัมน์ ` +
          `(ไฟล์ไม่มี header — คอลัมน์ต้องเรียงตามลำดับ: ${CSV_COLUMNS.join(', ')})`
        );
      }
      const row: Record<string, string> = {};
      CSV_COLUMNS.forEach((col, i) => {
        row[col] = String(values[i] ?? '').trim();
      });
      rows.push(row);
    });
    return { rows, hadHeader, parseErrors, headerIssues: [] };
  }

  // Has header — let PapaParse auto-map columns
  const result = Papa.parse<Record<string, string>>(normalized, {
    header: true,
    skipEmptyLines: true,
  });

  const parseErrors: string[] = result.errors.map(e =>
    `CSV parse ผิดพลาดที่แถว ~${(e.row ?? 0) + 2}: ${e.message} (${e.type})`
  );

  // Diagnose header vs expected columns so "missing field" floods have a cause
  const headerIssues: string[] = [];
  const fields = (result.meta.fields ?? []).map(f => f.trim()).filter(Boolean);
  const requiredCols = ['testTypeId', 'questionText', 'cefrLevel'];
  const missing = requiredCols.filter(c => !fields.includes(c));
  if (missing.length > 0) {
    headerIssues.push(
      `หัวตารางขาดคอลัมน์ที่จำเป็น: ${missing.join(', ')} — ` +
      `แถวทุกแถวจะถูกรายงานว่าขาด field นี้ กรุณาตรวจชื่อคอลัมน์ (ต้องตรงทั้งตัวพิมพ์ใหญ่-เล็ก)`
    );
  }
  const known = new Set<string>(CSV_COLUMNS);
  const unknown = fields.filter(f => !known.has(f));
  if (unknown.length > 0) {
    headerIssues.push(
      `หัวตารางมีคอลัมน์ที่ระบบไม่รู้จัก (จะถูกละเว้น): ${unknown.join(', ')} — ` +
      `คอลัมน์ที่รองรับ: ${CSV_COLUMNS.join(', ')}`
    );
  }

  // Trim header names and values
  const rows = result.data.map(row => {
    const trimmedRow: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      trimmedRow[key.trim()] = String(value ?? '').trim();
    }
    return trimmedRow;
  });

  return { rows, hadHeader, parseErrors, headerIssues };
}

function normalizeText(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizeConversation(raw: unknown): string {
  if (!raw) return '';
  let convo = raw;
  if (typeof raw === 'string') {
    try { convo = JSON.parse(raw); } catch { return normalizeText(raw); }
  }
  if (!Array.isArray(convo)) return normalizeText(String(raw));
  return convo
    .map((m: { speaker?: string; name?: string; text?: string }) =>
      `${normalizeText(m?.speaker)}|${normalizeText(m?.name)}|${normalizeText(m?.text)}`)
    .join(';;');
}

function buildDedupKey(
  testTypeId: string,
  questionText: string,
  conversation: unknown,
  options: Array<string | null | undefined>,
): string {
  return [
    normalizeText(testTypeId),
    normalizeText(questionText),
    normalizeConversation(conversation),
    options.map(normalizeText).join('|'),
  ].join('::');
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const body = await request.json();
    const { csvData, dryRun } = body;

    if (!csvData || typeof csvData !== 'string') {
      return NextResponse.json({ error: 'Invalid CSV data' }, { status: 400 });
    }

    const { rows, hadHeader, parseErrors, headerIssues } = parseCSV(csvData);
    const rowNo = makeRowNumberer(hadHeader);

    if (rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: parseErrors.length > 0
          ? 'ไม่พบข้อมูลที่นำเข้าได้ใน CSV — ดูสาเหตุด้านล่าง'
          : 'No data rows found in CSV',
        errors: parseErrors.length > 0 ? capMessages(parseErrors) : undefined,
        warnings: headerIssues,
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
      }, { status: 400 });
    }

    // Validate all rows
    const validationResults = rows.map((row, idx) => validateQuestion(row, rowNo(idx)));
    const allErrors = capMessages([...parseErrors, ...validationResults.flatMap(r => r.errors)]);
    const allWarnings = [...headerIssues, ...validationResults.flatMap(r => r.warnings)];

    // If there are errors, return preview with errors
    if (allErrors.length > 0) {
      return NextResponse.json({
        success: false,
        errors: allErrors,
        warnings: allWarnings,
        totalRows: rows.length,
        validRows: validationResults.filter(r => r.valid).length,
        invalidRows: validationResults.filter(r => !r.valid).length,
      }, { status: 400 });
    }

    // ── Duplicate check: within this CSV file ──────────────────────────
    // Dedup key: questionText + conversation + options (normalized)
    const seenInFile = new Map<string, number>();
    const inFileDuplicateRows = new Set<number>();
    rows.forEach((row, idx) => {
      const key = buildDedupKey(row.testTypeId, row.questionText, row.conversation, [
        row.optionA, row.optionB, row.optionC, row.optionD,
      ]);
      if (seenInFile.has(key)) {
        inFileDuplicateRows.add(idx);
        allWarnings.push(`Row ${rowNo(idx)}: ข้อสอบซ้ำกับ Row ${rowNo(seenInFile.get(key)!)} ในไฟล์ CSV เดียวกัน — ข้ามแถวนี้`);
      } else {
        seenInFile.set(key, idx);
      }
    });

    // ── Duplicate check: against existing DB questions ─────────────────
    const uniqueTestTypeIds = Array.from(new Set(rows.map(r => r.testTypeId).filter(Boolean)));
    let existingNormalized = new Set<string>();
    if (uniqueTestTypeIds.length > 0) {
      const existingRows = await db
        .select({
          testTypeId: questions.testTypeId,
          questionText: questions.questionText,
          optionA: questions.optionA,
          optionB: questions.optionB,
          optionC: questions.optionC,
          optionD: questions.optionD,
          conversation: questions.conversation,
        })
        .from(questions)
        .where(inArray(questions.testTypeId, uniqueTestTypeIds));
      existingNormalized = new Set(
        existingRows.map(q => buildDedupKey(q.testTypeId, q.questionText, q.conversation, [
          q.optionA, q.optionB, q.optionC, q.optionD,
        ]))
      );
    }

    const inDbDuplicateRows = new Set<number>();
    rows.forEach((row, idx) => {
      const key = buildDedupKey(row.testTypeId, row.questionText, row.conversation, [
        row.optionA, row.optionB, row.optionC, row.optionD,
      ]);
      if (existingNormalized.has(key)) {
        inDbDuplicateRows.add(idx);
        allWarnings.push(`Row ${rowNo(idx)}: ข้อสอบซ้ำกับที่มีอยู่ในระบบแล้ว — ข้ามแถวนี้`);
      }
    });

    const skipRows = new Set(Array.from(inFileDuplicateRows).concat(Array.from(inDbDuplicateRows)));

    // Build questions to insert (excluding duplicates)
    const questionsToInsert = rows
      .map((row, idx) => {
        if (skipRows.has(idx)) return null;

        let conversationData = null;
        if (row.conversation) {
          try { conversationData = JSON.parse(row.conversation); }
          catch (err) {
            allWarnings.push(`Row ${rowNo(idx)}: "conversation" JSON parse failed (${jsonErrorDetail(err)}) — จะนำเข้าโดยไม่มี conversation`);
          }
        }

        let articleData = null;
        if (row.article) {
          try { articleData = JSON.parse(row.article); }
          catch (err) {
            allWarnings.push(`Row ${rowNo(idx)}: "article" JSON parse failed (${jsonErrorDetail(err)}) — จะนำเข้าโดยไม่มี article`);
          }
        }

        return {
          _originalIndex: idx,
          testTypeId: row.testTypeId,
          questionText: row.questionText,
          optionA: row.optionA || null,
          optionB: row.optionB || null,
          optionC: row.optionC || null,
          optionD: row.optionD || null,
          correctAnswer: row.correctAnswer ? row.correctAnswer.toUpperCase() : null,
          explanation: row.explanation || '',
          cefrLevel: row.cefrLevel,
          difficulty: row.difficulty?.toLowerCase() || 'medium',
          conversation: conversationData,
          article: articleData,
          audioUrl: row.audioUrl || null,
          transcript: row.transcript || null,
        };
      })
      .filter((q): q is NonNullable<typeof q> => q !== null);

    const skippedCount = skipRows.size;

    if (questionsToInsert.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'ไม่มีข้อสอบใหม่ที่จะ Import (ทั้งหมดซ้ำกับที่มีอยู่แล้ว)',
        importedCount: 0,
        skippedDuplicates: skippedCount,
        assignedCount: 0,
        warnings: allWarnings,
      });
    }

    // ── Dry run: validate only, don't insert ───────────────────────────
    if (dryRun) {
      return NextResponse.json({
        success: true,
        message: 'ตรวจสอบผ่าน — กด "นำเข้า" เพื่อนำเข้าจริง',
        importedCount: questionsToInsert.length,
        skippedDuplicates: skippedCount,
        totalRows: rows.length,
        validRows: questionsToInsert.length,
        invalidRows: 0,
        warnings: capMessages(allWarnings),
      });
    }

    // ── Actual import ──────────────────────────────────────────────────
    const insertPayload = questionsToInsert.map(({ _originalIndex: _idx, ...rest }) => rest);
    let inserted;
    try {
      inserted = await db.insert(questions).values(insertPayload).returning();
    } catch (err) {
      // Surface the actual DB rejection — admin-only endpoint, so exposing
      // pg error code/detail is safe and saves a trip to the server logs.
      const e = err as { code?: string; detail?: string; message?: string; constraint?: string };
      const pgHints: Record<string, string> = {
        '23505': 'ข้อมูลซ้ำกับที่มีใน DB (unique constraint)',
        '23502': 'มีคอลัมน์ที่ DB บังคับ NOT NULL ได้รับค่าว่าง',
        '23503': 'อ้างอิง foreign key ที่ไม่มีอยู่จริง (เช่น testSetId)',
        '22001': 'ค่าบางคอลัมน์ยาวเกินขนาดที่คอลัมน์รองรับ (varchar overflow)',
        '22P02': 'รูปแบบค่าไม่ถูกต้องสำหรับคอลัมน์ (เช่น ตัวเลข/enum)',
      };
      const details = [
        e.message ? `message: ${e.message}` : '',
        e.code ? `code: ${e.code}` : '',
        e.constraint ? `constraint: ${e.constraint}` : '',
        e.detail ? `detail: ${e.detail}` : '',
        e.code && pgHints[e.code] ? `คำอธิบาย: ${pgHints[e.code]}` : '',
      ].filter(Boolean);
      console.error('DB insert failed during import:', err);
      return NextResponse.json({
        success: false,
        error: 'บันทึกลงฐานข้อมูลไม่สำเร็จ',
        errors: ['บันทึกลงฐานข้อมูลไม่สำเร็จ — ฐานข้อมูลปฏิเสธคำสั่ง INSERT (ข้อมูลยังไม่ถูกบันทึกแถวใดเลย)', ...details],
        warnings: [],
      }, { status: 500 });
    }

    // Map inserted rows back to original row indices for test-set assignment
    const insertedByOriginalIndex = new Map<number, typeof inserted[0]>();
    questionsToInsert.forEach((q, insertIdx) => {
      insertedByOriginalIndex.set(q._originalIndex, inserted[insertIdx]);
    });

    // Auto-assign to test sets if testSetId is provided
    let assignedCount = 0;
    const assignments: { questionId: number; testSetId: number }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (skipRows.has(i)) continue;

      if (row.testSetId?.trim()) {
        const setId = parseInt(row.testSetId.trim());
        const insertedQ = insertedByOriginalIndex.get(i);
        if (!isNaN(setId) && insertedQ) {
          const [set] = await db.select().from(testSets).where(eq(testSets.id, setId)).limit(1);
          if (set) {
            const [existing] = await db.select()
              .from(testSetQuestions)
              .where(and(eq(testSetQuestions.testSetId, setId), eq(testSetQuestions.questionId, insertedQ.id)));

            if (!existing) {
              const [countRow] = await db
                .select({ cnt: drizzleCount() })
                .from(testSetQuestions)
                .where(eq(testSetQuestions.testSetId, setId));
              const nextOrder = countRow?.cnt ?? 0;

              assignments.push({ questionId: insertedQ.id, testSetId: setId, ...{ orderIndex: nextOrder } } as never);
            }
          } else {
            allWarnings.push(`Row ${rowNo(i)}: testSetId ${setId} ไม่มีอยู่ในระบบ — ข้อสอบถูกนำเข้าแล้วแต่ไม่ได้จัดเข้าชุด`);
          }
        }
      }
    }

    if (assignments.length > 0) {
      await db.insert(testSetQuestions).values(assignments);
      assignedCount = assignments.length;
    }

    return NextResponse.json({
      success: true,
      message: `นำเข้าสำเร็จ ${inserted.length} ข้อ${skippedCount > 0 ? ` (ข้ามซ้ำ ${skippedCount} ข้อ)` : ''}${assignedCount > 0 ? ` และได้จัดเข้า Test Set ${assignedCount} ข้อ` : ''}`,
      importedCount: inserted.length,
      skippedDuplicates: skippedCount,
      assignedCount,
      warnings: capMessages(allWarnings),
    });
  } catch (error) {
    console.error('Error importing questions:', error);
    const e = error as { message?: string };
    return NextResponse.json({
      success: false,
      error: 'Failed to import questions',
      errors: [
        'เกิดข้อผิดพลาดที่ไม่คาดคิดระหว่างการนำเข้า',
        e.message ? `message: ${e.message}` : '',
      ].filter(Boolean),
    }, { status: 500 });
  }
}

export async function GET() {
  // Return CSV template with all test types — generated via PapaParse for correctness
  const templateRows = [
    {
      testTypeId: 'focus-form',
      questionText: 'Choose the correct form: She ___ to school every day.',
      optionA: 'go',
      optionB: 'goes',
      optionC: 'going',
      optionD: 'gone',
      correctAnswer: 'B',
      explanation: 'Present simple with third person singular',
      cefrLevel: 'B1',
      difficulty: 'medium',
      testSetId: '',
      conversation: '',
      article: '',
      audioUrl: '',
      transcript: '',
    },
    {
      testTypeId: 'focus-meaning',
      questionText: 'What time is it?',
      optionA: 'It is morning.',
      optionB: "It is 3 o'clock.",
      optionC: '',
      optionD: '',
      correctAnswer: 'B',
      explanation: 'Asking about time',
      cefrLevel: 'A1',
      difficulty: 'easy',
      testSetId: '',
      conversation: JSON.stringify([{ speaker: 'A', name: 'Tom', text: 'What time is it?' }, { speaker: 'B', name: 'Jane', text: "It's 3 o'clock." }]),
      article: '',
      audioUrl: '',
      transcript: '',
    },
    {
      testTypeId: 'form-meaning',
      questionText: 'Read the article and fill in the blanks.',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctAnswer: '',
      explanation: 'Fill in the blanks',
      cefrLevel: 'B1',
      difficulty: 'medium',
      testSetId: '',
      conversation: '',
      article: JSON.stringify({ title: 'Cooking with Kids', text: 'Cooking is {{1}} fun activity. Kids love {{2}} in the kitchen.', blanks: [{ id: 1, correctAnswer: 'a' }, { id: 2, correctAnswer: 'working' }] }),
      audioUrl: '',
      transcript: '',
    },
    {
      testTypeId: 'listening',
      questionText: 'You will hear: The meeting starts at 9. What time does the meeting start?',
      optionA: '8:00',
      optionB: '9:00',
      optionC: '10:00',
      optionD: '11:00',
      correctAnswer: 'B',
      explanation: 'Listening comprehension',
      cefrLevel: 'B1',
      difficulty: 'medium',
      testSetId: '',
      conversation: '',
      article: '',
      audioUrl: 'https://example.com/audio/meeting-starts-at-9.mp3',
      transcript: 'The meeting starts at 9.',
    },
  ];

  const template = Papa.unparse(templateRows, {
    columns: [...CSV_COLUMNS],
    header: true,
  });

  return new NextResponse(template, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="questions-template.csv"',
    },
  });
}
