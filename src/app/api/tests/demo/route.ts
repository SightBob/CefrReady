import { NextRequest, NextResponse } from 'next/server';
import { checkIpThrottle } from '@/lib/api-security';
import { isSectionInMaintenance } from '@/lib/test-section-maintenance';
import { fetchMixedDemoQuestions } from '@/lib/demo-set';

/**
 * GET /api/tests/demo
 * ชุดข้อสอบตัวอย่างแบบ "ปนกันทุกทักษะ" สำหรับ flow โหมดตัวอย่างใหม่
 * (/demo/intro → /demo/exam) — โครงชุดเดียวกับชุดข้อสอบจริงที่แอดมินกำหนด
 * (is_demo + demoOrder + tap/article slots) ผสมกันทุกทักษะ — ดูรายละเอียด
 * ที่ src/lib/demo-set.ts
 *
 * กติกาความปลอดภัยเดียวกับ /api/tests/[type] โหมด demo:
 * - จำกัดรวมไม่เกิน 10 ข้อ (max 10 ข้อต่อทักษะก่อนผสม)
 * - ส่ง correctAnswer + explanation ออกได้เพราะเป็นข้อมูลสาธารณะที่ตั้งใจให้เฉลยทันที
 * - ทักษะที่แอดมินปิดปรับปรุง (maintenance) จะไม่มีข้อออกจาก API
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: throttle เหมือน /api/tests/[type] — public endpoint ที่ query ตาราง questions ตรง ๆ
    const ipThrottleError = await checkIpThrottle(request, {
      keySuffix: 'tests-demo-mixed',
      maxRequests: 30,
    });
    if (ipThrottleError) return ipThrottleError;

    const mixed = await fetchMixedDemoQuestions();

    return NextResponse.json({
      success: true,
      data: mixed,
      count: mixed.length,
      isDemo: true,
    });
  } catch (error) {
    console.error('Error fetching mixed demo questions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch demo questions' },
      { status: 500 }
    );
  }
}
