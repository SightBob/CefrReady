import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, testSetQuestions, testSets } from '@/db/schema';
import { eq, count as drizzleCount, and } from 'drizzle-orm';
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
  difficulty: string;
  testSetId?: number;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateQuestion(row: Record<string, string>, index: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  const requiredFields = ['testTypeId', 'questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'cefrLevel'];
  for (const field of requiredFields) {
    if (!row[field]?.trim()) {
      errors.push(`Row ${index + 1}: Missing required field "${field}"`);
    }
  }

  // Validate testTypeId
  const validTestTypes = ['focus-form', 'focus-meaning', 'form-meaning', 'listening'];
  if (row.testTypeId && !validTestTypes.includes(row.testTypeId)) {
    errors.push(`Row ${index + 1}: Invalid testTypeId "${row.testTypeId}". Must be one of: ${validTestTypes.join(', ')}`);
  }

  // Validate correctAnswer
  if (row.correctAnswer && !['A', 'B', 'C', 'D'].includes(row.correctAnswer.toUpperCase())) {
    errors.push(`Row ${index + 1}: Invalid correctAnswer "${row.correctAnswer}". Must be A, B, C, or D`);
  }

  // Validate CEFR level
  const validCefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  if (row.cefrLevel && !validCefrLevels.includes(row.cefrLevel)) {
    errors.push(`Row ${index + 1}: Invalid cefrLevel "${row.cefrLevel}". Must be one of: ${validCefrLevels.join(', ')}`);
  }

  // Validate difficulty
  const validDifficulties = ['easy', 'medium', 'hard'];
  if (row.difficulty && !validDifficulties.includes(row.difficulty.toLowerCase())) {
    warnings.push(`Row ${index + 1}: Unknown difficulty "${row.difficulty}". Using default`);
  }

  // Validate testSetId (optional)
  if (row.testSetId && row.testSetId.trim()) {
    const setId = parseInt(row.testSetId.trim());
    if (isNaN(setId)) {
      errors.push(`Row ${index + 1}: Invalid testSetId "${row.testSetId}". Must be a number.`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
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
    const { csvData } = body;

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

    // Import valid questions
    const questionsToInsert = rows.map(row => ({
      testTypeId: row.testTypeId,
      questionText: row.questionText,
      optionA: row.optionA,
      optionB: row.optionB,
      optionC: row.optionC,
      optionD: row.optionD,
      correctAnswer: row.correctAnswer.toUpperCase(),
      explanation: row.explanation || '',
      cefrLevel: row.cefrLevel,
      difficulty: row.difficulty?.toLowerCase() || 'medium',
    }));

    const inserted = await db.insert(questions).values(questionsToInsert).returning();

    // Auto-assign to test sets if testSetId is provided
    let assignedCount = 0;
    const assignments: { questionId: number; testSetId: number }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.testSetId?.trim()) {
        const setId = parseInt(row.testSetId.trim());
        if (!isNaN(setId) && inserted[i]) {
          // Verify set exists
          const [set] = await db.select().from(testSets).where(eq(testSets.id, setId)).limit(1);
          if (set) {
            // Check for duplicate
            const [existing] = await db.select()
              .from(testSetQuestions)
              .where(and(eq(testSetQuestions.testSetId, setId), eq(testSetQuestions.questionId, inserted[i].id)));

            if (!existing) {
              // Get next order index
              const [countRow] = await db
                .select({ cnt: drizzleCount() })
                .from(testSetQuestions)
                .where(eq(testSetQuestions.testSetId, setId));
              const nextOrder = countRow?.cnt ?? 0;

              assignments.push({ questionId: inserted[i].id, testSetId: setId, ...{ orderIndex: nextOrder } } as never);
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
      message: `Successfully imported ${inserted.length} questions${assignedCount > 0 ? ` and assigned ${assignedCount} to test sets` : ''}`,
      importedCount: inserted.length,
      assignedCount,
      warnings: allWarnings,
    });
  } catch (error) {
    console.error('Error importing questions:', error);
    return NextResponse.json({ error: 'Failed to import questions' }, { status: 500 });
  }
}

export async function GET() {
  // Return CSV template
  const template = `testTypeId,questionText,optionA,optionB,optionC,optionD,correctAnswer,explanation,cefrLevel,difficulty,testSetId
focus-form,Choose the correct form: She ___ to school every day.,go,goes,going,gone,B,Present simple with third person singular,B1,medium,
focus-meaning,"A: What time is it? B: ___",It's morning.,It's 3 o'clock.,It's Monday.,It's sunny.,B,Asking about time,A1,easy,
form-meaning,The ___ is very large. (animal),cat,elephant,mouse,bird,B,Vocabulary - animals,A1,easy,
listening,You will hear: "The meeting starts at 9." What time does the meeting start?,8:00,9:00,10:00,11:00,B,Listening comprehension,B1,medium,
`;

  return new NextResponse(template, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="questions-template.csv"',
    },
  });
}