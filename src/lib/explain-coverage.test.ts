import { describe, expect, it } from 'vitest';
import {
  explainCoverage,
  explainCoverageSummary,
  explainCoverageWarning,
  lessonCoverageLabels,
} from './explain-coverage';

const question = (id: number, subTopicGrammar: string | null) => ({
  id,
  questionText: `โจทย์ข้อ ${id}`,
  subTopicGrammar,
});

describe('lessonCoverageLabels', () => {
  it('ใช้ chip ก่อน heading และตัดตัวซ้ำที่ไม่สนตัวพิมพ์/ช่องว่าง', () => {
    expect(
      lessonCoverageLabels([
        { chip: 'Do' },
        { chip: ' do ' },
        { heading: 'หลักการนำไปใช้' },
        { chip: 'Did', heading: 'หลักการนำไปใช้' },
        {},
      ]),
    ).toEqual(['Do', 'หลักการนำไปใช้', 'Did']);
  });

  it('ทนค่าที่ไม่ใช่สตริง (draft จากหน้าแก้ไข)', () => {
    expect(lessonCoverageLabels([{ chip: undefined }, { heading: null }, { chip: 5 }])).toEqual(['5']);
  });
});

describe('explainCoverage', () => {
  const sections = [{ chip: 'Do' }, { chip: 'Does' }, { chip: 'Did' }, { heading: 'ลองทำโจทย์' }];

  it('หัวข้อที่ยังไม่มีข้อสอบใช้', () => {
    const coverage = explainCoverage([], sections);
    expect(coverage.state).toBe('empty-topic');
    expect(coverage.total).toBe(0);
    expect(explainCoverageSummary(coverage)).toBe('หัวข้อนี้ยังไม่มีข้อสอบใช้');
    expect(explainCoverageWarning(coverage)).toBeNull();
  });

  it('ครบทุกข้อ → covered และไม่เตือน', () => {
    const coverage = explainCoverage(
      [question(1, 'Do'), question(2, 'Did'), question(3, ' do ')],
      sections,
    );
    expect(coverage.state).toBe('covered');
    expect(coverage.covered).toBe(3);
    expect(explainCoverageSummary(coverage)).toBe('ครอบคลุมครบ 3 ข้อ (เทียบกับหัวข้อย่อยที่ระบุไว้)');
    expect(explainCoverageWarning(coverage)).toBeNull();
  });

  it('ข้อมีหัวข้อย่อย แต่บทไม่มี → partial และบอกหัวข้อย่อยที่ขาดพร้อมจำนวนข้อ', () => {
    const coverage = explainCoverage(
      [
        question(1, 'Do'),
        question(2, 'So/Neither + auxiliary'),
        question(3, 'So/Neither + auxiliary'),
        question(4, 'have got'),
      ],
      sections,
    );
    expect(coverage.state).toBe('partial');
    expect(coverage.covered).toBe(1);
    expect(coverage.missing).toBe(3);
    expect(coverage.missingSubTopics).toEqual([
      { label: 'So/Neither + auxiliary', questionCount: 2 },
      { label: 'have got', questionCount: 1 },
    ]);
    expect(explainCoverageWarning(coverage)).toBe(
      'บทนี้อาจอธิบายไม่ครบทุกข้อ — ยังไม่มีหัวข้อย่อย: So/Neither + auxiliary (2 ข้อ), have got (1 ข้อ)',
    );
    expect(explainCoverageSummary(coverage)).toBe('ครอบคลุม 1/4 ข้อ · ขาด 3 ข้อ');
  });

  it('ยังไม่ระบุหัวข้อย่อยเลย → unverifiable และเตือนว่าเทียบไม่ได้', () => {
    const coverage = explainCoverage([question(1, null), question(2, ''), question(3, '   ')], sections);
    expect(coverage.state).toBe('unverifiable');
    expect(coverage.untagged).toBe(3);
    expect(coverage.lessonLabels).toEqual(['Do', 'Does', 'Did', 'ลองทำโจทย์']);
    expect(explainCoverageSummary(coverage)).toBe('ข้อในหัวข้อนี้ 3 ข้อยังไม่ระบุหัวข้อย่อย — ยังตรวจความครอบคลุมไม่ได้');
    expect(explainCoverageWarning(coverage)).toBe('ยังตรวจความครอบคลุมไม่ได้: ข้อในหัวข้อนี้ยังไม่ระบุหัวข้อย่อย (3 ข้อ)');
  });

  it('บางข้อมีหัวข้อย่อย บางข้อยังไม่มี → partial และบอกทั้งสองอย่าง', () => {
    const coverage = explainCoverage([question(1, 'Do'), question(2, null)], sections);
    expect(coverage.state).toBe('partial');
    expect(coverage.covered).toBe(1);
    expect(coverage.untagged).toBe(1);
    expect(explainCoverageSummary(coverage)).toBe('ครอบคลุม 1/2 ข้อ · ยังไม่ระบุหัวข้อย่อย 1 ข้อ');
    expect(explainCoverageWarning(coverage)).toBe('บทนี้อาจอธิบายไม่ครบทุกข้อ — ข้อยังไม่ระบุหัวข้อย่อย 1 ข้อ');
  });

  it('บทที่ไม่มีป้ายเลย แต่ข้อมีหัวข้อย่อย → ขาดทั้งหมด', () => {
    const coverage = explainCoverage([question(1, 'Prepositions')], []);
    expect(coverage.state).toBe('partial');
    expect(coverage.lessonLabels).toEqual([]);
    expect(coverage.missingSubTopics).toEqual([{ label: 'Prepositions', questionCount: 1 }]);
  });

  it('เก็บรายละเอียดรายข้อไว้ให้หน้าแอดมินลิสต์ได้', () => {
    const coverage = explainCoverage([question(1, 'Do'), question(2, 'have got')], sections);
    expect(coverage.questions).toEqual([
      { id: 1, questionText: 'โจทย์ข้อ 1', subTopic: 'Do', state: 'covered' },
      { id: 2, questionText: 'โจทย์ข้อ 2', subTopic: 'have got', state: 'missing' },
    ]);
  });
});
