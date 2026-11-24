import { describe, expect, it } from 'vitest';
import { calculateScore, countAnsweredItems, normalizeFreeText, parseStructuredAnswer } from './score-utils';

describe('normalizeFreeText', () => {
  it.each([
    ['i’m', "i'm"],
    ['i‘m', "i'm"],
    ['i`m', "i'm"],
    ['  IS  ', 'is'],
    ['two   words', 'two words'],
    ['well–known', "well-known"],
    ['“quoted”', '"quoted"'],
  ])('ทนเครื่องหมายและช่องว่างที่ผู้ใช้พิมพ์: %s', (input, expected) => {
    expect(normalizeFreeText(input)).toBe(expected);
  });

  it('ไม่ยอมรับคำตอบต่างความหมาย แม้ใช้ normalize แล้ว', () => {
    expect(normalizeFreeText('is')).not.toBe(normalizeFreeText('are'));
    expect(normalizeFreeText('was')).not.toBe(normalizeFreeText('were'));
    expect(normalizeFreeText('')).toBe('');
  });
});

describe('countAnsweredItems', () => {
  it('คำตอบเดี่ยว: ว่าง = 0, มีค่า = 1', () => {
    expect(countAnsweredItems('')).toBe(0);
    expect(countAnsweredItems('   ')).toBe(0);
    expect(countAnsweredItems('A')).toBe(1);
  });

  it('Tap & Select / บทความเติมคำ (JSON): นับรายชิ้น ไม่ใช่รายข้อ', () => {
    expect(countAnsweredItems(JSON.stringify({ 0: 'A', 1: '', 2: 'B' }))).toBe(2);
    expect(countAnsweredItems(JSON.stringify({ 20: 'in', 21: 'his' }))).toBe(2);
  });

  it('JSON เสียรูปยังนับเป็น 1 ชิ้น ไม่ทำให้การส่งข้อสอบพัง', () => {
    expect(countAnsweredItems('{not json')).toBe(1);
  });
});

describe('authoritative scoring', () => {
  const questions = [{ id: 1, correctAnswer: 'A', explanation: null }, { id: 2, correctAnswer: 'B', explanation: null }];
  it('counts missing questions as wrong', () => {
    expect(calculateScore([{ questionId: 1, selectedAnswer: 'A' }], questions)).toMatchObject({ totalQuestions: 2, correctCount: 1, score: 50 });
  });
  it('rejects duplicates and unknown IDs', () => {
    expect(() => calculateScore([{ questionId: 1, selectedAnswer: 'A' }, { questionId: 1, selectedAnswer: 'A' }], questions)).toThrow('Duplicate');
    expect(() => calculateScore([{ questionId: 99, selectedAnswer: 'A' }], questions)).toThrow('Unknown');
  });
  it.each(['null', '[]', '{"1":23}', '{'])('rejects malformed structured input %s', (value) => {
    expect(parseStructuredAnswer(value)).toBeNull();
  });
  it('accepts blank and string records', () => {
    expect(parseStructuredAnswer('')).toEqual({});
    expect(parseStructuredAnswer('{"1":" is "}')).toEqual({ 1: ' is ' });
  });
  it('never awards a missing answer key', () => {
    expect(calculateScore([], [{ id: 1, correctAnswer: null, explanation: null }]).correctCount).toBe(0);
  });
});

describe('calculateScore Tap & Select', () => {
  const questions = [{
    id: 5,
    testTypeId: 'focus-form',
    correctAnswer: null,
    explanation: null,
    tapExercise: {
      title: 'Choose',
      items: [
        { prompt: 'First', choiceA: 'is', choiceB: 'are', correct: 0 as const },
        { prompt: 'Second', choiceA: 'was', choiceB: 'were', correct: 1 as const },
      ],
    },
  }];

  it('counts every item separately and accepts A/B answer keys', () => {
    expect(calculateScore([{ questionId: 5, selectedAnswer: '{"0":"A","1":"B"}' }], questions)).toMatchObject({
      correctCount: 2,
      totalQuestions: 2,
      score: 100,
      results: [{ isCorrect: true }],
    });
  });

  it('scores partial and blank answers per item', () => {
    expect(calculateScore([{ questionId: 5, selectedAnswer: '{"0":"A"}' }], questions)).toMatchObject({
      correctCount: 1,
      totalQuestions: 2,
      score: 50,
      results: [{ isCorrect: false }],
    });
  });
});
