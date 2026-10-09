import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ExplainTopicField from './ExplainTopicField';
import type { QuestionTopicOption } from '@/lib/test-explain-topics';

const topicOptions: QuestionTopicOption[] = [
  { grammarTopic: 'Present Simple', questionCount: 11, testSets: [{ id: 15, name: 'Present Simple & Present Continuous' }] },
  { grammarTopic: 'Quantifiers', questionCount: 11, testSets: [] },
];

const render = (topics: string[], customTopic = false) =>
  renderToStaticMarkup(
    <ExplainTopicField
      topics={topics}
      options={topicOptions}
      customTopic={customTopic}
      onChangeTopics={() => undefined}
      onCustomTopicChange={() => undefined}
    />,
  );

describe('ExplainTopicField', () => {
  it('หัวข้อเดียว: แสดงชิพหัวข้อ + สรุปจำนวนข้อและชุดที่ใช้', () => {
    const html = render(['Present Simple']);
    expect(html).toContain('1 หัวข้อ · รวมข้อสอบ 11 ข้อ · ชุด: Present Simple &amp; Present Continuous');
    expect(html).toContain('text-emerald-600');
    // หัวข้อที่เลือกแล้วถูกซ่อนจากรายการ "เพิ่ม" — กันเผลอเลือกซ้ำ
    expect(html).not.toContain('value="Present Simple"');
    // หัวข้ออื่นยังเพิ่มได้
    expect(html).toContain('Quantifiers · 11 ข้อ');
    expect(html).not.toContain('ไม่ตรงข้อสอบ');
  });

  it('เลือกหลายหัวข้อ: แสดงชิพทุกหัวข้อและสรุปรวมข้อสอบทุกหัวข้อ', () => {
    const html = render(['Present Simple', 'Quantifiers']);
    expect(html).toContain('2 หัวข้อ · รวมข้อสอบ 22 ข้อ');
    expect(html).toContain('Present Simple');
    expect(html).toContain('Quantifiers');
    expect(html).toContain('text-emerald-600');
  });

  it('หัวข้อหลัก (ตัวแรก) มีป้าย "หลัก" กำกับ', () => {
    const html = render(['Present Simple', 'Quantifiers']);
    expect(html).toContain('หลัก');
  });

  it('หัวข้อที่ไม่มีข้อสอบใช้: ยังเชื่อมได้แต่เตือนสีเหลือง', () => {
    const html = render(['(Auxiliaries & Verb Forms)']);
    expect(html).toContain('⚠ (Auxiliaries &amp; Verb Forms) — ไม่มีข้อสอบข้อใดใช้');
    expect(html).toContain('⚠ ไม่ตรงข้อสอบ 1 หัวข้อ');
    expect(html).toContain('text-amber-600');
  });

  it('ยังไม่ได้เลือกหัวข้อ → บอกให้เลือกจากรายการ', () => {
    const html = render([]);
    expect(html).toContain('เลือกหัวข้อจากรายการที่ดึงมาจากข้อสอบจริง');
    expect(html).toContain('text-slate-400');
    expect(html).toContain('— เพิ่ม grammarTopic จากข้อสอบ —');
  });

  it('หัวข้อเดิมที่ไม่มีในรายการข้อสอบแล้วยังแสดงใน dropdown ให้เลิกกลับได้', () => {
    const html = render(['(Auxiliaries & Verb Forms)']);
    // หัวข้อที่เลือกอยู่ไม่ควรซ้ำในรายการเพิ่ม — แต่ dropdown ยังมีหัวข้ออื่น
    expect(html).toContain('Present Simple · 11 ข้อ');
    expect(html).toContain('Quantifiers · 11 ข้อ');
  });

  it('โหมดพิมพ์หัวข้อใหม่แสดงช่องกรอกพร้อมปุ่มเพิ่ม/ยกเลิก', () => {
    const html = render([], true);
    expect(html).toContain('พิมพ์ชื่อ grammarTopic (ใช้เมื่อยังไม่มีข้อสอบ)');
    expect(html).toContain('เพิ่มหัวข้อ');
    expect(html).toContain('ยกเลิก');
    expect(html).not.toContain('— เพิ่ม grammarTopic จากข้อสอบ —');
  });
});
