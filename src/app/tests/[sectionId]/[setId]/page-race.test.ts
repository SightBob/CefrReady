/**
 * ต้องกันไม่ให้ response ของชุดเก่าทับ state ของชุดใหม่ในหน้า practice
 *
 * fetchSet เดิมไม่มี AbortController และไม่มี request-id guard เลย
 * สลับชุดเร็ว ๆ แล้ว response เก่าจะทับของใหม่
 *
 * ทดสอบที่ระดับ source เพราะหน้านี้เป็น client component ขนาดใหญ่ที่ต้อง mock
 * dependency จำนวนมาก ตรรกะการกัน race จริงอยู่ใน src/lib/latest-request.ts
 * ซึ่งมีเทสต์เต็มอยู่แล้ว
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = join(process.cwd(), 'src/app/tests/[sectionId]/[setId]/page.tsx');

describe('fetchSet ต้องกัน race เมื่อสลับชุด', () => {
  const src = readFileSync(PAGE, 'utf8');
  const end = src.indexOf('}, [setId, previewMode, setRequestGuard]');
  const fetchSet = src.slice(src.indexOf('const fetchSet'), end);

  it('ใช้ createLatestRequestGuard', () => {
    expect(src).toContain('createLatestRequestGuard');
    expect(fetchSet).toContain('setRequestGuard.begin()');
  });

  it('ส่ง signal ให้ fetch ทุกคำขอใน fetchSet', () => {
    expect(fetchSet).toContain('{ signal }');
    expect(fetchSet.match(/signal/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it('เช็ค isCurrent() ก่อนแตะ state ทุกจุด', () => {
    expect(fetchSet).toContain('if (!isCurrent()) return;');
  });

  it('ไม่ตั้ง notFound เมื่อ request ถูก abort', () => {
    // catch ต้องออกทันทีเมื่อเป็น abort ไม่งั้นจะเด้งหน้า notFound ทั้งที่ผู้เรียนแค่สลับชุด
    expect(fetchSet).toContain('if (isAbortError(err)) return;');
    const catchBlock = fetchSet.slice(fetchSet.indexOf('} catch (err) {'));
    expect(catchBlock.indexOf('isAbortError')).toBeGreaterThan(-1);
    expect(catchBlock.indexOf('isAbortError')).toBeLessThan(catchBlock.indexOf('setNotFound(true)'));
  });

  it('abort ตอน unmount', () => {
    expect(src).toContain('setRequestGuard.abort()');
  });
});