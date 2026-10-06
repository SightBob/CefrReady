import { NextResponse } from 'next/server';
import { getSectionMaintenanceMap } from '@/lib/test-section-maintenance';

/**
 * Public read-only: พาร์ทข้อสอบไหนปิดปรับปรุงอยู่
 * ใช้โดยหน้า /tests กับ /tests/[sectionId] เพื่อ gate การเข้าสอบ
 * Fail-open (คืน false ทุกพาร์ทเมื่อ Redis ล่ม) — ตาม lib
 */

export async function GET() {
  const sections = await getSectionMaintenanceMap();
  return NextResponse.json(
    { sections },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
