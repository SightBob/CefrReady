export type LearningValidationIssue = {
  code: string;
  message: string;
};

export type LearningValidationResult = {
  valid: boolean;
  issues: LearningValidationIssue[];
};

type PageLike = {
  pageType?: unknown;
  sections?: unknown;
  quiz?: unknown;
  intro?: unknown;
};

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function quizQuestions(value: unknown): Array<Record<string, unknown>> {
  if (!value || typeof value !== 'object') return [];
  const quiz = value as { questions?: unknown; sentence?: unknown };
  if (Array.isArray(quiz.questions)) {
    return quiz.questions.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'));
  }
  return nonEmpty(quiz.sentence) ? [quiz as Record<string, unknown>] : [];
}

function sectionPracticeQuestions(value: unknown): Array<Record<string, unknown>> {
  if (!value || typeof value !== 'object') return [];
  const practice = value as { questions?: unknown; sentence?: unknown };
  if (Array.isArray(practice.questions)) {
    return practice.questions.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'));
  }
  // Pre-migration practice sections saved a single question directly.
  return typeof practice.sentence === 'string' ? [practice as Record<string, unknown>] : [];
}

export function validateLearningPages(pages: PageLike[]): LearningValidationResult {
  const issues: LearningValidationIssue[] = [];
  const explainPages = pages.filter((page) => page.pageType === 'explain');
  const quizPages = pages.filter((page) => page.pageType === 'quiz');

  const hasConcept = explainPages.some((page) => {
    if (nonEmpty(page.intro)) return true; // Legacy intro will be migrated on read/edit.
    const sections = Array.isArray(page.sections) ? page.sections : [];
    return sections.some((section) => {
      if (!section || typeof section !== 'object') return false;
      const item = section as Record<string, unknown>;
      if (nonEmpty(item.heading) || nonEmpty(item.body) || nonEmpty(item.chip) || nonEmpty(item.description) || nonEmpty(item.tip)) return true;
      if (item.tap && typeof item.tap === 'object') return true;
      if (Array.isArray(item.examples) && item.examples.some((example) => example && typeof example === 'object' && nonEmpty((example as { en?: unknown }).en))) return true;
      if (item.table && typeof item.table === 'object' && Array.isArray((item.table as { rows?: unknown }).rows) && (item.table as { rows: unknown[] }).rows.length > 0) return true;
      if (sectionPracticeQuestions(item.practice).some((question) => nonEmpty(question.sentence))) return true;
      if (Array.isArray(item.rows) && item.rows.some((row) => row && typeof row === 'object' && (nonEmpty((row as { left?: unknown }).left) || nonEmpty((row as { right?: unknown }).right)))) return true;
      return false;
    });
  });
  if (!hasConcept) {
    issues.push({ code: 'missing_concept', message: 'ต้องมี Section อธิบายเนื้อหาอย่างน้อย 1 Section' });
  }

  const incompletePractice = explainPages.flatMap((page) => Array.isArray(page.sections) ? page.sections : []).flatMap((section) => {
    if (!section || typeof section !== 'object') return [];
    const item = section as Record<string, unknown>;
    if (item.type !== 'practice' && !item.practice) return [];
    const questions = sectionPracticeQuestions(item.practice);
    if (!questions.length) return [{ sentence: '' }];
    return questions.filter((question) => {
      const options = Array.isArray(question.options) ? question.options : [];
      return !nonEmpty(question.sentence) || options.filter(nonEmpty).length < 2 || typeof question.answerIndex !== 'number' || question.answerIndex < 0 || question.answerIndex >= options.length || !nonEmpty(options[question.answerIndex]);
    });
  });
  incompletePractice.forEach((_, index) => issues.push({ code: 'practice_incomplete', message: `Mini Quiz ข้อที่ ${index + 1} ต้องมีโจทย์ ตัวเลือกอย่างน้อย 2 ข้อ และเฉลย` }));

  const hasTap = explainPages.some((page) => {
    const sections = Array.isArray(page.sections) ? page.sections : [];
    return sections.some((section) => {
      if (!section || typeof section !== 'object') return false;
      const tap = (section as { tap?: unknown }).tap;
      if (!tap || typeof tap !== 'object') return false;
      const items = (tap as { items?: unknown }).items;
      return Array.isArray(items) && items.some((item) => {
        if (!item || typeof item !== 'object') return false;
        const row = item as { prompt?: unknown; choiceA?: unknown; choiceB?: unknown; correct?: unknown };
        return nonEmpty(row.prompt) && nonEmpty(row.choiceA) && nonEmpty(row.choiceB) && (row.correct === 0 || row.correct === 1);
      });
    });
  });
  if (!hasTap) {
    issues.push({ code: 'missing_tap', message: 'ต้องมี Tap & Select ที่มีโจทย์และตัวเลือกครบ 2 ตัวเลือกอย่างน้อย 1 ข้อ' });
  }

  const questions = quizPages.flatMap((page) => quizQuestions(page.quiz));
  if (questions.length === 0) {
    issues.push({ code: 'missing_exam', message: 'ต้องมี Real Exam อย่างน้อย 1 ข้อ' });
  } else {
    questions.forEach((question, index) => {
      const options = Array.isArray(question.options) ? question.options : [];
      const filledOptions = options.filter(nonEmpty);
      if (!nonEmpty(question.sentence)) issues.push({ code: 'exam_sentence', message: `Real Exam ข้อที่ ${index + 1} ยังไม่มีโจทย์` });
      if (filledOptions.length < 2) issues.push({ code: 'exam_options', message: `Real Exam ข้อที่ ${index + 1} ต้องมีตัวเลือกอย่างน้อย 2 ข้อ` });
      if (typeof question.answerIndex !== 'number' || question.answerIndex < 0 || question.answerIndex >= options.length || !nonEmpty(options[question.answerIndex])) {
        issues.push({ code: 'exam_answer', message: `Real Exam ข้อที่ ${index + 1} ยังไม่ได้กำหนดคำตอบที่ถูกต้อง` });
      }
      const normalized = filledOptions.map((option) => option.trim().toLowerCase());
      if (new Set(normalized).size !== normalized.length) issues.push({ code: 'exam_duplicate_options', message: `Real Exam ข้อที่ ${index + 1} มีตัวเลือกซ้ำกัน` });
    });
  }

  return { valid: issues.length === 0, issues };
}
