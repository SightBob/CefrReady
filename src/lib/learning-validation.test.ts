import { describe, expect, it } from 'vitest';
import { validateLearningPages } from './learning-validation';

const validTap = [{ type: 'rule', chip: 'Do', rows: [{ left: 'ใช้กับ I / you', right: 'Do you like tea?' }], tap: { items: [{ prompt: 'I like tea.', choiceA: 'ถูก', choiceB: 'ผิด', correct: 0 }] } }];
const validExam = [{ pageType: 'quiz', quiz: { questions: [{ sentence: 'I ____ tea.', options: ['like', 'likes'], answerIndex: 0 }] } }];

describe('validateLearningPages Mini Quiz', () => {
  it('accepts a valid dynamic Mini Quiz independently from the real exam', () => {
    const result = validateLearningPages([
      { pageType: 'explain', sections: [...validTap, { type: 'practice', heading: 'ลองทำโจทย์', practice: { questions: [
        { sentence: 'She ____ tea.', options: ['like', 'likes'], answerIndex: 1 },
        { sentence: 'They ____ tea.', options: ['like', 'likes'], answerIndex: 0 },
      ] } }] },
      ...validExam,
    ]);
    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('rejects incomplete Mini Quiz questions without confusing them with the real exam', () => {
    const result = validateLearningPages([
      { pageType: 'explain', sections: [...validTap, { type: 'practice', practice: { questions: [
        { sentence: 'She ____ tea.', options: ['like'], answerIndex: 0 },
      ] } }] },
      ...validExam,
    ]);
    expect(result.issues.map((issue) => issue.code)).toContain('practice_incomplete');
    expect(result.issues.map((issue) => issue.code)).not.toContain('missing_exam');
  });

  it('still requires a separate real exam page when only the Mini Quiz exists', () => {
    const result = validateLearningPages([
      { pageType: 'explain', sections: [...validTap, { type: 'practice', practice: { questions: [{ sentence: 'She ____ tea.', options: ['like', 'likes'], answerIndex: 1 }] } }] },
    ]);
    expect(result.issues.map((issue) => issue.code)).toContain('missing_exam');
  });
});
