import { describe, expect, it } from 'vitest';
import {
  explainTopicSummary,
  explainTopicTone,
  explainTopicWarning,
  linkExplainTopic,
  type QuestionTopicOption,
} from '@/lib/test-explain-topics';

const options: QuestionTopicOption[] = [
  { grammarTopic: 'Present Simple', questionCount: 11, testSets: [{ id: 15, name: 'Present Simple & Present Continuous' }] },
  { grammarTopic: 'Prepositions', questionCount: 17, testSets: [{ id: 22, name: 'Prepositions' }, { id: 40, name: 'Mixed Review' }] },
];

describe('linkExplainTopic', () => {
  it('ยังไม่ได้เลือกหัวข้อ → empty', () => {
    expect(linkExplainTopic('', options)).toEqual({ state: 'empty', topic: '' });
    expect(linkExplainTopic(null, options)).toEqual({ state: 'empty', topic: '' });
    expect(linkExplainTopic('   ', options)).toEqual({ state: 'empty', topic: '' });
  });

  it('หัวข้อตรงกับข้อสอบ → matched พร้อมข้อมูลชุดที่ใช้เรื่องนี้', () => {
    const link = linkExplainTopic('Present Simple', options);
    expect(link.state).toBe('matched');
    if (link.state !== 'matched') throw new Error('expected matched');
    expect(link.option.questionCount).toBe(11);
    expect(link.option.testSets.map((set) => set.id)).toEqual([15]);
  });

  it('ตัดช่องว่างหน้า-หลังให้เอง เหมือน normalizeTopic ของหน้าสอบ', () => {
    expect(linkExplainTopic('  Prepositions  ', options).state).toBe('matched');
  });

  it('ตัวพิมพ์ไม่ตรง = ไม่เชื่อม (พฤติกรรมจริงของหน้าสอบ)', () => {
    const link = linkExplainTopic('present simple', options);
    expect(link.state).toBe('unknown');
    expect(link.topic).toBe('present simple');
  });

  it('หัวข้อที่มีแต่ในอดีต (เช่นมีวงเล็บ) → unknown', () => {
    expect(linkExplainTopic('(Auxiliaries & Verb Forms)', options).state).toBe('unknown');
  });
});

describe('explainTopicWarning', () => {
  it('เตือนเมื่อไม่ตรงกับข้อสอบข้อใดเลย และอ้างชื่อหัวข้อที่พิมพ์มา', () => {
    const warning = explainTopicWarning(linkExplainTopic('Present Perfect', options));
    expect(warning).toContain('Present Perfect');
    expect(warning).toContain('ไม่ตรงกับข้อสอบข้อใดเลย');
  });

  it('เตือนเมื่อยังไม่ได้เลือกหัวข้อ', () => {
    expect(explainTopicWarning(linkExplainTopic('', options))).not.toBeNull();
  });

  it('ไม่เตือนเมื่อหัวข้อตรงกับข้อสอบ', () => {
    expect(explainTopicWarning(linkExplainTopic('Prepositions', options))).toBeNull();
  });
});

describe('explainTopicSummary', () => {
  it('สรุปจำนวนข้อและชุดที่ใช้หัวข้อนั้น', () => {
    const summary = explainTopicSummary(linkExplainTopic('Prepositions', options));
    expect(summary).toContain('17 ข้อ');
    expect(summary).toContain('Prepositions');
    expect(summary).toContain('Mixed Review');
  });

  it('บอกเมื่อหัวข้อนั้นยังไม่อยู่ในชุดข้อสอบใด', () => {
    const summary = explainTopicSummary(
      linkExplainTopic('Quantifiers', [{ grammarTopic: 'Quantifiers', questionCount: 11, testSets: [] }]),
    );
    expect(summary).toContain('ยังไม่ได้อยู่ในชุดข้อสอบใด');
  });

  it('บอกเมื่อยังไม่มีข้อสอบใช้หัวข้อนี้', () => {
    expect(explainTopicSummary(linkExplainTopic('Reported Speech', options))).toBe('ยังไม่มีข้อสอบข้อใดใช้หัวข้อนี้');
    expect(explainTopicSummary(linkExplainTopic('', options))).toContain('เลือกหัวข้อ');
  });
});

describe('explainTopicTone', () => {
  it('เขียวเมื่อเชื่อมติด เหลืองเมื่อไม่ตรง เทาเมื่อยังไม่เลือก', () => {
    expect(explainTopicTone(linkExplainTopic('Present Simple', options))).toBe('ok');
    expect(explainTopicTone(linkExplainTopic('Nope', options))).toBe('warn');
    expect(explainTopicTone(linkExplainTopic('', options))).toBe('muted');
  });
});
