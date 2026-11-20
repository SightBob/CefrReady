/**
 * อีเวนต์ฝั่ง client ที่เพิ่มใน Phase 2 — กันการต่อสายหลุด
 *
 * เทสอ่านซอร์สตรง (แนวเดียวกับ page-refresh-state.test.ts) เพราะทั้งหน้าเป็น
 * client component ขนาดใหญ่ และ effect จะไม่ทำงานตอน render แบบ static
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (relative: string) => readFileSync(join(process.cwd(), relative), 'utf8');

const pageSrc = read('src/app/tests/[sectionId]/[setId]/page.tsx');
const resultsSrc = read('src/components/TestResults.tsx');
const loginSrc = read('src/app/login/LoginPanel.tsx');

describe('question_viewed — ข้อที่ผู้เรียนเปิดเห็น', () => {
  const effect = pageSrc.slice(
    pageSrc.indexOf('// question_viewed'),
    pageSrc.indexOf('const getQuestionChoices'),
  );

  it('ยิงเมื่อเปลี่ยนข้อ พร้อมข้อมูลที่ใช้หาจุดหลุด', () => {
    expect(effect).toContain("posthog.capture('question_viewed'");
    for (const key of ['slot_index', 'slot_kind', 'total_slots', 'cefr_level', 'answered_before']) {
      expect(effect).toContain(`${key}:`);
    }
  });

  it('ยิงครั้งเดียวต่อข้อต่อรอบ (ย้อนกลับมาไม่นับซ้ำ)', () => {
    expect(effect).toContain('viewedSlotsRef.current.has(marker)');
    expect(effect).toContain('viewedSlotsRef.current.add(marker)');
    expect(effect).toContain('${attemptKeyValue}:${currentQuestion}');
  });

  it('ไม่ยิงถ้ารอบนี้ยังไม่เริ่ม (หน้ากำลังแสดงผลสอบ)', () => {
    expect(effect).toContain('testStartedAtRef.current === 0');
  });
});

describe('result_action — ไปต่อหรือออกจากหน้าผลสอบ', () => {
  it('ปุ่ม "ทำอีกครั้ง" ส่ง retake ก่อนเรียก onRestart', () => {
    expect(resultsSrc).toContain("trackResultAction('retake')");
    expect(resultsSrc).toContain('onRestart();');
  });

  it('ปุ่ม "จบการสอบ" ส่ง finish', () => {
    expect(resultsSrc).toContain("trackResultAction('finish')");
  });

  it('แนบ attempt_id เพื่อ join กับ event อื่นของรอบเดียวกัน', () => {
    expect(resultsSrc).toContain("posthog?.capture('result_action'");
    expect(resultsSrc).toContain('attempt_id: attemptId ?? null');
  });
});

describe('gate_viewed — กำแพงล็อกอิน', () => {
  it('ยิงตอนเปิดหน้า login พร้อมปลายทางที่ถูกเด้งมา', () => {
    expect(loginSrc).toContain("posthog.capture('gate_viewed'");
    expect(loginSrc).toContain('callback_url: callbackUrl');
  });

  it('แยกได้ว่ามาจากหน้าข้อสอบหรือเข้าหน้านี้ตรง ๆ', () => {
    expect(loginSrc).toContain("from: callbackUrl.startsWith('/tests') ? 'tests_gate' : 'login_page'");
  });
});
