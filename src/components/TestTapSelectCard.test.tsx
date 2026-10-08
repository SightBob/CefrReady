import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import TestTapSelectCard from './TestTapSelectCard';

const props = { title: 'Tap & Select', item: { prompt: 'She ___ daily.', choiceA: 'goes', choiceB: 'go' }, itemIndex: 0, onAnswer: () => undefined };
describe('Tap & Select reasoning UI', () => {
  it('only shows the reason input after selecting a choice', () => {
    expect(renderToStaticMarkup(<TestTapSelectCard {...props} selectedAnswer={null} />)).not.toContain('เหตุผลที่เลือกข้อนี้');
    const html = renderToStaticMarkup(<TestTapSelectCard {...props} selectedAnswer="A" />);
    expect(html).toContain('aria-label="เหตุผลที่เลือกข้อนี้"');
    expect(html).toContain('maxLength="1500"');
    expect(html).not.toContain('+ 50');
  });
  it('distinguishes a correct selected choice from incorrect understanding', () => {
    const html = renderToStaticMarkup(<TestTapSelectCard {...props} selectedAnswer="A" answerIsCorrect feedback={{ isCorrect: true, ai: { understanding: 'incorrect', feedback: 'เหตุผลยังคลาดเคลื่อน' } }} />);
    expect(html).toContain('ตัวเลือกถูกต้อง');
    expect(html).toContain('ยังเข้าใจคลาดเคลื่อน');
    expect(html).toContain('เหตุผลยังคลาดเคลื่อน');
    // หมายเหตุใต้ช่องพิมพ์ถูกถอดออกจาก UI แล้ว — ล็อกไว้ไม่ให้กลับมาโดยไม่ตั้งใจ
    expect(html).not.toContain('ไม่เปลี่ยนคะแนนสอบ');
  });
  it('reveals the answer as soon as it is known, without any extra request', () => {
    const right = renderToStaticMarkup(<TestTapSelectCard {...props} selectedAnswer="A" answerIsCorrect />);
    expect(right).toContain('bg-[#ECFDF5]');            // ถูก → เขียว
    expect(right).toContain('bg-[#10B981]');            // กรอบตัวอักษรเขียว
    expect(right).not.toContain('bg-[#EEEEEE]');        // ไม่มีสีของ “ผิด”
    expect(right).toContain('เฉลยแล้ว — พิมพ์เหตุผลของคุณ');

    const wrong = renderToStaticMarkup(<TestTapSelectCard {...props} selectedAnswer="A" answerIsCorrect={false} />);
    expect(wrong).toContain('bg-[#EEEEEE]');            // ผิด → เทา
    expect(wrong).not.toContain('bg-[#ECFDF5]');
  });
  it('never paints the selected choice as wrong before it can know the answer', () => {
    const html = renderToStaticMarkup(<TestTapSelectCard {...props} selectedAnswer="A" />);
    // เคยเป็นบั๊ก: สถานะ “เลือกแล้วยังไม่รู้ผล” ใช้เทาเดียวกับ “ตอบผิด” ทำให้อ่านว่าตอบผิด
    expect(html).not.toContain('bg-[#EEEEEE]');
    expect(html).toContain(      'เลือกแล้ว — พิมพ์เหตุผล');
  });
  it('escapes untrusted AI feedback instead of rendering HTML', () => {
    const html = renderToStaticMarkup(<TestTapSelectCard {...props} selectedAnswer="A" feedback={{ isCorrect: true, ai: { understanding: 'correct', feedback: '<script>alert(1)</script>' } }} />);
    expect(html).not.toContain('<script>'); expect(html).toContain('&lt;script&gt;');
  });
  it('disables the reason input while checking and exposes retry/skip errors', () => {
    const html = renderToStaticMarkup(<TestTapSelectCard {...props} selectedAnswer="A" checking error="ลองอีกครั้ง" onSkipFeedback={() => undefined} />);
    expect(html).toContain('disabled=""'); expect(html).toContain('AI กำลังตรวจความเข้าใจ');
    expect(html).toContain('role="alert"'); expect(html).toContain('ข้ามการตรวจและทำต่อ');
  });
});
