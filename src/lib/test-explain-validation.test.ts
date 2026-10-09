import { describe, expect, it } from 'vitest';
import { collectItemIssues } from '@/lib/test-explain-validation';

describe('collectItemIssues — import structure validation', () => {
  it('ผ่านไฟล์ที่ถูกต้องโดยไม่มี error/warning', () => {
    const { errors, warnings } = collectItemIssues({
      sections: [
        {
          type: 'rule',
          heading: 'หลักการใช้',
          chip: 'I/You/We',
          description: 'ใช้รูปพื้นฐาน',
          rows: [{ left: 'I play', right: 'I play tennis' }],
          examples: [{ en: 'She plays tennis', th: 'เธอเล่นเทนนิส', ok: true }],
          tip: 'อย่าลืมเติม s',
        },
        {
          type: 'practice',
          practice: { questions: [{ sentence: 'She ___ tennis', options: ['play', 'plays'], answerIndex: 1, explanation: 'เติม s' }] },
        },
      ],
    });
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('rows ที่ไม่มี left หรือไม่ใช่ object ต้อง error พร้อมตำแหน่ง', () => {
    const { errors } = collectItemIssues({
      sections: [{ type: 'rule', rows: [{ right: 'ไม่มี left' }, 'not-an-object'] }],
    });
    expect(errors.some((e) => e.includes('sections[0].rows[0].left'))).toBe(true);
    expect(errors.some((e) => e.includes('sections[0].rows[1]'))).toBe(true);
  });

  it('examples ที่ไม่มี en ต้อง error', () => {
    const { errors } = collectItemIssues({
      sections: [{ type: 'rule', examples: [{ th: 'ไม่มี en' }] }],
    });
    expect(errors.some((e) => e.includes('sections[0].examples[0].en'))).toBe(true);
  });

  it('visibility ที่ไม่รู้จักต้องเป็น error — พิมพ์ผิดแล้วส่วนที่ยังไม่เสร็จจะหลุดถึงผู้เรียน', () => {
    const { errors } = collectItemIssues({
      sections: [{ type: 'rule', heading: 'A', visibility: 'hidden' }],
    });
    expect(errors.some((e) => e.includes('sections[0].visibility'))).toBe(true);
  });

  it('visibility draft/published ผ่านได้โดยไม่มี error', () => {
    const { errors } = collectItemIssues({
      sections: [
        { type: 'rule', heading: 'A', visibility: 'draft' },
        { type: 'rule', heading: 'B', visibility: 'published' },
      ],
    });
    expect(errors).toEqual([]);
  });

  it('answerIndex เกินจำนวนตัวเลือกต้อง error พร้อมบอกช่วงที่ถูก', () => {
    const { errors } = collectItemIssues({
      sections: [{ type: 'practice', practice: { questions: [{ sentence: '___', options: ['a', 'b', 'c', 'd'], answerIndex: 9 }] } }],
    });
    expect(errors.some((e) => e.includes('answerIndex=9') && e.includes('0 ถึง 3'))).toBe(true);
  });

  it('options ว่าง และ answerIndex ไม่ใช่ตัวเลข ต้อง error', () => {
    const { errors } = collectItemIssues({
      sections: [{ type: 'practice', practice: { questions: [{ sentence: '___', options: [], answerIndex: 0 }, { sentence: '___', options: ['a'], answerIndex: 'zero' }] } }],
    });
    expect(errors.some((e) => e.includes('practice.questions[0].options'))).toBe(true);
    expect(errors.some((e) => e.includes('practice.questions[1].answerIndex'))).toBe(true);
  });

  it('type ที่ไม่รู้จักเป็น warning ไม่ใช่ error', () => {
    const { errors, warnings } = collectItemIssues({
      sections: [{ type: 'magicCard', heading: 'ok' }],
    });
    expect(errors).toEqual([]);
    expect(warnings.some((w) => w.includes('magicCard'))).toBe(true);
  });

  it('โจทย์ practice ที่ตัวเลือกใช้ได้ < 2 ข้อเป็น warning (โดนลบตอนเผยแพร่)', () => {
    const { errors, warnings } = collectItemIssues({
      sections: [{ type: 'practice', practice: { questions: [{ sentence: '___', options: ['a', ''], answerIndex: 0 }] } }],
    });
    expect(errors).toEqual([]);
    expect(warnings.some((w) => w.includes('practice.questions[0]'))).toBe(true);
  });

  it('ฟิลด์ string ที่ส่งมาเป็นตัวเลข/boolean ต้อง error', () => {
    const { errors } = collectItemIssues({
      sections: [{ type: 'importantNote', heading: 123, body: true }],
    });
    expect(errors.some((e) => e.includes('sections[0].heading'))).toBe(true);
    expect(errors.some((e) => e.includes('sections[0].body'))).toBe(true);
  });

  it('section ที่ไม่ใช่ object ต้อง error', () => {
    const { errors } = collectItemIssues({ sections: ['oops'] });
    expect(errors.some((e) => e.includes('sections[0] ต้องเป็น object'))).toBe(true);
  });

  it('sections ไม่ใช่ array ไม่ทำให้ crash (คืนว่าง — เคสนี้ถูกเช็คก่อนหน้าแล้ว)', () => {
    const { errors, warnings } = collectItemIssues({ sections: 'nope' });
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });
});

describe('collectItemIssues — Core Formula breakdown (Figma 419:56249)', () => {
  const base = { grammarTopic: 'Question Tags', title: 'Question Tags' };

  it('ผ่านเมื่อโครง formula ถูกต้อง', () => {
    const issues = collectItemIssues({
      ...base,
      sections: [{
        type: 'formulaBreakdown',
        heading: 'ประโยคปฏิเสธ (-) ต้องตามด้วย ประโยคบอกเล่า (+)',
        formula: {
          cases: [{
            label: 'เคส Is / Am / Are - ปฏิเสธ :',
            example: "It isn't cold today, is it?",
            left: { sentence: "It ==isn't== too cold today", note: 'ประโยคหน้าปฏิเสธ / มี is/am/are' },
            right: { sentence: '==is== it?', note: 'หลังใช้บอกเล่า' },
          }],
        },
      }],
    });
    expect(issues.errors).toEqual([]);
    expect(issues.warnings).toEqual([]);
  });

  it('เตือนชื่อ type ที่ไม่รู้จัก พร้อมบอก type ที่รองรับทั้งหมด', () => {
    const issues = collectItemIssues({ ...base, sections: [{ type: 'formula', heading: 'x' }] });
    expect(issues.warnings.join(' ')).toContain('formulaBreakdown');
  });

  it('ฟ้อง error เป็นตำแหน่งเมื่อ left/right ไม่ใช่ object { sentence, note }', () => {
    const issues = collectItemIssues({
      ...base,
      sections: [{ type: 'formulaBreakdown', formula: { cases: [{ label: 'A', left: 'broken' }] } }],
    });
    expect(issues.errors.join(' ')).toContain('sections[0].formula.cases[0].left');
    expect(issues.errors.join(' ')).toContain('sentence, note');
  });

  it('ฟ้อง error เมื่อ sentence/note ไม่ใช่ string', () => {
    const issues = collectItemIssues({
      ...base,
      sections: [{ type: 'formulaBreakdown', formula: { cases: [{ right: { sentence: 12, note: [] } }] } }],
    });
    expect(issues.errors.join(' ')).toContain('sections[0].formula.cases[0].right.sentence');
    expect(issues.errors.join(' ')).toContain('sections[0].formula.cases[0].right.note');
  });

  it('ฟ้อง error เมื่อ formula.cases ไม่ใช่ array', () => {
    const issues = collectItemIssues({ ...base, sections: [{ type: 'formulaBreakdown', formula: { cases: 'nope' } }] });
    expect(issues.errors.join(' ')).toContain('sections[0].formula.cases ต้องเป็น array');
  });

  it('Mini Quiz ที่ฝังท้ายการ์ดเนื้อหา กฎตรวจเดิมใช้ด้วย — answerIndex เกินช่วงคือ error', () => {
    const issues = collectItemIssues({
      ...base,
      sections: [{
        type: 'rule',
        heading: 'Superlative',
        practice: { questions: [{ sentence: 'She is the ____ student.', options: ['best', 'better'], answerIndex: 5 }] },
      }],
    });
    expect(issues.errors.join(' ')).toContain('sections[0].practice.questions[0].answerIndex');
  });

  it('quizHeading ที่ไม่ใช่ string เป็น error (กันค่าหลุดเข้าไปในการ์ด quiz)', () => {
    const issues = collectItemIssues({
      ...base,
      sections: [{ type: 'rule', heading: 'A', quizHeading: { nope: true } }],
    });
    expect(issues.errors.join(' ')).toContain('sections[0].quizHeading');
  });

  it('เตือนเคสที่ยังไม่มีประโยคในแถบสีทั้งสองข้าง (จะไม่แสดง)', () => {
    const issues = collectItemIssues({
      ...base,
      sections: [{ type: 'formulaBreakdown', formula: { cases: [{ label: 'เคสเปล่า', note: 'มีแค่โน้ต' }] } }],
    });
    expect(issues.errors).toEqual([]);
    expect(issues.warnings.join(' ')).toContain('sections[0].formula.cases[0]');
    expect(issues.warnings.join(' ')).toContain('จะไม่แสดง');
  });
});

describe('collectItemIssues — Type Breakdown (Figma 419:56446)', () => {
  const base = { grammarTopic: 'Conditionals', title: 'Conditional Sentences' };

  it('ผ่านเมื่อโครง typeBreakdown ถูกต้อง', () => {
    const issues = collectItemIssues({
      ...base,
      sections: [{
        type: 'typeBreakdown',
        heading: 'Conditional Sentences (ประโยคเงื่อนไข)',
        description: 'พูดถึงเรื่องสมมติหรือเงื่อนไข “ถ้า... ก็...”',
        typeBreakdown: {
          cases: [{
            label: 'Type 1 :',
            color: '#8ACB66',
            description: 'มีโอกาสเกิดขึ้นจริงในอนาคต',
            structure: 'โครงสร้าง: If + V.1 , will + V.1',
            example: 'If I ==study== , I ==will pass.==',
            note: 'ปัจจุบันคู่กับอนาคต (V.1 คู่ will)',
          }],
        },
      }],
    });
    expect(issues.errors).toEqual([]);
    expect(issues.warnings).toEqual([]);
  });

  it('type "typeBreakdown" ผ่านการตรวจโดยไม่ถูกเตือนว่าไม่รู้จัก type', () => {
    const issues = collectItemIssues({ ...base, sections: [{ type: 'typeBreakdown', heading: 'x' }] });
    expect(issues.warnings.join(' ')).not.toContain('ไม่ใช่ type ที่รู้จัก');
  });

  it('ฟ้อง error เมื่อ cases ไม่ใช่ array หรือเคสไม่ใช่ object', () => {
    expect(collectItemIssues({ ...base, sections: [{ type: 'typeBreakdown', typeBreakdown: { cases: 'nope' } }] }).errors.join(' ')).toContain('sections[0].typeBreakdown.cases ต้องเป็น array');
    expect(collectItemIssues({ ...base, sections: [{ type: 'typeBreakdown', typeBreakdown: { cases: ['broken'] } }] }).errors.join(' ')).toContain('sections[0].typeBreakdown.cases[0] ต้องเป็น object');
  });

  it('ฟ้อง error เป็นตำแหน่งเมื่อฟิลด์ในเคสไม่ใช่ string', () => {
    const issues = collectItemIssues({
      ...base,
      sections: [{ type: 'typeBreakdown', typeBreakdown: { cases: [{ label: 'Type 1 :', structure: 12, color: [] }] } }],
    });
    expect(issues.errors.join(' ')).toContain('sections[0].typeBreakdown.cases[0].structure');
    expect(issues.errors.join(' ')).toContain('sections[0].typeBreakdown.cases[0].color');
  });

  it('เตือนเคสที่ยังไม่มีโครงสร้างหรือประโยคตัวอย่าง (แถบจะว่าง)', () => {
    const issues = collectItemIssues({
      ...base,
      sections: [{ type: 'typeBreakdown', typeBreakdown: { cases: [{ label: 'Type 1 :', structure: 'If + V.1', note: 'มีแค่โน้ต' }] } }],
    });
    expect(issues.errors).toEqual([]);
    expect(issues.warnings.join(' ')).toContain('sections[0].typeBreakdown.cases[0]');
    expect(issues.warnings.join(' ')).toContain('ประโยคตัวอย่าง');
  });
});
