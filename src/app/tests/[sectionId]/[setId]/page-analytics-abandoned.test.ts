/**
 * test_abandoned ต้องรอดถึง PostHog ตอนผู้ใช้ปิดหน้า
 *
 * เดิมใช้ posthog.capture() เฉย ๆ ใน listener ของ pagehide ซึ่งลงทะเบียน
 * "หลัง" listener ที่ PostHog สร้างไว้เองตอน init → flush ของ PostHog ทำงาน
 * ก่อน event ของเราจะเข้าคิว ผลคือ event ค้างในหน่วยความจำและหายไปพร้อมหน้า
 *
 * แก้ด้วยการบังคับส่งทันทีผ่าน sendBeacon ซึ่งเบราว์เซอร์ยังส่งต่อให้แม้หน้า
 * เพจถูกปิดไปแล้ว
 *
 * เทสอ่านซอร์สตรง (แนวเดียวกับ page-refresh-state.test.ts) เพราะหน้าเป็น
 * client component ขนาดใหญ่ที่ผูกกับ API หลายตัว
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pageSrc = readFileSync(
  join(process.cwd(), 'src/app/tests/[sectionId]/[setId]/page.tsx'),
  'utf8',
);

const abandonEffect = pageSrc.slice(
  pageSrc.indexOf('// test_abandoned'),
  pageSrc.indexOf('const getQuestionChoices'),
);

describe('test_abandoned ส่งถึง PostHog แม้หน้าเพจถูกปิด', () => {
  it('ผูก listener กับ pagehide', () => {
    expect(abandonEffect).toContain("window.addEventListener('pagehide', onPageHide)");
    expect(abandonEffect).toContain("window.removeEventListener('pagehide', onPageHide)");
  });

  it('ตอน unload ส่งแบบ sendBeacon ทันที ไม่รอ batch', () => {
    expect(abandonEffect).toContain('send_instantly: true');
    expect(abandonEffect).toContain("transport: 'sendBeacon'");
  });

  it('ตอนออกด้วยการเปลี่ยนหน้าในแอป (unmount) ส่งแบบปกติ', () => {
    // cleanup ต้องเรียกด้วย unload = false ไม่ใช่ true
    expect(abandonEffect).toContain('fireAbandoned(false);');
    expect(abandonEffect).toContain('const onPageHide = () => fireAbandoned(true);');
  });

  it('กันส่งซ้ำเมื่อส่งข้อสอบไปแล้วหรือส่งไปแล้วครั้งหนึ่ง', () => {
    expect(abandonEffect).toContain('if (submittedRef.current || abandonSentRef.current) return;');
  });

  it('ยังแนบข้อมูลที่ใช้วินิจฉัยครบ', () => {
    for (const key of [
      'section_id',
      'test_set_id',
      'attempt_key',
      'answered_count',
      'total_questions',
      'time_spent_seconds',
      'last_question_position',
    ]) {
      expect(abandonEffect).toContain(`${key}:`);
    }
  });
});
