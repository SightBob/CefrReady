import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { verbBanks } from '@/db/schema';
import { asc } from 'drizzle-orm';
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

    const data = await db
      .select({ id: verbBanks.id, v1: verbBanks.v1, v2: verbBanks.v2, v3: verbBanks.v3 })
      .from(verbBanks)
      .orderBy(asc(verbBanks.id));

    return NextResponse.json({ success: true, data, total: data.length });
  } catch (err) {
    console.error('[verb-banks] GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch verb bank' }, { status: 500 });
  }
}