/**
 * โหมด aiTutor ของการ์ด: บล็อกเฉลย "แวะอ่านสักนิด…" ถูกแทนด้วยกรอบ AI Tutor
 * (ผู้ใช้กำหนด 2026-10-19) — พฤติกรรมอยู่ที่ prop เดียว default false จึงไม่กระทบ
 * หน้าอื่นที่ไม่ส่งธง
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
});

describe('FocusFormQuestionCard — โหมด aiTutor', () => {
  it('ไม่มีบล็อก "แวะอ่านสักนิด…" อีกต่อไป', () => {
    const html = renderToStaticMarkup(<FocusFormQuestionCard {...props} aiTutor />);
    expect(html).not.toContain('แวะอ่านสักนิด');
    expect(html).not.toContain('otter-flag1.png');
  });

  it('คำอธิบายเป็นบทสนทนาแรกในกรอบ AI Tutor', () => {
    const html = renderToStaticMarkup(<FocusFormQuestionCard {...props} aiTutor />);
    expect(html).toContain('โหมด AI');
    expect(html).toContain('AI Mentor • คำอธิบาย');
    expect(html).toContain('กริยาช่อง 1');
  });
});
