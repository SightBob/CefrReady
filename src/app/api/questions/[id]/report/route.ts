import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, questionReports } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

const VALID_ISSUE_TYPES = ['wrong_answer', 'missing_option', 'unclear_language', 'audio_problem', 'other'];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const questionId = parseInt(id);
    if (isNaN(questionId)) {
      return NextResponse.json({ error: 'Invalid question ID' }, { status: 400 });
    }

    const body = await req.json();
    const { issueType, comment } = body;

    if (!issueType || !VALID_ISSUE_TYPES.includes(issueType)) {
      return NextResponse.json(
        { error: 'Invalid issueType', validTypes: VALID_ISSUE_TYPES },
        { status: 400 }
      );
    }

    // ตรวจว่า question มีอยู่จริง
    const [question] = await db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.id, questionId));

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Anonymous หรือ logged-in ก็ได้
    const session = await auth();

    const [report] = await db
      .insert(questionReports)
      .values({
        questionId,
        userId: session?.user?.id ?? null,
        issueType,
        comment: comment?.trim() || null,
        status: 'pending',
      })
      .returning();

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('[POST /api/questions/[id]/report] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
