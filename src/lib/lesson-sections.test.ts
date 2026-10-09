import { describe, expect, it } from 'vitest';
import { lessonSectionsHaveContent, normalizeLessonSection, normalizeLessonSections } from './lesson-sections';

describe('normalizeLessonSection', () => {
  it('maps a legacy text section into a detailed rule and retains its explanation', () => {
    expect(normalizeLessonSection({ type: 'text', heading: 'หลักการ', body: 'ใช้กับประธานทุกคน' })).toMatchObject({
      type: 'detailedRule', heading: 'หลักการ', body: 'ใช้กับประธานทุกคน',
    });
  });

  it('maps a legacy table into flexible rule/example rows', () => {
    expect(normalizeLessonSection({
      type: 'table',
      table: { headers: ['ประธาน', 'ตัวอย่าง'], rows: [['She', 'She works.'], ['They', 'They work.']] },
    })).toMatchObject({
      type: 'detailedRule',
      rows: [{ left: 'ประธาน: She', right: 'She works.' }, { left: 'ประธาน: They', right: 'They work.' }],
    });
  });

  it('maps legacy tips into compact important notes', () => {
    expect(normalizeLessonSection({ type: 'tip', body: 'จำหลักการนี้ไว้' })).toMatchObject({
      type: 'importantNote', heading: 'จุดสำคัญที่ควรจำ', body: 'จำหลักการนี้ไว้',
    });
  });

  it('maps legacy examples into rule cards and keeps example content', () => {
    expect(normalizeLessonSection({ type: 'examples', examples: [{ en: 'She ==works==.', th: 'เธอทำงาน' }] })).toMatchObject({
      type: 'rule', examples: [{ en: 'She ==works==.', th: 'เธอทำงาน' }],
    });
  });

  it('upgrades a legacy single-question mini quiz and preserves multi-question quizzes', () => {
    const legacy = normalizeLessonSection({ type: 'practice', practice: { sentence: 'She ____.', options: ['work', 'works'], answerIndex: 1 } });
    expect(legacy).toMatchObject({ type: 'practice', practice: { questions: [{ sentence: 'She ____.', answerIndex: 1 }] } });

    const current = normalizeLessonSection({ type: 'practice', practice: { questions: [
      { sentence: 'She ____.', options: ['work', 'works'], answerIndex: 1 },
      { sentence: 'They ____.', options: ['work', 'works'], answerIndex: 0 },
    ] } });
    expect(current.practice?.questions).toHaveLength(2);
  });

  it('keeps the per-section visibility flag and drops unknown values', () => {
    expect(normalizeLessonSection({ type: 'rule', heading: 'A', visibility: 'draft' }).visibility).toBe('draft');
    expect(normalizeLessonSection({ type: 'rule', heading: 'A', visibility: 'published' }).visibility).toBe('published');
    expect(normalizeLessonSection({ type: 'rule', heading: 'A' }).visibility).toBeUndefined();
    expect(normalizeLessonSection({ type: 'rule', heading: 'A', visibility: 'whatever' }).visibility).toBeUndefined();
  });

  it('migrates old page-level intro and tip into ordered components', () => {
    expect(normalizeLessonSections([], { intro: 'Intro', tip: 'Remember this' })).toMatchObject([
      { type: 'detailedRule', heading: 'บทนำ', body: 'Intro' },
      { type: 'importantNote', heading: 'จุดสำคัญที่ควรจำ', body: 'Remember this' },
    ]);
  });
});

describe('normalizeLessonSection — Core Formula breakdown (Figma 419:56249)', () => {
  const formulaSection = {
    type: 'formulaBreakdown',
    heading: 'ประโยคปฏิเสธ (-) ต้องตามด้วย ประโยคบอกเล่า (+)',
    formula: {
      cases: [
        {
          label: 'เคส Is / Am / Are - ปฏิเสธ :',
          example: "It isn't cold today, is it?",
          left: { sentence: "It ==isn't== too cold today", note: 'ประโยคหน้าปฏิเสธ / มี is/am/are' },
          right: { sentence: '==is== it?', note: "หลังใช้บอกเล่า / ดึง is ตัวเดิมมาใช้แบบไม่มี n't" },
        },
      ],
    },
  };

  it('เก็บ type และเคสซ้าย/ขวาไว้ครบ', () => {
    expect(normalizeLessonSection(formulaSection)).toMatchObject({
      type: 'formulaBreakdown',
      heading: 'ประโยคปฏิเสธ (-) ต้องตามด้วย ประโยคบอกเล่า (+)',
      formula: {
        cases: [{
          label: 'เคส Is / Am / Are - ปฏิเสธ :',
          example: "It isn't cold today, is it?",
          left: { sentence: "It ==isn't== too cold today", note: 'ประโยคหน้าปฏิเสธ / มี is/am/are' },
          right: { sentence: '==is== it?', note: "หลังใช้บอกเล่า / ดึง is ตัวเดิมมาใช้แบบไม่มี n't" },
        }],
      },
    });
  });

  it('เดา type เป็น formulaBreakdown เมื่อไม่มี type แต่มีข้อมูลเคส', () => {
    expect(normalizeLessonSection({ formula: { cases: [{ left: { sentence: 'A' } }] } }).type).toBe('formulaBreakdown');
  });

  it('ยอมรับชื่อ type เดิม/ชื่อเล่น (formula) เพื่อไม่ให้เนื้อหาเดิมหาย', () => {
    expect(normalizeLessonSection({ type: 'formula', formula: { cases: [{ left: { sentence: 'A' } }] } }).type).toBe('formulaBreakdown');
  });

  it('เก็บ `tone` ของแถบประโยคไว้ (Figma 419:56107 สลับสีจากค่ามาตรฐาน)', () => {
    const normalized = normalizeLessonSection({
      type: 'formulaBreakdown',
      formula: { cases: [{
        label: 'Is / Am / Are',
        example: "You are a student, aren't you?",
        left: { sentence: 'You ==are== a student', note: 'ประโยคหน้าบอกเล่า', tone: 'yellow' },
        right: { sentence: "==aren't== you?", note: 'หลังต้องใช้ปฏิเสธ', tone: 'purple' },
      }] },
    });
    expect(normalized.formula?.cases[0].left.tone).toBe('yellow');
    expect(normalized.formula?.cases[0].right.tone).toBe('purple');
  });

  it('tone ที่ไม่รู้จักถูกทิ้ง — กลับไปใช้สีตามตำแหน่งคอลัมน์', () => {
    const normalized = normalizeLessonSection({
      type: 'formulaBreakdown',
      formula: { cases: [{ left: { sentence: 'A', tone: 'rainbow' }, right: { sentence: 'B' } }] },
    });
    expect(normalized.formula?.cases[0].left.tone).toBeUndefined();
    expect(normalized.formula?.cases[0].left).toEqual({ sentence: 'A', note: '' });
  });

  it('ตัดเคสที่ว่างทุกช่องออก และไม่สร้าง formula เมื่อไม่มีเคสเลย', () => {
    const normalized = normalizeLessonSection({
      type: 'formulaBreakdown',
      formula: { cases: [{ label: '   ', example: '', left: { sentence: '', note: '' }, right: { sentence: '', note: '' } }] },
    });
    expect(normalized.formula).toBeUndefined();
  });

  it('ทนข้อมูลเสีย — ฟิลด์ที่ไม่ใช่ string กลายเป็นค่าว่าง ไม่ทำให้พัง', () => {
    const normalized = normalizeLessonSection({
      type: 'formulaBreakdown',
      formula: { cases: [{ label: 5, left: 'broken', right: { sentence: 'ok', note: null } }] },
    });
    expect(normalized.formula).toEqual({
      cases: [{ label: '', example: '', left: { sentence: '', note: '' }, right: { sentence: 'ok', note: '' } }],
    });
  });
});

/** Type Breakdown — layout แยกตาม Type (Figma 419:56446) */
describe('normalizeLessonSection — Type Breakdown (Figma 419:56446)', () => {
  const typeSection = {
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
  };

  it('เก็บ type และ เคสทั้งหมดไว้ครบ', () => {
    expect(normalizeLessonSection(typeSection)).toMatchObject({
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
    });
  });

  it('เดา type เป็น typeBreakdown เมื่อไม่มี type แต่มีเคส', () => {
    expect(normalizeLessonSection({ typeBreakdown: { cases: [{ label: 'Type 1 :', structure: 'If + V.1' }] } }).type).toBe('typeBreakdown');
  });

  it('ยอมรับชื่อ type เดิม/ชื่อเล่น (typebreakdown / types) เพื่อไม่ให้เนื้อหาเดิมหาย', () => {
    expect(normalizeLessonSection({ type: 'types', typeBreakdown: { cases: [{ label: 'Type 1 :' }] } }).type).toBe('typeBreakdown');
  });

  it('ตัดเคสที่ว่างทุกช่องออก และไม่สร้าง typeBreakdown เมื่อไม่มีเคสเลย', () => {
    const normalized = normalizeLessonSection({
      type: 'typeBreakdown',
      typeBreakdown: { cases: [{ label: '  ', description: '', structure: '', example: '', note: '' }] },
    });
    expect(normalized.typeBreakdown).toBeUndefined();
  });

  it('สีป้ายที่ผิดรูปแบบถูกทิ้ง (ผู้เรียนเห็นสีมาตรฐานแทน) แต่สี hex ถูกเก็บไว้', () => {
    expect(normalizeLessonSection({
      type: 'typeBreakdown',
      typeBreakdown: { cases: [{ label: 'Type 2 :', color: 'red' }] },
    }).typeBreakdown?.cases[0].color).toBeUndefined();
    expect(normalizeLessonSection({
      type: 'typeBreakdown',
      typeBreakdown: { cases: [{ label: 'Type 2 :', color: '#C55A5A' }] },
    }).typeBreakdown?.cases[0].color).toBe('#C55A5A');
  });

  it('ทนข้อมูลเสีย — ฟิลด์ที่ไม่ใช่ string กลายเป็นค่าว่าง', () => {
    const normalized = normalizeLessonSection({
      type: 'typeBreakdown',
      typeBreakdown: { cases: [{ label: 5, structure: 'If + V.1', note: null }] },
    });
    expect(normalized.typeBreakdown).toEqual({
      cases: [{ label: '', color: undefined, description: '', structure: 'If + V.1', example: '', note: '' }],
    });
  });
});

/** Mini Quiz ฝังได้กับทุก type — type ต้องไม่ถูกเปลี่ยนเป็น 'practice' จากการมี quiz */
describe('normalizeLessonSection — Mini Quiz ฝังท้ายการ์ดเนื้อหา', () => {
  const ruleWithQuiz = {
    type: 'rule',
    heading: 'Superlative',
    chip: 'ขั้นที่สุด',
    practice: { questions: [{ sentence: 'She is the ____ student.', options: ['best', 'better'], answerIndex: 0, explanation: 'good → the best' }] },
    quizHeading: 'ลองทำโจทย์: Comparatives',
  };

  it('การ์ด rule ที่มี practice ยังคงเป็น type rule และเก็บ quiz + quizHeading ไว้', () => {
    expect(normalizeLessonSection(ruleWithQuiz)).toMatchObject({
      type: 'rule',
      quizHeading: 'ลองทำโจทย์: Comparatives',
      practice: { questions: [{ sentence: 'She is the ____ student.', answerIndex: 0, explanation: 'good → the best' }] },
    });
  });

  it('quizHeading ที่ไม่ใช่ string ถูกมองข้าม', () => {
    expect(normalizeLessonSection({ ...ruleWithQuiz, quizHeading: 12 }).quizHeading).toBeUndefined();
    expect(normalizeLessonSection({ ...ruleWithQuiz, quizHeading: undefined }).quizHeading).toBeUndefined();
  });

  it('การ์ด importantNote ก็เก็บ quiz ที่ฝังมาได้', () => {
    const normalized = normalizeLessonSection({
      type: 'importantNote',
      heading: 'ทริกสำคัญ',
      body: 'ใช้ the + ขั้นที่สุด',
      practice: { questions: [{ sentence: 'It is the ____ (good) one.', options: ['best', 'better'], answerIndex: 0 }] },
    });
    expect(normalized).toMatchObject({ type: 'importantNote', body: 'ใช้ the + ขั้นที่สุด' });
    expect(normalized.practice?.questions).toHaveLength(1);
  });
});

/**
 * กฎ "มีเนื้อหาไหม" ใช้ร่วมกันทั้งตอนบันทึก (POST/PATCH) และตอน import JSON
 * การ์ดที่เนื้อหาอยู่ในเคสของ layout ใหม่ต้องผ่าน ไม่งั้นจะบันทึก/นำเข้าไม่ได้
 * ทั้งที่หน้าจอแสดงผลครบ
 */
describe('lessonSectionsHaveContent', () => {
  const normalize = (sections: unknown[]) => normalizeLessonSections(sections);

  it('การ์ดที่มีแต่เคสของ Type Breakdown ถือว่ามีเนื้อหา', () => {
    const sections = normalize([{
      type: 'typeBreakdown',
      typeBreakdown: { cases: [{ label: 'Type 1 :', description: 'มีโอกาสเกิดขึ้นจริงในอนาคต', structure: 'If + V.1', example: 'If I study.', note: '' }] },
    }]);
    expect(lessonSectionsHaveContent(sections)).toBe(true);
  });

  it('การ์ดที่มีแต่เคสของ Core Formula breakdown ถือว่ามีเนื้อหา', () => {
    const sections = normalize([{
      type: 'formulaBreakdown',
      formula: { cases: [{ label: 'เคส Is', example: '', left: { sentence: "It ==isn't==", note: '' }, right: { sentence: '', note: '' } }] },
    }]);
    expect(lessonSectionsHaveContent(sections)).toBe(true);
  });

  it('Mini Quiz ที่ฝังมากับการ์ดก็นับเป็นเนื้อหา', () => {
    const sections = normalize([{
      type: 'typeBreakdown',
      practice: { questions: [{ sentence: 'If I ____ hard, I will pass.', options: ['study', 'studied'], answerIndex: 0 }] },
    }]);
    expect(lessonSectionsHaveContent(sections)).toBe(true);
  });

  it('section ที่มีแค่ช่องว่าง/ไม่มี sections เลย ถือว่าไม่มีเนื้อหา', () => {
    expect(lessonSectionsHaveContent(normalize([{ type: 'importantNote', heading: '   ', body: '' }]))).toBe(false);
    expect(lessonSectionsHaveContent(normalize([{ type: 'typeBreakdown', typeBreakdown: { cases: [] } }]))).toBe(false);
    expect(lessonSectionsHaveContent([])).toBe(false);
  });
});
