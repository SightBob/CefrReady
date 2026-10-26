import { NextRequest, NextResponse } from 'next/server';
import { getCachedVerbEntries } from '@/lib/verb-bank-data';
import { checkIpThrottle } from '@/lib/api-security';

export const dynamic = 'force-dynamic';

/**
 * GET /api/verb-banks — คลังกริยา 3 ช่องสำหรับ sidebar ในหน้าสอบ
 * อ่านอย่างเดียว ไม่มีข้อมูลเฉลย จึงเปิดสาธารณะได้ (คล้าย /api/tests/[type])
 */
export async function GET(request: NextRequest) {
  try {
    const ipThrottleError = await checkIpThrottle(request, {
      keySuffix: 'verb-banks',
      maxRequests: 60,
    });
    if (ipThrottleError) return ipThrottleError;

    const data = await getCachedVerbEntries();

    // คลังกริยาเป็นข้อมูลอ่านอย่างเดียว เปลี่ยนน้อย — ให้ CDN แชร์ได้
    // (หน้าสอบยิง endpoint นี้ทุกครั้งที่เปิดชุด ถ้าแคชที่ edge จะไม่ต้องรอ DB)
    return NextResponse.json(
      { success: true, data, total: data.length },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch (err) {
    console.error('[verb-banks] GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch verb bank' }, { status: 500 });
  }
}