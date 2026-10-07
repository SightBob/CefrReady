import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ExplainTopicField from './ExplainTopicField';
import type { QuestionTopicOption } from '@/lib/test-explain-topics';

const topics: QuestionTopicOption[] = [
  { grammarTopic: 'Present Simple', questionCount: 11, testSets: [{ id: 15, name: 'Present Simple & Present Continuous' }] },
  { grammarTopic: 'Quantifiers', questionCount: 11, testSets: [] },
];

const render = (grammarTopic: string, customTopic = false) =>
  renderToStaticMarkup(
    <ExplainTopicField
      grammarTopic={grammarTopic}
      topics={topics}
      customTopic={customTopic}
      onChange={() => undefined}
      onCustomTopicChange={() => undefined}
    />,
  );

describe('ExplainTopicField', () => {
  it('เลือกจากหัวข้อจริงของข้อสอบ และบอกจำนวนข้อ + ชุดที่ใช้หัวข้อนั้น', () => {
    const html = render('Present Simple');
    expect(html).toContain('Present Simple · 11 ข้อ');
    expect(html).toContain('มีข้อสอบ 11 ข้อ · ชุด: Present Simple &amp; Present Continuous');
    expect(html).toContain('text-emerald-600');
    expect(html).not.toContain('ไม่มีข้อสอบข้อใดใช้หัวข้อนี้');
  });

  it('เตือนเมื่อหัวข้อไม่ตรงกับข้อสอบข้อใดเลย (เคสเนื้อหาเก่าที่มีวงเล็บ)', () => {
    const html = render('(Auxiliaries & Verb Forms)');
    expect(html).toContain('⚠ (Auxiliaries &amp; Verb Forms) — ไม่มีข้อสอบข้อใดใช้');
    expect(html).toContain('ยังไม่มีข้อสอบข้อใดใช้หัวข้อนี้');
    expect(html).toContain('text-amber-600');
  });

  it('ยังไม่ได้เลือกหัวข้อ → บอกให้เลือกจากรายการ', () => {
    const html = render('');
    expect(html).toContain('เลือกหัวข้อจากรายการที่ดึงมาจากข้อสอบจริง');
    expect(html).toContain('text-slate-400');
    expect(html).toContain('— เลือก grammarTopic จากข้อสอบ —');
  });

  it('หัวข้อที่ยังไม่อยู่ในชุดข้อสอบใด ยังนับว่าเชื่อมติดข้อสอบ', () => {
    const html = render('Quantifiers');
    expect(html).toContain('มีข้อสอบ 11 ข้อ · ยังไม่ได้อยู่ในชุดข้อสอบใด');
    expect(html).toContain('text-emerald-600');
  });

  it('โหมดพิมพ์เองแสดงช่องกรอกพร้อมปุ่มกลับไปเลือกจากรายการ', () => {
    const html = render('New Topic', true);
    expect(html).toContain('พิมพ์ชื่อ grammarTopic (ใช้เมื่อยังไม่มีข้อสอบ)');
    expect(html).toContain('เลือกจากรายการ');
    expect(html).not.toContain('— เลือก grammarTopic จากข้อสอบ —');
  });
});
