import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import TestResults from './TestResults';

/**
 * การ์ดคะแนน (Figma 75:70702) — บรรทัดที่สองต้องเปลี่ยนตามระดับที่ประเมินได้
 * บั๊กเดิม: ทุกคะแนนขึ้นข้อความเดียวกันว่า "…อยู่ในเกณฑ์สูงมาก" แม้ได้คะแนนน้อย
 */
const render = (props: {
  score: number;
  totalQuestions: number;
  cefrLevel?: string | null;
}) =>
  renderToStaticMarkup(
    <TestResults
      score={props.score}
      totalQuestions={props.totalQuestions}
      sectionId="focus-form"
      onRestart={() => {}}
      cefrLevel={props.cefrLevel ?? undefined}
    />,
  );

describe('TestResults — บรรทัดให้กำลังใจของการ์ดคะแนน', () => {
  it('คะแนนสูง (C2) → ข้อความระดับสูงสุด', () => {
    const html = render({ score: 10, totalQuestions: 10 });
    expect(html).toContain('ระดับที่ประเมินได้: C2');
    expect(html).toContain('และคุณทำได้ในระดับสูงมาก');
  });

  it('คะแนนน้อย (A1) → ข้อความให้กำลังใจ ไม่ขึ้นว่า "สูงมาก"', () => {
    const html = render({ score: 2, totalQuestions: 10 });
    expect(html).toContain('ระดับที่ประเมินได้: A1');
    expect(html).toContain('และคุณอยู่ในช่วงเริ่มต้น ฝึกต่อไปได้เลย');
    expect(html).not.toContain('สูงมาก');
  });

  it('ระดับกลาง (B1) → ข้อความคนละชุด และยังต่อท้ายชื่อทักษะได้ถูกต้อง', () => {
    const html = render({ score: 6, totalQuestions: 10 });
    expect(html).toContain('ระดับที่ประเมินได้: B1');
    expect(html).toContain('ทักษะความเข้าใจไวยากรณ์');
    expect(html).toContain('และคุณทำได้ดี พื้นฐานแน่นแล้ว');
    expect(html).not.toContain('สูงมาก');
  });

  it('ใช้ระดับที่ส่งมาจาก server ก่อนการประมาณจากเปอร์เซ็นต์ (Full Test)', () => {
    const html = render({ score: 10, totalQuestions: 10, cefrLevel: 'B1' });
    expect(html).toContain('ระดับที่ประเมินได้: B1');
    expect(html).not.toContain('สูงมาก');
  });

  it('บรรทัดคะแนนยังแสดงเหมือนเดิม (ไม่กระทบ layout/โครงเดิม)', () => {
    const html = render({ score: 6, totalQuestions: 10 });
    expect(html).toContain('ได้คะแนน ');
    expect(html).toContain('(คิดเป็น 60%)');
    expect(html).toContain('w-[434px]');
  });
});
