import { NextResponse } from 'next/server';
import { asc, count, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const data = await db.select({ grammarTopic: questions.grammarTopic, questionCount: count() })
      .from(questions)
      .where(isNotNull(questions.grammarTopic))
      .groupBy(questions.grammarTopic)
      .orderBy(asc(questions.grammarTopic));
    return NextResponse.json({ success: true, data: data.filter((topic) => topic.grammarTopic?.trim()).map((topic) => ({ ...topic, grammarTopic: topic.grammarTopic!.trim() })) });
  } catch (error) {
    console.error('[admin/test-explains/topics] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch question topics' }, { status: 500 });
  }
}
