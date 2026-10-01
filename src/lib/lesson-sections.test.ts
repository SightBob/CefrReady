import { describe, expect, it } from 'vitest';
import { normalizeLessonSection, normalizeLessonSections } from './lesson-sections';

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

  it('migrates old page-level intro and tip into ordered components', () => {
    expect(normalizeLessonSections([], { intro: 'Intro', tip: 'Remember this' })).toMatchObject([
      { type: 'detailedRule', heading: 'บทนำ', body: 'Intro' },
      { type: 'importantNote', heading: 'จุดสำคัญที่ควรจำ', body: 'Remember this' },
    ]);
  });
});
