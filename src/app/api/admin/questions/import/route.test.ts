/**
 * Unit tests for the Tap & Select import support in questions/import.
 * The route imports db indirectly (via '@/db'), so tests mock it before the
 * route module loads.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/db', () => ({ db: {} }));
vi.mock('@/db/schema', () => ({ questions: {}, testSetQuestions: {}, testSets: {} }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin: async () => ({ error: null, session: null }) }));

import { validateQuestion, normalizeTap, GET } from './route';
import Papa from 'papaparse';

const baseRow = (overrides: Partial<Record<string, string>> = {}): Record<string, string> => ({
  testTypeId: 'tap-select',
  questionText: '',
  optionA: '', optionB: '', optionC: '', optionD: '',
  correctAnswer: '',
  explanation: '',
  cefrLevel: 'B1',
  difficulty: 'easy',
  ...overrides,
});

const tapJson = (obj: unknown) => JSON.stringify(obj);

describe('validateQuestion — tap-select', () => {
  it('ผ่านเมื่อ tapExercise ถูกต้อง (title + items + correct 0/1)', () => {
    const row = baseRow({
      tapExercise: tapJson({
        title: 'เลือกคำที่ถูกต้อง',
        hint: 'แตะคำที่ถูก',
        items: [
          { prompt: 'She ___ to school.', choiceA: 'go', choiceB: 'goes', correct: 1 },
          { prompt: 'I ___ TV.', choiceA: 'watched', choiceB: 'watch', correct: 0 },
        ],
      }),
    });
    const result = validateQuestion(row, 2);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('error เมื่อไม่มี tapExercise column', () => {
    const result = validateQuestion(baseRow(), 2);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('tap-select requires "tapExercise"'))).toBe(true);
  });

  it('error เมื่อ tapExercise ไม่ใช่ JSON', () => {
    const result = validateQuestion(baseRow({ tapExercise: '{not-json' }), 2);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('is not valid JSON'))).toBe(true);
  });

  it('error เมื่อไม่มี title หรือ items ว่าง', () => {
    const result = validateQuestion(baseRow({ tapExercise: tapJson({ title: '', items: [] }) }), 2);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('tapExercise.title'))).toBe(true);
    expect(result.errors.some((e) => e.includes('tapExercise.items'))).toBe(true);
  });

  it('error เมื่อ item ขาด prompt/choiceA/choiceB หรือ correct ไม่ใช่ 0/1', () => {
    const result = validateQuestion(baseRow({
      tapExercise: tapJson({
        title: 'T',
        items: [
          { prompt: '', choiceA: 'a', choiceB: 'b', correct: 0 },
          { prompt: 'p', choiceA: 'a', choiceB: 'b', correct: 2 },
          { prompt: 'p', choiceA: '', choiceB: 'b', correct: 0 },
        ],
      }),
    }), 2);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('items[0].prompt'))).toBe(true);
    expect(result.errors.some((e) => e.includes('items[1].correct') && e.includes('0 (choiceA) or 1 (choiceB)'))).toBe(true);
    expect(result.errors.some((e) => e.includes('items[2].choiceA'))).toBe(true);
  });

  it('warning เมื่อใส่ optionA-D/correctAnswer มาด้วย (จะถูกละเว้น)', () => {
    const result = validateQuestion(baseRow({
      optionA: 'go',
      correctAnswer: 'B',
      tapExercise: tapJson({ title: 'T', items: [{ prompt: 'p', choiceA: 'a', choiceB: 'b', correct: 0 }] }),
    }), 2);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('optionA'))).toBe(true);
    expect(result.warnings.some((w) => w.includes('correctAnswer'))).toBe(true);
  });

  it('questionText ว่างได้สำหรับ tap-select (fallback เป็น tapExercise.title)', () => {
    const result = validateQuestion(baseRow({
      tapExercise: tapJson({ title: 'ชื่อแบบฝึกหัด', items: [{ prompt: 'p', choiceA: 'a', choiceB: 'b', correct: 1 }] }),
    }), 2);
    expect(result.valid).toBe(true);
  });

  it('subTopicGrammar เกิน 200 ตัวอักษร → error, 200 ตัวอักษรพอดี → ผ่าน', () => {
    const tap = tapJson({ title: 'T', items: [{ prompt: 'p', choiceA: 'a', choiceB: 'b', correct: 0 }] });
    const tooLong = validateQuestion(baseRow({ tapExercise: tap, subTopicGrammar: 'x'.repeat(201) }), 2);
    expect(tooLong.valid).toBe(false);
    expect(tooLong.errors.some((e) => e.includes('"subTopicGrammar" is too long'))).toBe(true);

    const maxLength = validateQuestion(baseRow({ tapExercise: tap, subTopicGrammar: 'x'.repeat(200) }), 2);
    expect(maxLength.valid).toBe(true);
  });

  it('subTopicGrammar ว่าง/ไม่มี → ผ่าน (field นี้ optional)', () => {
    const result = validateQuestion(baseRow({
      tapExercise: tapJson({ title: 'T', items: [{ prompt: 'p', choiceA: 'a', choiceB: 'b', correct: 0 }] }),
      subTopicGrammar: '',
    }), 2);
    expect(result.valid).toBe(true);
  });

  it('cefrLevel ยังบังคับสำหรับ tap-select', () => {
    const result = validateQuestion(baseRow({
      cefrLevel: '',
      tapExercise: tapJson({ title: 'T', items: [{ prompt: 'p', choiceA: 'a', choiceB: 'b', correct: 0 }] }),
    }), 2);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('cefrLevel'))).toBe(true);
  });
});

describe('GET — CSV template', () => {
  it('มีคอลัมน์ subTopicGrammar ต่อท้าย grammarTopic และมีตัวอย่างค่า', async () => {
    const res = await GET();
    const csv = await res.text();
    const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
    const fields = (parsed.meta.fields ?? []).map((f) => f.trim());

    expect(fields).toContain('subTopicGrammar');
    expect(fields.indexOf('subTopicGrammar')).toBe(fields.indexOf('grammarTopic') + 1);
    expect(parsed.data.some((row) => row.subTopicGrammar?.trim())).toBe(true);
  });
});

describe('normalizeTap — dedup key for Tap & Select', () => {
  it('string JSON กับ object ให้ key เดียวกัน (ค้นซ้ำกับ DB ได้)', () => {
    const obj = { title: 'Same Title', items: [{ prompt: 'p', choiceA: 'a', choiceB: 'b', correct: 0 }] };
    expect(normalizeTap(tapJson(obj))).toBe(normalizeTap(obj));
  });

  it('ต่างกันที่ title หรือ items → key ต่างกัน', () => {
    const a = { title: 'A', items: [{ prompt: 'p', choiceA: 'a', choiceB: 'b', correct: 0 }] };
    const b = { title: 'B', items: [{ prompt: 'p', choiceA: 'a', choiceB: 'b', correct: 0 }] };
    expect(normalizeTap(a)).not.toBe(normalizeTap(b));
  });

  it('ไม่สนตัวพิมพ์เล็ก-ใหญ่/ช่องว่างเกิน (normalize เหมือนข้อสอบทั่วไป)', () => {
    const a = { title: 'Same Title', items: [{ prompt: 'p', choiceA: 'a', choiceB: 'b', correct: 0 }] };
    const b = { title: '  same   TITLE ', items: [{ prompt: ' P ', choiceA: 'a', choiceB: 'b', correct: 0 }] };
    expect(normalizeTap(a)).toBe(normalizeTap(b));
  });
});
