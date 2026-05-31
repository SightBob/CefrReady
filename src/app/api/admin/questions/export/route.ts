import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { db } from '@/db';
import { questions, testSetQuestions } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// Column order must match the import template exactly
const COLUMNS = [
  'testTypeId',
  'questionText',
  'optionA',
  'optionB',
  'optionC',
  'optionD',
  'correctAnswer',
  'explanation',
  'cefrLevel',
  'difficulty',
  'testSetId',
  'conversation',
  'article',
] as const;

interface CsvRow {
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
  testSetId: string;
  conversation: string;
  article: string;
}

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    // Parse optional query params for filtering
    const { searchParams } = new URL(request.url);
    const testTypeId = searchParams.get('testTypeId') || undefined;
    const cefrLevel = searchParams.get('cefrLevel') || undefined;

    // Fetch questions
    const allQuestions = await db
      .select()
      .from(questions)
      .where(
        and(
          testTypeId ? eq(questions.testTypeId, testTypeId) : undefined,
          cefrLevel ? eq(questions.cefrLevel, cefrLevel) : undefined,
        ),
      )
      .orderBy(asc(questions.id));

    if (allQuestions.length === 0) {
      return NextResponse.json({ error: 'No questions found to export' }, { status: 404 });
    }

    // Convert to CSV rows — format matches import template exactly
    const rows: CsvRow[] = allQuestions.map((q) => ({
      testTypeId: q.testTypeId,
      questionText: q.questionText,
      optionA: q.optionA ?? '',
      optionB: q.optionB ?? '',
      optionC: q.optionC ?? '',
      optionD: q.optionD ?? '',
      correctAnswer: q.correctAnswer ?? '',
      explanation: q.explanation ?? '',
      cefrLevel: q.cefrLevel,
      difficulty: q.difficulty ?? 'medium',
      testSetId: '', // Import handles test-set assignment separately
      conversation: q.conversation ? JSON.stringify(q.conversation) : '',
      article: q.article ? JSON.stringify(q.article) : '',
    }));

    // Generate CSV with PapaParse — handles quoting/escaping automatically
    const csv = Papa.unparse(rows, {
      columns: [...COLUMNS],
      header: true,
    });

    // Build filename with filter info
    const parts: string[] = ['questions'];
    if (testTypeId) parts.push(testTypeId);
    if (cefrLevel) parts.push(cefrLevel);
    parts.push(new Date().toISOString().slice(0, 10));
    const filename = `${parts.join('-')}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting questions:', error);
    return NextResponse.json({ error: 'Failed to export questions' }, { status: 500 });
  }
}
