/**
 * ?tutor=1 ถูกเลิกใช้แล้ว — หน้าข้อสอบจริงไปหา AI Tutor ทางธงฝั่งเซิร์ฟเวอร์
 * (/api/tests/ai-tutor-access) เท่านั้น และหน้า mock ย้ายไป /dev/tutor-mock
 *
 * เทสอ่านซอร์สตรง (แนวเดียวกับ page-apifetch.test.ts) เพื่อการันตีว่าไม่มีโค้ด
 * อ่าน query "tutor" หรือ import mock กลับมาโดยพลการ
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pageSrc = readFileSync(
  join(process.cwd(), 'src/app/tests/[sectionId]/[setId]/page.tsx'),
  'utf8',
);

const devRouteSrc = readFileSync(
  join(process.cwd(), 'src/app/dev/tutor-mock/page.tsx'),
  'utf8',
);

describe('หน้าข้อสอบจริงไม่มี ?tutor=1 อีกต่อไป', () => {
  it('ไม่อ่าน query "tutor"', () => {
    expect(pageSrc).not.toContain("searchParams.get('tutor')");
    expect(pageSrc).not.toContain('tutorMock');
  });

  it('ไม่ import รหัสหน้า mock มาแสดงใน URL ข้อสอบ', () => {
    expect(pageSrc).not.toContain('FocusFormTutorMock');
  });

  it('ธง AI Tutor มาจากเซิร์ฟเวอร์ทาง /api/tests/ai-tutor-access — ไม่ใช่อ่าน env ฝั่ง client', () => {
    expect(pageSrc).toContain("apiFetch('/api/tests/ai-tutor-access')");
    expect(pageSrc).not.toContain('process.env.NEXT_PUBLIC');
  });

  it('หน้า mock ย้ายไป /dev/tutor-mock และตอบ 404 เมื่อ production', () => {
    expect(devRouteSrc).toContain("process.env.NODE_ENV === 'production'");
    expect(devRouteSrc).toContain('notFound()');
    // ไม่ข้าม auth: ไม่มีการจัดการเซสชันพิเศษที่ฝั่ง mock dev
    expect(devRouteSrc).not.toContain('useSession');
  });
});
