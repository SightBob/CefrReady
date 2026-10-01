import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
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

  try {
    const [explain] = await db.select({
      id: testExplains.id,
      grammarTopic: testExplains.grammarTopic,
      title: testExplains.title,
      intro: testExplains.intro,
      sections: testExplains.sections,
      tip: testExplains.tip,
    }).from(testExplains)
      .where(and(eq(testExplains.grammarTopic, topic), eq(testExplains.isPublished, true)))
      .limit(1);
    if (!explain) return NextResponse.json({ success: true, data: null });
    return NextResponse.json({ success: true, data: explain }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[test-explains/lookup] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch explain content' }, { status: 500 });
  }
}
