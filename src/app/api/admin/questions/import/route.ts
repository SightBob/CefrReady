import { NextRequest, NextResponse } from 'next/server';
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

function validateQuestion(row: Record<string, string>, index: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rowNum = index + 1;

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
      } catch {
        errors.push(`Row ${rowNum}: "article" is not valid JSON`);
        return { valid: errors.length === 0, errors, warnings };
      }

      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        errors.push(`Row ${rowNum}: "article" must be a JSON object with {title, text, blanks}`);
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
              errors.push(`Row ${rowNum}: article.blanks[${b}].id must be a number`);
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
      } catch {
        errors.push(`Row ${rowNum}: "conversation" is not valid JSON`);
        return { valid: errors.length === 0, errors, warnings };
      }
      if (!Array.isArray(parsed)) {
        errors.push(`Row ${rowNum}: "conversation" must be a JSON array`);
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

function parseCSV(text: string): Record<string, string>[] {
  const normalized = text.replace(/\r/g, '');
  const lines = normalized.trim().split('\n');
  if (lines.length < 1) return [];

  const defaultHeaders = [
    'testTypeId','questionText','optionA','optionB','optionC','optionD',
    'correctAnswer','explanation','cefrLevel','difficulty','testSetId',
    'conversation','article',
  ];

  // Detect if first line is a header or data
  const firstLine = lines[0];
  let headers: string[];
  let startIndex: number;

  if (firstLine.startsWith('testTypeId') || firstLine.includes('testTypeId')) {
    headers = firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    startIndex = 1;
  } else {
    headers = defaultHeaders;
    startIndex = 0;
  }
  const rows: Record<string, string>[] = [];

  // Join lines that belong to the same row (multi-line quoted fields)
  const fullLines: string[] = [];
  let buffer = '';
  let quoteOpen = false;

  for (const line of lines) {
    if (buffer === '') {
      buffer = line;
    } else {
      buffer += '\n' + line;
    }
    // Count quotes in this line to track open/close state
    for (let c = 0; c < line.length; c++) {
      if (line[c] === '"') {
        if (c + 1 < line.length && line[c + 1] === '"') {
          c++; // skip escaped ""
        } else {
          quoteOpen = !quoteOpen;
        }
      }
    }
    if (!quoteOpen) {
      fullLines.push(buffer);
      buffer = '';
    }
  }
  if (buffer.trim()) fullLines.push(buffer);

  for (let i = 1; i < fullLines.length; i++) {
    const line = fullLines[i];
    if (!line.trim()) continue;

    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        if (j + 1 < line.length && line[j + 1] === '"') {
          current += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.replace(/^"|"$/g, '').trim() || '';
    });
    rows.push(row);
  }

  return rows;
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

    const rows = parseCSV(csvData);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No data rows found in CSV' }, { status: 400 });
    }

    // Validate all rows
    const validationResults = rows.map((row, idx) => validateQuestion(row, idx));
    const allErrors = validationResults.flatMap(r => r.errors);
    const allWarnings = validationResults.flatMap(r => r.warnings);

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
    const seenInFile = new Map<string, number>();
    const inFileDuplicateRows = new Set<number>();
    rows.forEach((row, idx) => {
      const key = `${row.testTypeId}::${row.questionText.toLowerCase().trim()}`;
      if (seenInFile.has(key)) {
        inFileDuplicateRows.add(idx);
        allWarnings.push(`Row ${idx + 2}: ข้อสอบซ้ำกับ Row ${seenInFile.get(key)! + 2} ในไฟล์ CSV เดียวกัน — ข้ามแถวนี้`);
      } else {
        seenInFile.set(key, idx);
      }
    });

    // ── Duplicate check: against existing DB questions ─────────────────
    const uniqueTestTypeIds = Array.from(new Set(rows.map(r => r.testTypeId).filter(Boolean)));
    let existingNormalized = new Set<string>();
    if (uniqueTestTypeIds.length > 0) {
      const existingRows = await db
        .select({ testTypeId: questions.testTypeId, questionText: questions.questionText })
        .from(questions)
        .where(inArray(questions.testTypeId, uniqueTestTypeIds));
      existingNormalized = new Set(
        existingRows.map(q => `${q.testTypeId}::${q.questionText.toLowerCase().trim()}`)
      );
    }

    const inDbDuplicateRows = new Set<number>();
    rows.forEach((row, idx) => {
      const key = `${row.testTypeId}::${row.questionText.toLowerCase().trim()}`;
      if (existingNormalized.has(key)) {
        inDbDuplicateRows.add(idx);
        allWarnings.push(`Row ${idx + 2}: ข้อสอบซ้ำกับที่มีอยู่ในระบบแล้ว — ข้ามแถวนี้`);
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
        catch { allWarnings.push(`Row ${idx + 2}: "conversation" JSON parse failed, skipping`); }
      }

      let articleData = null;
      if (row.article) {
        try { articleData = JSON.parse(row.article); }
        catch { allWarnings.push(`Row ${idx + 2}: "article" JSON parse failed, skipping`); }
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
        warnings: allWarnings,
      });
    }

    // ── Actual import ──────────────────────────────────────────────────
    const insertPayload = questionsToInsert.map(({ _originalIndex: _idx, ...rest }) => rest);
    const inserted = await db.insert(questions).values(insertPayload).returning();

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
            allWarnings.push(`Row ${i + 2}: testSetId ${setId} not found, skipping assignment`);
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
      warnings: allWarnings,
    });
  } catch (error) {
    console.error('Error importing questions:', error);
    return NextResponse.json({ error: 'Failed to import questions' }, { status: 500 });
  }
}

export async function GET() {
  // Return CSV template with all test types
  // Column order: testTypeId, questionText, optionA, optionB, optionC, optionD, correctAnswer, explanation, cefrLevel, difficulty, testSetId, conversation, article
  const template = `testTypeId,questionText,optionA,optionB,optionC,optionD,correctAnswer,explanation,cefrLevel,difficulty,testSetId,conversation,article
focus-form,"Choose the correct form: She ___ to school every day.",go,goes,going,gone,B,Present simple with third person singular,B1,medium,,,,,
focus-meaning,"What time is it?",It is morning.,It is 3 o'clock.,,,B,Asking about time,A1,easy,,"[{""speaker"":""A"",""name"":""Tom"",""text"":""What time is it?""},{""speaker"":""B"",""name"":""Jane"",""text"":""It is 3 o'"'"'clock.""}]",
form-meaning,"Read the article and fill in the blanks.",,,,,,Fill in the blanks,B1,medium,,"{""title"":""Cooking with Kids"",""text"":""Cooking is {{1}} fun activity. Kids love {{2}} in the kitchen."",""blanks"":[{""id"":1,""correctAnswer"":""a""},{""id"":2,""correctAnswer"":""working""}]}",
listening,"You will hear: The meeting starts at 9. What time does the meeting start?",8:00,9:00,10:00,11:00,B,Listening comprehension,B1,medium,,,,`;

  return new NextResponse(template, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="questions-template.csv"',
    },
  });
}