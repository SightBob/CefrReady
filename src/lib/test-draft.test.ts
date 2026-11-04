/**
 * sanitizeDraft — ทุกค่าที่ client ส่งมาต้องถูกตรวจซ้ำฝั่งเซิร์ฟเวอร์
 * (เพดานขนาดเดียวกับ test-progress เพื่อกัน DB บวมจากการแก้ devtools)
 */
import { describe, expect, it } from 'vitest';
import { sanitizeDraft } from './test-draft-payload';

describe('sanitizeDraft', () => {
  it('รับ draft ที่ถูกต้องและคงค่าเดิม', () => {
    const draft = sanitizeDraft({
      index: 3,
      answers: ['went', null, 'felt'],
      checked: {
        0: { isCorrect: true, correctKey: 'went', correctText: 'went', explanation: 'อดีต', answerProof: null, aiTutorReady: true },
      },
      choiceSeed: '7-1234-abcd',
    });
    expect(draft).toEqual({
      index: 3,
      answers: ['went', null, 'felt'],
      checked: {
        0: { isCorrect: true, correctKey: 'went', correctText: 'went', explanation: 'อดีต', answerProof: null, aiTutorReady: true },
      },
      choiceSeed: '7-1234-abcd',
    });
  });

  it('ปฏิเสธ index ที่ผิดรูป', () => {
    expect(sanitizeDraft({ index: -1 })).toBeNull();
    expect(sanitizeDraft({ index: 1.5 })).toBeNull();
    expect(sanitizeDraft({ index: '2' })).toBeNull();
    expect(sanitizeDraft(null)).toBeNull();
  });

  it('ตัดคำตอบที่ผิดชนิด/ยาวเกิน และตัดเพดานจำนวน', () => {
    const long = 'x'.repeat(5000);
    const draft = sanitizeDraft({ index: 0, answers: ['ok', 42, null, long] });
    expect(draft?.answers[0]).toBe('ok');
    expect(draft?.answers[1]).toBeNull();
    expect(draft?.answers[2]).toBeNull();
    expect(draft?.answers[3]?.length).toBe(2000);

    const many = sanitizeDraft({ index: 0, answers: Array(900).fill('a') });
    expect(many?.answers.length).toBe(500);
  });

  it('ทิ้ง checked ที่ไม่มี isCorrect และจำกัดขนาดข้อความ', () => {
    const draft = sanitizeDraft({
      index: 1,
      answers: [],
      checked: {
        0: { isCorrect: 'yes' },
        1: { isCorrect: false, explanation: 'y'.repeat(5000) },
        x: { isCorrect: true },
      },
    });
    expect(Object.keys(draft?.checked ?? {})).toEqual(['1']);
    expect(draft?.checked[1].explanation?.length).toBe(2000);
    expect(draft?.checked[1].correctKey).toBeNull();
    expect(draft?.checked[1].aiTutorReady).toBeNull();
  });

  it('choiceSeed ที่ยาวเกินถูกตัด และค่าว่างกลายเป็น null', () => {
    expect(sanitizeDraft({ index: 0, choiceSeed: 'z'.repeat(500) })?.choiceSeed?.length).toBe(200);
    expect(sanitizeDraft({ index: 0, choiceSeed: '' })?.choiceSeed).toBeNull();
    expect(sanitizeDraft({ index: 0 })?.choiceSeed).toBeNull();
  });
});
