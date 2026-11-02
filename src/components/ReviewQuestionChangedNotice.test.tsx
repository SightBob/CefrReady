import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ReviewQuestionChangedNotice from './ReviewQuestionChangedNotice';

describe('ReviewQuestionChangedNotice', () => {
  it('แจ้งว่าโจทย์ถูกแก้หลังทำข้อสอบ และแสดงผลที่บันทึกว่า "ตอบผิด"', () => {
    const html = renderToStaticMarkup(<ReviewQuestionChangedNotice isCorrect={false} />);

    expect(html).toContain('ข้อนี้ถูกปรับปรุงหลังคุณทำข้อสอบ');
    expect(html).toContain('ผลที่บันทึกไว้ตอนนั้น');
    expect(html).toContain('ตอบผิด');
    expect(html).not.toContain('ตอบถูก');
    // ต้องไม่แสดงเฉลย/ตัวเลือกของเวอร์ชันใหม่
    expect(html).not.toContain('Correct:');
  });

  it('แสดงผลที่บันทึกว่า "ตอบถูก" เมื่อคำตอบเดิมถูก', () => {
    const html = renderToStaticMarkup(<ReviewQuestionChangedNotice isCorrect />);

    expect(html).toContain('ตอบถูก');
    expect(html).not.toContain('ตอบผิด');
  });
});
