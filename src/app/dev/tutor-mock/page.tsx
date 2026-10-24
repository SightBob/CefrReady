import { notFound } from 'next/navigation';

import FocusFormTutorMock from '@/components/FocusFormTutorMock';

/**
 * หน้า mock การออกแบบ AI Tutor (Figma 580:27829) — เฉพาะงานพัฒนา
 *
 * - NODE_ENV = production ตอบ 404 เสมอ ไม่มีการ deploy ต่อผู้เรียน
 * - dev แสดงได้ตามปกติ ไม่หลุดและไม่ลัด auth ใด ๆ (มีแค่บดิสเพลย์แบบดีไซน์เท่านั้น)
 * - หน้าข้อสอบจริงจะใช้กรอบ AI Tutor ที่ `/components/AiTutorPanel` เมื่อ feature flag
 *   ฝั่งของเซิร์ฟเวอร์เปิดให้ผู้ใช้คนนั้น (ดู src/lib/ai-tutor.ts)
 */
export const metadata = { title: 'AI Tutor — Mock (dev)' };

export default function TutorMockDevPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <FocusFormTutorMock />;
}
