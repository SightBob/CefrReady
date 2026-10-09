import { describe, expect, it } from 'vitest';
import {
  explainTopicSummary,
  explainTopicTone,
  explainTopicWarning,
  explainTopicsSummary,
  explainTopicsWarning,
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

describe('explainTopicsWarning (หลายหัวข้อ)', () => {
  it('ผ่านเมื่อทุกหัวข้อมีข้อสอบใช้', () => {
    expect(explainTopicsWarning(['Present Simple', 'Prepositions'], options)).toBeNull();
  });

  it('เตือนรายหัวข้อเมื่อหัวข้อใดไม่ตรงกับข้อสอบ', () => {
    expect(explainTopicsWarning(['Present Simple', 'Nope'], options)).toContain('"Nope"');
  });

  it('รวมหลายหัวข้อที่ไม่ตรงในข้อความเดียว', () => {
    const warning = explainTopicsWarning(['Nope', 'Nope 2'], options);
    expect(warning).toContain('"Nope"');
    expect(warning).toContain('"Nope 2"');
    expect(warning).toContain('หัวข้อเหล่านี้');
  });

  it('ไม่มีหัวข้อเลย = ต้องเลือกก่อนเผยแพร่', () => {
    expect(explainTopicsWarning([], options)).toContain('ต้องเลือก grammarTopic');
    expect(explainTopicsWarning(['   '], options)).toContain('ต้องเลือก grammarTopic');
  });
});

describe('explainTopicsSummary (หลายหัวข้อ)', () => {
  it('รวมจำนวนข้อสอบของทุกหัวข้อและชุดที่ใช้ (ตัดชื่อชุดซ้ำ)', () => {
    const summary = explainTopicsSummary(['Present Simple', 'Prepositions'], options);
    expect(summary).toBe('2 หัวข้อ · รวมข้อสอบ 28 ข้อ · ชุด: Present Simple & Present Continuous, Prepositions, Mixed Review');
  });

  it('บอกจำนวนหัวข้อที่ไม่ตรงข้อสอบ', () => {
    const summary = explainTopicsSummary(['Present Simple', 'Nope'], options);
    expect(summary).toContain('⚠ ไม่ตรงข้อสอบ 1 หัวข้อ');
  });

  it('ยังไม่ได้เลือก = บอกให้เลือกจากรายการ', () => {
    expect(explainTopicsSummary([], options)).toBe('เลือกหัวข้อจากรายการที่ดึงมาจากข้อสอบจริง');
  });
});
