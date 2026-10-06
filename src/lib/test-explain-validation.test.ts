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
