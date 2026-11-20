'use client';

import { useEffect } from 'react';
import { usePostHog } from '@/lib/posthog';

/**
 * Trackers เล็ก ๆ สำหรับหน้าที่เป็น server component
 *
 * หน้า /intro และ /explain ของชุดข้อสอบเป็น server component จึงผูก PostHog
 * ตรง ๆ ไม่ได้ — component พวกนี้เรนเดอร์ null แล้วยิง event ตอน mount แทน
 * (แยกไฟล์เพื่อไม่ต้องแปลงหน้า server เป็น client ทั้งหน้า)
 */

/** เปิดหน้าชุดข้อสอบ (intro) — ขั้นก่อนกดเริ่มทำจริง */
export function SetViewTracker({
  sectionId,
  testSetId,
  questionCount,
}: {
  sectionId: string;
  testSetId: number | string;
  questionCount: number;
}) {
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.capture('set_viewed', {
      section_id: sectionId,
      test_set_id: testSetId,
      question_count: questionCount,
    });
  }, [posthog, sectionId, testSetId, questionCount]);

  return null;
}

/** เปิดหน้าเนื้อหาอธิบายก่อนทำข้อสอบ — วัดว่า "อ่านก่อนสอบ" ช่วยจริงไหม */
export function ExplainViewTracker({
  sectionId,
  testSetId,
  topicCount,
}: {
  sectionId: string;
  testSetId: number | string;
  topicCount: number;
}) {
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.capture('explain_viewed', {
      section_id: sectionId,
      test_set_id: testSetId,
      topic_count: topicCount,
    });
  }, [posthog, sectionId, testSetId, topicCount]);

  return null;
}
