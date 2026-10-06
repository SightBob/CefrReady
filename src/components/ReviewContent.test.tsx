import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ReviewContent from './ReviewContent';

const practiceTopic = {
  type: 'practice' as const,
  heading: 'ลองทำโจทย์เพื่อทบทวนความเข้าใจ',
  practice: {
    questions: [
      {
        sentence: '"Did she ____ to the university yesterday?"',
        options: ['went', 'go', 'goes'],
        answerIndex: 0,
        explanation: "เพราะประธานเป็น she เลยต้องต่อด้วย Do / Doesn't",
      },
      {
        sentence: '"Did they ____ home yesterday?"',
        options: ['go', 'went', 'goes'],
        answerIndex: 0,
        // ไม่มี explanation → ห้ามโผล่แถบเฉลย
      },
    ],
  },
};

describe('ReviewContent Mini Quiz เฉลย (ตาม Figma 249:1099)', () => {
  it('ยังไม่ตอบ: ไม่แสดงแถบเฉลย', () => {
    const html = renderToStaticMarkup(<ReviewContent topics={[practiceTopic]} />);
    expect(html).not.toContain('เฉลยลองทำโจทย์');
    expect(html).not.toContain("เพราะประธานเป็น she เลยต้องต่อด้วย Do / Doesn't");
  });

  it('ตอบแล้ว (ถูกหรือผิด): แสดงแถบเฉลยตาม design — พื้น #FFFEFA border #E9CD62 ข้อความ #76641C', () => {
    const html = renderToStaticMarkup(
      <ReviewContent topics={[practiceTopic]} initialPracticeAnswers={{ 0: 1 }} />,
    );
    expect(html).toContain('aria-label="เฉลยลองทำโจทย์"');
    expect(html).toContain('bg-[#FFFEFA]');
    expect(html).toContain('border-[#E9CD62]');
    expect(html).toContain('text-[#76641C]');
    expect(html).toContain('rounded-[15px]');
    expect(html).toContain('bg-[#C8E6FF]'); // badge ไอคอน
    expect(html).toContain('/logo-otter/explain-spark.svg'); // asset จาก Figma MCP
    expect(html).toContain('เพราะประธานเป็น she เลยต้องต่อด้วย Do / Doesn&#x27;t');
  });

  it('เฉลยของข้ออื่น (ข้อ 2) ไม่โผล่พร้อมกัน — แสดงเฉพาะข้อที่ตอบแล้ว', () => {
    const html = renderToStaticMarkup(
      <ReviewContent topics={[practiceTopic]} initialPracticeAnswers={{ 0: 1 }} />,
    );
    // แถบเฉลยปรากฏครั้งเดียว (เฉพาะข้อที่มี explanation) — ข้อ 2 ยังไม่เฉลย
    expect((html.match(/เฉลยลองทำโจทย์/g) ?? []).length).toBe(1);
  });

  it('practice แบบไม่มี explanation: ตอบแล้วไม่ต้องมีแถบเฉลย', () => {
    const noExplanation = {
      type: 'practice' as const,
      practice: {
        questions: [{ sentence: 'She ____ to school.', options: ['go', 'goes'], answerIndex: 1 }],
      },
    };
    const html = renderToStaticMarkup(
      <ReviewContent topics={[noExplanation]} initialPracticeAnswers={{ 0: 0 }} />,
    );
    expect(html).not.toContain('เฉลยลองทำโจทย์');
    expect(html).toContain('She <span'); // คำถามยังแสดงปกติ (blank เป็น span)
    expect(html).toContain('to school.');
  });
});
