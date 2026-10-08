import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TAP_REASON_REWARD_SETTINGS,
  MAX_TAP_REASON_LENGTH,
  MAX_TAP_REASON_POINTS,
  collectTapReasonRows,
  computeTapReasonRewardPoints,
  groupTapReasonsByQuestion,
  readTapReasonRewardSettings,
} from './tap-reason-rewards';
import type { TestSetSlot } from './test-set-slots';

const tapExercise = {
  title: 'เลือกคำที่ถูกต้อง',
  items: [
    { prompt: 'She ___ daily.', choiceA: 'go', choiceB: 'goes', correct: 1 as const },
    { prompt: 'I ___ TV.', choiceA: 'watched', choiceB: 'watch', correct: 0 as const },
  ],
};

const base = {
  attemptId: 10,
  userId: 'u1',
  createdAt: new Date('2026-10-07T00:00:00Z'),
  questions: [{ id: 1, tapExercise }],
};

describe('collectTapReasonRows', () => {
  it('เก็บเฉพาะข้อย่อยที่เขียนเหตุผลจริง', () => {
    const rows = collectTapReasonRows({
      ...base,
      results: [{ questionId: 1, userAnswer: JSON.stringify({ 0: 'A', 1: 'B' }) }],
      clientReasons: { 1: { 0: 'เพราะ She เป็นเอกพจน์', 1: '   ' } },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ questionId: 1, itemIndex: 0, reason: 'เพราะ She เป็นเอกพจน์' });
  });

  it('ไม่เก็บเลยเมื่อไม่มีเหตุผล — ผู้ที่ไม่เขียนไม่ได้คะแนน', () => {
    const rows = collectTapReasonRows({
      ...base,
      results: [{ questionId: 1, userAnswer: JSON.stringify({ 0: 'A', 1: 'B' }) }],
      clientReasons: { 1: { 0: '', 1: '  ' } },
    });
    expect(rows).toEqual([]);
  });

  it('ไม่เก็บข้อย่อยที่ยังไม่ตอบ แม้จะเขียนเหตุผล', () => {
    const rows = collectTapReasonRows({
      ...base,
      results: [{ questionId: 1, userAnswer: JSON.stringify({ 1: 'watch' }) }],
      clientReasons: { 1: { 0: 'เขียนไว้แต่ไม่ได้ตอบ', 1: 'เพราะ I ไม่เติม s' } },
    });
    expect(rows.map((row) => row.itemIndex)).toEqual([1]);
  });

  it('คิด isCorrect จากตัวเลือกของข้อย่อยนั้น (choiceA ถูกเมื่อ correct = 0)', () => {
    const rows = collectTapReasonRows({
      ...base,
      results: [{ questionId: 1, userAnswer: JSON.stringify({ 0: 'A', 1: 'A' }) }],
      clientReasons: { 1: { 0: 'หนึ่ง', 1: 'สอง' } },
    });
    expect(rows.map((row) => row.isCorrect)).toEqual([false, true]);
  });

  it('ตัดช่องว่างหัวท้ายและจำกัดความยาวเหตุผล', () => {
    const rows = collectTapReasonRows({
      ...base,
      results: [{ questionId: 1, userAnswer: JSON.stringify({ 0: 'B' }) }],
      clientReasons: { 1: { 0: `  ${'ก'.repeat(MAX_TAP_REASON_LENGTH + 50)}  ` } },
    });
    expect(rows[0].reason).toHaveLength(MAX_TAP_REASON_LENGTH);
  });

  it('ไม่สร้างแถวซ้ำเมื่อ client ส่งคำตอบข้อเดิมสองครั้ง', () => {
    const rows = collectTapReasonRows({
      ...base,
      results: [
        { questionId: 1, userAnswer: JSON.stringify({ 0: 'B' }) },
        { questionId: 1, userAnswer: JSON.stringify({ 0: 'B' }) },
      ],
      clientReasons: { 1: { 0: 'เพราะ She เป็นเอกพจน์' } },
    });
    expect(rows).toHaveLength(1);
  });

  it('ทน userAnswer ที่ไม่ใช่ JSON หรือไม่ใช่ออบเจ็กต์', () => {
    const rows = collectTapReasonRows({
      ...base,
      results: [
        { questionId: 1, userAnswer: 'B' },
        { questionId: 1, userAnswer: '["A"]' },
      ],
      clientReasons: { 1: { 0: 'เหตุผล' } },
    });
    expect(rows).toEqual([]);
  });

  it('ข้ามข้อที่ไม่ใช่ Tap หรือไม่มีในชุดที่ส่งมา', () => {
    const rows = collectTapReasonRows({
      ...base,
      results: [{ questionId: 99, userAnswer: JSON.stringify({ 0: 'A' }) }],
      clientReasons: { 99: { 0: 'เหตุผล' }, 1: {} },
    });
    expect(rows).toEqual([]);
  });
});

describe('computeTapReasonRewardPoints', () => {
  const rows = [{ isCorrect: false }, { isCorrect: true }];

  it('ให้คะแนนเหมาเท่ากันทุกแถว ไม่สนว่าตอบถูกหรือผิด', () => {
    expect(computeTapReasonRewardPoints({ autoAward: true, points: 50 }, rows)).toEqual([50, 50]);
  });

  it('คืน null ทุกแถวเมื่อปิดระบบเหมา (รอแอดมินให้คะแนนเอง)', () => {
    expect(computeTapReasonRewardPoints({ autoAward: false, points: 50 }, rows)).toEqual([
      null,
      null,
    ]);
  });

  it('คืน null ทุกแถวเมื่ออ่านค่าตั้งไม่ได้ (ไม่เดาคะแนน)', () => {
    expect(computeTapReasonRewardPoints(null, rows)).toEqual([null, null]);
  });

  it('ให้ 0 คะแนนได้ ถ้าแอดมินตั้งเหมาไว้ 0', () => {
    expect(computeTapReasonRewardPoints({ autoAward: true, points: 0 }, rows)).toEqual([0, 0]);
  });

  it('กันค่าที่หลุดสเปก: ติดลบ ปัดเป็น 0, เกินเพดาน ตัดที่เพดาน, ทศนิยม ปัดลงเป็นจำนวนเต็ม', () => {
    expect(computeTapReasonRewardPoints({ autoAward: true, points: -20 }, rows)).toEqual([0, 0]);
    expect(
      computeTapReasonRewardPoints({ autoAward: true, points: MAX_TAP_REASON_POINTS + 999 }, rows)
    ).toEqual([MAX_TAP_REASON_POINTS, MAX_TAP_REASON_POINTS]);
    expect(computeTapReasonRewardPoints({ autoAward: true, points: 12.6 }, rows)).toEqual([13, 13]);
  });

  it('คืนอาร์เรย์ว่างเมื่อไม่มีแถว', () => {
    expect(computeTapReasonRewardPoints({ autoAward: true, points: 50 }, [])).toEqual([]);
  });
});

describe('readTapReasonRewardSettings', () => {
  it('คืนค่าเริ่มต้นเมื่อไม่มีค่าในที่เก็บ', () => {
    expect(readTapReasonRewardSettings(null)).toEqual(DEFAULT_TAP_REASON_REWARD_SETTINGS);
  });

  it('ทนค่าที่ผิดรูป (สตริง/อาร์เรย์/ตัวเลขมั่ว) ด้วยค่าเริ่มต้น', () => {
    for (const garbage of ['50', 50, [], { points: 'ห้าสิบ' }, { autoAward: 'yes' }]) {
      const settings = readTapReasonRewardSettings(garbage);
      expect(Number.isInteger(settings.points)).toBe(true);
      expect(typeof settings.autoAward).toBe('boolean');
    }
  });

  it('อ่านค่าที่แอดมินตั้งไว้ได้ตรง ๆ', () => {
    expect(readTapReasonRewardSettings({ autoAward: false, points: 25 })).toEqual({
      autoAward: false,
      points: 25,
    });
  });

  it('ตัดคะแนนที่เกินเพดานหรือติดลบให้อยู่ในช่วงที่กำหนด', () => {
    expect(readTapReasonRewardSettings({ autoAward: true, points: 10_000 }).points).toBe(
      MAX_TAP_REASON_POINTS
    );
    expect(readTapReasonRewardSettings({ autoAward: true, points: -5 }).points).toBe(0);
  });
});

describe('groupTapReasonsByQuestion', () => {
  const slots: TestSetSlot[] = [
    { questionIndex: 0, kind: 'tap', itemIndex: 0 },
    { questionIndex: 0, kind: 'tap', itemIndex: 1 },
    { questionIndex: 1, kind: 'question' },
  ];
  const questions = [{ id: 5 }, { id: 6 }];

  it('รวมหลายข้อย่อยของข้อเดียวกันไว้ใน record เดียว (ไม่ทับกัน)', () => {
    const grouped = groupTapReasonsByQuestion(
      [
        { slotIndex: 0, reason: 'เหตุผลข้อแรก' },
        { slotIndex: 1, reason: 'เหตุผลข้อสอง' },
      ],
      slots,
      questions
    );
    expect(grouped).toEqual({ 5: { 0: 'เหตุผลข้อแรก', 1: 'เหตุผลข้อสอง' } });
  });

  it('คืน undefined เมื่อไม่มีเหตุผลที่เขียนไว้เลย', () => {
    expect(
      groupTapReasonsByQuestion(
        [
          { slotIndex: 0, reason: '' },
          { slotIndex: 1, reason: '   ' },
        ],
        slots,
        questions
      )
    ).toBeUndefined();
    expect(groupTapReasonsByQuestion([], slots, questions)).toBeUndefined();
  });

  it('ตัดช่องว่างหัวท้าย และข้ามสล็อตที่ไม่ใช่ Tap', () => {
    const grouped = groupTapReasonsByQuestion(
      [
        { slotIndex: 0, reason: '  เหตุผล  ' },
        { slotIndex: 2, reason: 'ตอบเป็นตัวเลือกปกติ' },
        { slotIndex: 9, reason: 'สล็อตที่ไม่มีอยู่' },
      ],
      slots,
      questions
    );
    expect(grouped).toEqual({ 5: { 0: 'เหตุผล' } });
  });
});
