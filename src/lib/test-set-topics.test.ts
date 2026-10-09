import { describe, expect, it } from 'vitest';
import { buildTopicRuns, firstSlotIndexForTopic, normalizeTopic, topicRunForSlot, usesSetLevelExplain } from './test-set-topics';
import { expandTestSetSlots } from './test-set-slots';

const mcq = (id: number, grammarTopic: string | null) => ({
  id,
  testTypeId: 'focus-form',
  correctAnswer: 'A',
  grammarTopic,
});

describe('normalizeTopic', () => {
  it('trims and treats missing topics as an empty string', () => {
    expect(normalizeTopic('  Present Simple ')).toBe('Present Simple');
    expect(normalizeTopic(null)).toBe('');
    expect(normalizeTopic(undefined)).toBe('');
  });
});

describe('buildTopicRuns', () => {
  it('splits consecutive questions into one run per topic', () => {
    const questions = [mcq(1, 'A'), mcq(2, 'A'), mcq(3, 'B'), mcq(4, 'A')];
    const runs = buildTopicRuns(questions);

    expect(runs.map((run) => [run.topic, run.questionCount])).toEqual([
      ['A', 2],
      ['B', 1],
      ['A', 1],
    ]);
    // ช่วงเรื่องต่อเนื่องกันใน slot space (ข้อละ 1 slot)
    expect(runs.map((run) => [run.firstSlotIndex, run.lastSlotIndex])).toEqual([
      [0, 1],
      [2, 2],
      [3, 3],
    ]);
  });

  it('groups questions with no topic together and keeps them distinct from named topics', () => {
    const runs = buildTopicRuns([mcq(1, null), mcq(2, '  '), mcq(3, 'Present Simple')]);

    expect(runs.map((run) => run.topic)).toEqual(['', 'Present Simple']);
    expect(runs[0].questionCount).toBe(2);
  });

  it('expands tap items and article blanks into slots so run ranges stay item-accurate', () => {
    const questions = [
      {
        id: 1,
        testTypeId: 'focus-form',
        correctAnswer: null,
        grammarTopic: 'Tap topic',
        tapExercise: {
          title: 'Practice',
          items: [
            { prompt: 'a', choiceA: 'x', choiceB: 'y', correct: 0 as const },
            { prompt: 'b', choiceA: 'x', choiceB: 'y', correct: 1 as const },
            { prompt: 'c', choiceA: 'x', choiceB: 'y', correct: 0 as const },
          ],
        },
      },
      mcq(2, 'Next topic'),
    ];

    const slots = expandTestSetSlots(questions);
    const runs = buildTopicRuns(questions, slots);

    expect(runs[0]).toMatchObject({ topic: 'Tap topic', questionCount: 1, slotCount: 3, firstSlotIndex: 0, lastSlotIndex: 2 });
    expect(runs[1]).toMatchObject({ topic: 'Next topic', questionCount: 1, slotCount: 1, firstSlotIndex: 3, lastSlotIndex: 3 });
  });

  it('reuses the caller-provided slots instead of recomputing them', () => {
    const questions = [mcq(1, 'A')];
    const slots = expandTestSetSlots(questions);

    expect(buildTopicRuns(questions, slots)).toEqual(buildTopicRuns(questions));
  });
});

describe('topicRunForSlot', () => {
  const runs = buildTopicRuns([mcq(1, 'A'), mcq(2, 'B'), mcq(3, 'B')]);

  it('finds the run that owns each slot', () => {
    expect(topicRunForSlot(runs, 0)?.topic).toBe('A');
    expect(topicRunForSlot(runs, 1)?.topic).toBe('B');
    expect(topicRunForSlot(runs, 2)?.topic).toBe('B');
  });

  it('returns null outside the delivered slots', () => {
    expect(topicRunForSlot(runs, 3)).toBeNull();
    expect(topicRunForSlot([], 0)).toBeNull();
  });
});

describe('firstSlotIndexForTopic', () => {
  const runs = buildTopicRuns([mcq(1, 'Modals'), mcq(2, 'Auxiliaries'), mcq(3, 'Auxiliaries')]);

  it('points at the first slot of the topic so an admin preview opens on it', () => {
    expect(firstSlotIndexForTopic(runs, 'Auxiliaries')).toBe(1);
    expect(firstSlotIndexForTopic(runs, '  Auxiliaries ')).toBe(1);
    expect(firstSlotIndexForTopic(runs, 'Modals')).toBe(0);
  });

  it('returns the first run when the same topic appears twice, and null when it is absent', () => {
    const repeated = buildTopicRuns([mcq(1, 'A'), mcq(2, 'B'), mcq(3, 'A')]);
    expect(firstSlotIndexForTopic(repeated, 'A')).toBe(0);
    expect(firstSlotIndexForTopic(repeated, 'C')).toBeNull();
    expect(firstSlotIndexForTopic(repeated, '')).toBeNull();
    expect(firstSlotIndexForTopic(repeated, null)).toBeNull();
  });
});

describe('usesSetLevelExplain', () => {
  it('shows the set-level explain page whenever at least one explain is bound', () => {
    expect(usesSetLevelExplain(1, 1)).toBe(true);
    // ชุดรวมหลายเรื่องที่ผูกหลายอธิบายไว้ก็มีหน้า /explain — แสดงทุกอันต่อกันเป็นภาพรวม
    expect(usesSetLevelExplain(2, 3)).toBe(true);
    expect(usesSetLevelExplain(3, 3)).toBe(true);
    expect(usesSetLevelExplain(2, 1)).toBe(true);
  });

  it('has no set-level page when nothing is bound', () => {
    expect(usesSetLevelExplain(0, 1)).toBe(false);
    expect(usesSetLevelExplain(0, 3)).toBe(false);
  });
});
