import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { testExplains } from '@/db/schema';
import { auth } from '@/lib/auth';
import { checkUserRateLimit } from '@/lib/api-security';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  const rateLimitResponse = await checkUserRateLimit(userId, { windowMs: 60_000, maxRequests: 30, keySuffix: 'test-explains' });
  if (rateLimitResponse) return rateLimitResponse;

  const topic = request.nextUrl.searchParams.get('topic')?.trim();
  if (!topic || topic.length > 200) return NextResponse.json({ success: false, error: 'Invalid topic' }, { status: 400 });
  const setIdParam = request.nextUrl.searchParams.get('setId');
  const setId = setIdParam ? Number(setIdParam) : null;

  try {
    const explainColumns = {
      id: testExplains.id,
      grammarTopic: testExplains.grammarTopic,
      title: testExplains.title,
      intro: testExplains.intro,
      sections: testExplains.sections,
      tip: testExplains.tip,
    };
    // Explain ที่ผูกกับชุดข้อสอบนี้ไว้ (test_set_ids) มาก่อน — ใช้แสดงอัตโนมัติ
    // เมื่อเริ่มทำชุด; ถ้าไม่มี fallback หาจาก grammarTopic ตามเดิม
    if (setId !== null && Number.isInteger(setId) && setId > 0) {
      const pinned = await db.select(explainColumns).from(testExplains)
        .where(and(
          eq(testExplains.isPublished, true),
          sql`${testExplains.testSetIds} @> ${JSON.stringify([setId])}::jsonb`,
        ))
        .orderBy(asc(testExplains.id))
        .limit(1);
      if (pinned.length > 0) {
        return NextResponse.json({ success: true, data: pinned[0], auto: true }, { headers: { 'Cache-Control': 'private, no-store' } });
      }
    }
    const [explain] = await db.select(explainColumns).from(testExplains)
      .where(and(eq(testExplains.grammarTopic, topic), eq(testExplains.isPublished, true)))
      .limit(1);
    if (!explain) return NextResponse.json({ success: true, data: null });
    return NextResponse.json({ success: true, data: explain }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[test-explains/lookup] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch explain content' }, { status: 500 });
  }
}
