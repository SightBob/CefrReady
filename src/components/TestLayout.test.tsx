import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
import TestLayout from './TestLayout';

describe('TestLayout primary teaching action', () => {
  it('preserves ordinary next and final-check buttons without an override', () => {
    const next = renderToStaticMarkup(<TestLayout totalQuestions={2} currentQuestion={0} answers={['A', null]}><p>Question</p></TestLayout>);
    const last = renderToStaticMarkup(<TestLayout totalQuestions={2} currentQuestion={1} answers={['A', 'B']}><p>Question</p></TestLayout>);
    expect(next).toContain('>ข้อต่อไป</span>');
    expect(last).toContain('>ตรวจคำตอบ</span>');
  });
  it('shows the teaching check before final submission, with disabled state', () => {
    const html = renderToStaticMarkup(<TestLayout totalQuestions={1} currentQuestion={0} answers={['A']} primaryAction={{ label: 'กำลังตรวจ…', onClick: () => undefined, disabled: true }}><p>Question</p></TestLayout>);
    expect(html).toContain('>กำลังตรวจ…</span>'); expect(html).not.toContain('>ตรวจคำตอบ</span>');
    expect(html).toContain('disabled=""');
  });
  it('shows an admin preview notice above the question, and nothing when it is not passed', () => {
    const plain = renderToStaticMarkup(
      <TestLayout totalQuestions={1} currentQuestion={0} answers={[null]}><p>Question</p></TestLayout>
    );
    expect(plain).not.toContain('border-amber-300');
    expect(plain).not.toContain('role="status"');

    const preview = renderToStaticMarkup(
      <TestLayout totalQuestions={1} currentQuestion={0} answers={[null]} notice="โหมดพรีวิวสำหรับแอดมิน"><p>Question</p></TestLayout>
    );
    expect(preview).toContain('โหมดพรีวิวสำหรับแอดมิน');
    for (const token of ['role="status"', 'mb-4 rounded-2xl border-[1.4px]', 'border-amber-300', 'bg-amber-50', 'text-amber-800']) {
      expect(preview).toContain(token);
    }
    expect(preview.indexOf('โหมดพรีวิวสำหรับแอดมิน')).toBeLessThan(preview.indexOf('<p>Question</p>'));
  });

  it('keeps the exit confirmation out of the DOM until it is opened', () => {
    // เดิมกล่องนี้อยู่ใน DOM ตลอดเวลาและซ่อนด้วย opacity-0 ปุ่มที่มองไม่เห็นจึงยัง
    // focus ได้ และกด Enter ก็ออกจากข้อสอบได้ทั้งที่ผู้ใช้ไม่เห็นปุ่ม
    const html = renderToStaticMarkup(
      <TestLayout totalQuestions={2} currentQuestion={0} answers={[null, null]}><p>Question</p></TestLayout>
    );
    expect(html).not.toContain('ออกจากข้อสอบ?');
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain('คำตอบของคุณจะไม่ถูกบันทึก');
  });

  it('can label submission separately after the final Tap feedback', () => {
    const html = renderToStaticMarkup(<TestLayout totalQuestions={1} currentQuestion={0} answers={['A']} primaryAction={{ label: 'ส่งคำตอบ', onClick: () => undefined }}><p>Question</p></TestLayout>);
    expect(html).toContain('>ส่งคำตอบ</span>');
  });
});

describe('TestLayout progress bar', () => {
  // หน้าที่บังคับให้กด "ตรวจคำตอบ" ก่อนเฉลย: เลือกคำตอบอย่างเดียวยังข้าม
  // ข้อถัดไปไม่ได้ แถบจึงต้องนับเฉพาะข้อที่ตรวจแล้ว ไม่ใช่ข้อที่เลือกแล้ว
  it('holds the bar at 0% while a choice is selected but not yet checked', () => {
    const html = renderToStaticMarkup(
      <TestLayout totalQuestions={2} currentQuestion={0} answers={['A', null]} checkedCount={0}>
        <p>Question</p>
      </TestLayout>
    );
    expect(html).toContain('width:0%');
    expect(html).toContain('>0/2</span>');
  });

  it('advances by one only after the check, not by the selected choice', () => {
    const html = renderToStaticMarkup(
      <TestLayout totalQuestions={2} currentQuestion={1} answers={['A', 'B']} checkedCount={1}>
        <p>Question</p>
      </TestLayout>
    );
    expect(html).toContain('width:50%');
    expect(html).toContain('>1/2</span>');
  });

  // ไม่ส่ง checkedCount = หน้าที่ไม่มีปุ่มตรวจ (full exam, demo เฉพาะทักษะ)
  // ต้องยังนับตามที่เลือกคำตอบเหมือนเดิม ไม่ให้แถบหายทั้งหมด
  it('falls back to counting selected answers when checkedCount is not passed', () => {
    const html = renderToStaticMarkup(
      <TestLayout totalQuestions={4} currentQuestion={0} answers={['A', 'B', 'C', null]}>
        <p>Question</p>
      </TestLayout>
    );
    expect(html).toContain('width:75%');
    expect(html).toContain('>3/4</span>');
  });

  // แผงเลขข้อ/กติกาส่งยังนับจาก "ตอบแล้ว" เพราะเป็นคนละเรื่องกับความคืบหน้า
  // ข้อ 1 เลือกแล้วแต่ยังไม่ตรวจ → ต้องยังขึ้นว่า "ตอบแล้ว" ไม่ใช่ "ยังไม่ได้ตอบ"
  // ขณะที่แถบความคืบหน้ายังเป็น 0
  it('keeps the question map on answeredCount while the bar follows checkedCount', () => {
    const html = renderToStaticMarkup(
      <TestLayout totalQuestions={2} currentQuestion={0} answers={['A', null]} checkedCount={0}>
        <p>Question</p>
      </TestLayout>
    );
    expect(html).toContain('aria-label="ข้อ 1: ตอบแล้ว"');
    expect(html).toContain('width:0%');
  });
});
