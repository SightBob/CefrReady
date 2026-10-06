/**
 * ตรวจโครงสร้างของ explain รายการเดียวก่อนผ่าน normalize — คืน error (บล็อก
 * การ import) และ warning (บอกว่ามีอะไรถูกดรอป/แก้อัตโนมัติให้) เป็นข้อความ
 * ที่ชี้ตำแหน่งชัด เช่น "sections[2].practice.questions[1].answerIndex=5
 * เกินช่วงของ options" เพื่อให้คนทำไฟล์แก้ถูกจุดโดยไม่ต้องเดา
 *
 * เป็น pure function (ไม่พึ่ง db/next) จึงเขียน unit test ได้ตรงๆ
 */

export const dynamic = 'force-dynamic';

/**
 * ตรวจโครงสร้างของ explain รายการเดียวก่อนผ่าน normalize — คืน error (บล็อก
 * การ import) และ warning (บอกว่ามีอะไรถูกดรอป/แก้อัตโนมัติให้) เป็นข้อความ
 * ที่ชี้ตำแหน่งชัด เช่น "sections[2].practice.questions[1]: answerIndex=5
 * เกินจำนวนตัวเลือก (4)" เพื่อให้คนทำไฟล์แก้ถูกจุดโดยไม่ต้องเดา
 */
export function collectItemIssues(raw: Record<string, unknown>): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  sections.forEach((section, si) => {
    const at = (field: string) => `sections[${si}].${field}`;
    if (!section || typeof section !== 'object') {
      errors.push(`sections[${si}] ต้องเป็น object`);
      return;
    }
    const s = section as Record<string, unknown>;
    const type = typeof s.type === 'string' ? s.type : undefined;
    if (type !== undefined && !['rule', 'detailedRule', 'importantNote', 'practice'].includes(type)) {
      warnings.push(`${at('type')}: "${type}" ไม่ใช่ type ที่รู้จัก (rule/detailedRule/importantNote/practice) — ระบบจะเดา type ให้อัตโนมัติ`);
    }
    for (const field of ['heading', 'body', 'chip', 'description', 'tip'] as const) {
      const value = s[field];
      if (value !== undefined && value !== null && typeof value !== 'string') {
        errors.push(`${at(field)} ต้องเป็น string ไม่ใช่ ${value === null ? 'null' : typeof value}`);
      }
    }

    if (s.rows !== undefined && !Array.isArray(s.rows)) {
      errors.push(`${at('rows')} ต้องเป็น array`);
    } else if (Array.isArray(s.rows)) {
      s.rows.forEach((row, ri) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
          errors.push(`${at(`rows[${ri}]`)} ต้องเป็น object { left, right? }`);
          return;
        }
        const item = row as Record<string, unknown>;
        if (typeof item.left !== 'string') errors.push(`${at(`rows[${ri}].left`)} ต้องเป็น string (ถ้าไม่มี left แถวนี้จะถูกลบทิ้ง)`);
        if (item.right !== undefined && item.right !== null && typeof item.right !== 'string') {
          errors.push(`${at(`rows[${ri}].right`)} ต้องเป็น string หรือไม่ระบุ`);
        }
      });
    }

    if (s.examples !== undefined && !Array.isArray(s.examples)) {
      errors.push(`${at('examples')} ต้องเป็น array`);
    } else if (Array.isArray(s.examples)) {
      s.examples.forEach((example, ei) => {
        if (!example || typeof example !== 'object' || Array.isArray(example)) {
          errors.push(`${at(`examples[${ei}]`)} ต้องเป็น object { en, th?, ok? }`);
          return;
        }
        const item = example as Record<string, unknown>;
        if (typeof item.en !== 'string') errors.push(`${at(`examples[${ei}].en`)} ต้องเป็น string (ถ้าไม่มี en การ์ดนี้จะถูกลบทิ้ง)`);
        if (item.th !== undefined && item.th !== null && typeof item.th !== 'string') errors.push(`${at(`examples[${ei}].th`)} ต้องเป็น string หรือไม่ระบุ`);
        if (item.ok !== undefined && item.ok !== null && typeof item.ok !== 'boolean') errors.push(`${at(`examples[${ei}].ok`)} ต้องเป็น true/false หรือไม่ระบุ`);
      });
    }

    if (s.practice !== undefined) {
      const practice = s.practice;
      if (!practice || typeof practice !== 'object' || Array.isArray(practice)) {
        errors.push(`${at('practice')} ต้องเป็น object { questions: [...] }`);
      } else {
        const p = practice as Record<string, unknown>;
        if (!Array.isArray(p.questions)) {
          errors.push(`${at('practice.questions')} ต้องเป็น array`);
        } else {
          p.questions.forEach((question, qi) => {
            const qAt = at(`practice.questions[${qi}]`);
            if (!question || typeof question !== 'object' || Array.isArray(question)) {
              errors.push(`${qAt} ต้องเป็น object { sentence, options, answerIndex }`);
              return;
            }
            const q = question as Record<string, unknown>;
            if (typeof q.sentence !== 'string') errors.push(`${qAt}.sentence ต้องเป็น string`);
            if (!Array.isArray(q.options) || q.options.length === 0) {
              errors.push(`${qAt}.options ต้องเป็น array ที่มีตัวเลือกอย่างน้อย 1 ข้อ`);
            } else {
              q.options.forEach((option, oi) => {
                if (option !== undefined && option !== null && typeof option !== 'string') errors.push(`${qAt}.options[${oi}] ต้องเป็น string`);
              });
              if (typeof q.answerIndex !== 'number' || !Number.isInteger(q.answerIndex)) {
                errors.push(`${qAt}.answerIndex ต้องเป็นตัวเลขจำนวนเต็ม`);
              } else if (q.answerIndex < 0 || q.answerIndex >= q.options.length) {
                errors.push(`${qAt}.answerIndex=${q.answerIndex} เกินช่วงของ options (มี ${q.options.length} ตัวเลือก — ต้องเป็น 0 ถึง ${q.options.length - 1})`);
              }
            }
            if (q.explanation !== undefined && q.explanation !== null && typeof q.explanation !== 'string') errors.push(`${qAt}.explanation ต้องเป็น string หรือไม่ระบุ`);
          });
        }
      }
    }
  });

  // คำเตือนเชิงเนื้อหา: practice ที่จะโดนดรอปเพราะตอบไม่ได้ หรือ grammarTopic ที่อาจไม่ตรงกับข้อสอบ
  const draftSections = Array.isArray(raw.sections) ? raw.sections : [];
  draftSections.forEach((section, si) => {
    if (!section || typeof section !== 'object') return;
    const s = section as Record<string, unknown>;
    const p = s.practice && typeof s.practice === 'object' && !Array.isArray(s.practice) ? s.practice as Record<string, unknown> : null;
    if (!Array.isArray(p?.questions)) return;
    p.questions.forEach((question, qi) => {
      const q = question as Record<string, unknown>;
      if (!q || typeof q !== 'object' || typeof q.sentence !== 'string' || !Array.isArray(q.options) || typeof q.answerIndex !== 'number') return;
      const nonEmpty = q.options.filter((option) => typeof option === 'string' && option.trim());
      const answer = typeof q.options[q.answerIndex] === 'string' ? (q.options[q.answerIndex] as string).trim() : '';
      if (q.sentence.trim() && (nonEmpty.length < 2 || !answer)) {
        warnings.push(`sections[${si}].practice.questions[${qi}]: มีโจทย์แต่ตัวเลือกใช้ได้ < 2 ข้อ หรือคำตอบที่ชี้ว่าง — ข้อนี้จะถูกลบออกตอนเผยแพร่`);
      }
    });
  });

  return { errors, warnings };
}
