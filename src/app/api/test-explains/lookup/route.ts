import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { testExplains } from '@/db/schema';
import { auth } from '@/lib/auth';
import { checkUserRateLimit } from '@/lib/api-security';
import type { LessonSection } from '@/lib/lesson-sections';
import { parseContentStatus, PUBLISHED_STATUS, toLearnerExplain, toPreviewExplain } from '@/lib/explain-visibility';
import { isAdminRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * เนื้อหาที่ผู้เรียนเห็นได้จริง — null เมื่อยังไม่ published หรือทุกส่วนเป็นฉบับร่าง
 * `preview` = โหมดพรีวิวของแอดมิน (ข้ามการเช็คสถานะ แต่ยังตัดส่วนฉบับร่างออก)
 */
function learnerExplain<T extends { status: unknown; sections: unknown }>(row: T | undefined, preview = false) {
  if (!row) return null;
  const build = preview ? toPreviewExplain : toLearnerExplain;
  return build({
    ...row,
    status: parseContentStatus(row.status),
    sections: (row.sections ?? []) as LessonSection[],
  });
}

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

  // โหมดพรีวิวของแอดมิน: เห็นเนื้อหาที่ยังไม่เผยแพร่ได้ (ตรวจสิทธิ์ที่ฝั่งเซิร์ฟเวอร์เท่านั้น)
  const preview = request.nextUrl.searchParams.get('preview') === '1';
  if (preview && !(await isAdminRequest())) {
    return NextResponse.json(
      { success: false, error: 'โหมดพรีวิวใช้ได้เฉพาะบัญชีผู้ดูแล' },
      { status: 403 },
    );
  }

  try {
    const explainColumns = {
      id: testExplains.id,
      grammarTopic: testExplains.grammarTopic,
      title: testExplains.title,
      intro: testExplains.intro,
      sections: testExplains.sections,
      tip: testExplains.tip,
      status: testExplains.status,
    };
    // ลำดับความสำคัญ: เรื่องของข้อที่กำลังเปิดอยู่ก่อนเสมอ (หัวข้อตรงเป๊ะ — เทียบกับทุกหัวข้อ
    // ที่เนื้อหานั้นเชื่อมไว้ใน grammar_topics รองรับ 1 เนื้อหาครอบหลาย grammarTopic)
    // แล้วจึง fallback เป็น explain ที่ผูกกับชุดนี้
    //
    // เดิมลำดับกลับกัน (pinned ก่อน) ซึ่งใช้ได้ตอนชุดหนึ่งมีเรื่องเดียว แต่พอรวม
    // หลายเรื่องไว้ในชุดเดียว ปุ่ม “โหมดทบทวน” จะเปิดเนื้อหาของเรื่องแรกให้ทุกข้อ
    // ผู้เรียนเห็นเฉพาะเนื้อหาที่ published — draft/review/hidden แอดมินดูได้จาก
    // หน้า /admin/test-explains (และส่วนที่เป็นฉบับร่างถูกตัดออกให้ด้วย)
    // เทียบทั้งหัวข้อหลัก (grammar_topic — เข้ากันได้กับแถวเก่า) และรายการ grammar_topics
    const topicMatch = or(
      eq(testExplains.grammarTopic, topic),
      sql`${testExplains.grammarTopics} ? ${topic}`,
    );
    const [explain] = await db.select(explainColumns).from(testExplains)
      .where(preview
        ? topicMatch
        : and(topicMatch, eq(testExplains.status, PUBLISHED_STATUS)))
      .limit(1);
    const visible = learnerExplain(explain, preview);
    if (visible) {
      return NextResponse.json(
        { success: true, data: visible, ...(preview ? { preview: true } : {}) },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }
    if (setId !== null && Number.isInteger(setId) && setId > 0) {
      const pinned = await db.select(explainColumns).from(testExplains)
        .where(preview
          ? sql`${testExplains.testSetIds} @> ${JSON.stringify([setId])}::jsonb`
          : and(
            eq(testExplains.status, PUBLISHED_STATUS),
            sql`${testExplains.testSetIds} @> ${JSON.stringify([setId])}::jsonb`,
          ))
        .orderBy(asc(testExplains.id))
        .limit(1);
      const pinnedVisible = learnerExplain(pinned[0], preview);
      if (pinnedVisible) {
        return NextResponse.json(
          { success: true, data: pinnedVisible, auto: true, ...(preview ? { preview: true } : {}) },
          { headers: { 'Cache-Control': 'private, no-store' } },
        );
      }
    }
    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('[test-explains/lookup] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch explain content' }, { status: 500 });
  }
}
