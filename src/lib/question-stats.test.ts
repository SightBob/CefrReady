import { describe, expect, it } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { countableAnswerFilter, hasGradingContentChanged } from './question-stats';

const dialect = new PgDialect();

describe('countableAnswerFilter', () => {
  it('นับเฉพาะคำตอบที่ส่งหลัง stats_cutoff_at และยังนับทุกคำตอบเมื่อ cutoff เป็น NULL', () => {
    const { sql: text, params } = dialect.sqlToQuery(countableAnswerFilter());

    // ตัดด้วยเวลาตอบ เทียบ cutoff ต่อข้อ
    expect(text).toContain('"user_answers"."created_at"');
    expect(text).toContain('"questions"."stats_cutoff_at"');
    expect(text).toContain('>=');
    // NULL = ยังไม่เคยรีเซ็ต → -infinity ทำให้ทุกแถวผ่านเงื่อนไข
    expect(text).toContain('coalesce');
    expect(text).toContain("'-infinity'::timestamptz");
    expect(params).toEqual([]);
  });
});

describe('hasGradingContentChanged', () => {
  const stored = {
    questionText: 'What does the man mean?',
    optionA: 'He is late.',
    optionB: 'He forgot.',
    optionC: null,
    optionD: null,
    correctAnswer: 'A',
    explanation: null,
    conversation: null,
    article: null,
    tapExercise: null,
    active: 'true',
    cefrLevel: 'B1',
    statsCutoffAt: null,
  };

  it('เป็น true เมื่อเฉลยเปลี่ยน', () => {
    expect(hasGradingContentChanged(stored, { correctAnswer: 'B' })).toBe(true);
  });

  it('เป็น true เมื่อตัวเลือกหรือบทสนทนาเปลี่ยน', () => {
    expect(hasGradingContentChanged(stored, { optionD: 'A new distractor.' })).toBe(true);
    expect(hasGradingContentChanged(stored, { conversation: [{ name: 'Man', text: 'Hi' }] })).toBe(true);
  });

  it('เป็น false เมื่อส่งค่าเดิมกลับมา (กดบันทึกซ้ำ)', () => {
    expect(hasGradingContentChanged(stored, { correctAnswer: 'A', optionA: 'He is late.' })).toBe(false);
  });

  it('เป็น false เมื่อแก้เฉพาะฟิลด์ที่ไม่กระทบการตรวจ', () => {
    expect(hasGradingContentChanged(stored, { active: 'false', cefrLevel: 'A2', difficulty: 'easy' })).toBe(false);
  });

  it('ไม่นับการเปลี่ยนแค่ status ของ tapExercise แต่ยังจับการเปลี่ยนเนื้อหา', () => {
    const tap = { title: "Present Simple", items: [{ prompt: "She ___ to school.", choiceA: "go", choiceB: "goes", correct: 1 }] };
    const before = { ...stored, tapExercise: { ...tap, status: 'review' } };
    expect(hasGradingContentChanged(before, { tapExercise: { ...tap, status: 'published' } })).toBe(false);
    const changed = { ...tap, items: [{ prompt: 'He ___ home.', choiceA: 'go', choiceB: 'goes', correct: 1 }] };
    expect(hasGradingContentChanged(before, { tapExercise: changed })).toBe(true);
  });

  it('เทียบ JSON ที่ลำดับคีย์ต่างกันได้', () => {
    const a = { ...stored, conversation: [{ name: "Man", text: "Hi" }] };
    const b = { conversation: [{ text: 'Hi', name: 'Man' }] };
    expect(hasGradingContentChanged(a, b)).toBe(false);
  });
});
