/**
 * โหมด aiTutor ของการ์ด (ผู้ใช้กำหนด 2026-10-25 ตาม Figma 600:27645):
 * ตอนเฉลย ยังขึ้นบล็อก "แวะอ่านสักนิด…" เหมือนเดิม + มีปุ่ม
 * "หากยังไม่เข้าใจ ลองถาม AI เพิ่มเติมได้เลย" อยู่ท้ายกล่องเฉลย
 * กรอบ AI Tutor จะโผล่ก็ต่อเมื่อผู้เรียนกดปุ่มนั้น (ทดสอบการกดแยกที่
 * FocusFormQuestionCard.ai-tutor-toggle.test.tsx) — prop default false จึงไม่กระทบหน้าอื่น
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import FocusFormQuestionCard from './FocusFormQuestionCard';

const props = {
  questionText: 'What do they usually do?',
  options: [
    { key: 'A', value: 'be' },
    { key: 'B', value: 'do' },
  ],
  selectedAnswer: 'A',
  correctAnswer: 'B',
  explanation: 'หลัง [do/does/did] ต้องตามด้วยกริยาช่อง 1 เสมอ',
  onAnswerSelect: () => undefined,
};

describe('FocusFormQuestionCard — โหมดเฉลยปกติ (ไม่ส่ง aiTutor)', () => {
  it('คงบล็อก "แวะอ่านสักนิด…" + อวตารเต่าต้มตามเดิม', () => {
    const html = renderToStaticMarkup(<FocusFormQuestionCard {...props} />);
    expect(html).toContain('แวะอ่านสักนิด ครั้งหน้าทำได้แน่');
    expect(html).toContain('otter-flag1.png');
    expect(html).not.toContain('AI Tutor'); // ไม่มีกรอบ AI Tutor แซงมา
  });

  it('ไม่มีปุ่มชวนถาม AI (พาร์ทนี้ไม่ได้เปิด AI Tutor)', () => {
    const html = renderToStaticMarkup(<FocusFormQuestionCard {...props} />);
    expect(html).not.toContain('ลองถาม AI');
    expect(html).not.toContain('arrow-right.svg');
  });
});

describe('FocusFormQuestionCard — โหมด aiTutor (Figma 600:27645)', () => {
  it('ยังขึ้นบล็อก "แวะอ่านสักนิด…" + อวตารเต่าต้มก่อน', () => {
    const html = renderToStaticMarkup(<FocusFormQuestionCard {...props} aiTutor questionId={7} />);
    expect(html).toContain('แวะอ่านสักนิด ครั้งหน้าทำได้แน่');
    expect(html).toContain('otter-flag1.png');
  });

  it('มีเส้นคั่น + ปุ่ม "หากยังไม่เข้าใจ ลองถาม AI เพิ่มเติมได้เลย" ท้ายกล่องเฉลย', () => {
    const html = renderToStaticMarkup(<FocusFormQuestionCard {...props} aiTutor questionId={7} />);
    expect(html).toContain('h-px w-full bg-[#F4F0DE]');
    expect(html).toContain('หากยังไม่เข้าใจ ลองถาม AI เพิ่มเติมได้เลย');
    expect(html).toContain('arrow-right.svg');
  });

  it('ยังไม่เปิดกรอบ AI Tutor จนกว่าผู้เรียนจะกดปุ่ม', () => {
    const html = renderToStaticMarkup(<FocusFormQuestionCard {...props} aiTutor questionId={7} />);
    expect(html).not.toContain('โหมด AI');
    expect(html).not.toContain('AI Mentor');
  });
});
