/**
 * ตรวจโครงสร้างของ explain รายการเดียวก่อนผ่าน normalize — คืน error (บล็อก
 * การ import) และ warning (บอกว่ามีอะไรถูกดรอป/แก้อัตโนมัติให้) เป็นข้อความ
 * ที่ชี้ตำแหน่งชัด เช่น "sections[2].practice.questions[1].answerIndex=5
 * เกินช่วงของ options" เพื่อให้คนทำไฟล์แก้ถูกจุดโดยไม่ต้องเดา
 *
 * เป็น pure function (ไม่พึ่ง db/next) จึงเขียน unit test ได้ตรงๆ
 */

import { normalizeFormulaBarTone } from '@/lib/lesson-sections';

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
    // visibility='draft' = ซ่อนจากผู้เรียน ถ้าพิมพ์ผิดแล้วระบบมองข้าม ส่วนที่ยังไม่เสร็จจะหลุดถึงผู้เรียน
    // จึงเป็น error ไม่ใช่ warning
    if (s.visibility !== undefined && s.visibility !== null && s.visibility !== 'draft' && s.visibility !== 'published') {
      errors.push(`${at('visibility')}: ${JSON.stringify(s.visibility)} ไม่รู้จัก — ใช้ "draft" (ยังไม่แสดงให้ผู้เรียน) หรือ "published" (แสดง) เท่านั้น`);
    }
    if (type !== undefined && !['rule', 'detailedRule', 'importantNote', 'practice', 'formulaBreakdown', 'typeBreakdown'].includes(type)) {
      warnings.push(`${at('type')}: "${type}" ไม่ใช่ type ที่รู้จัก (rule/detailedRule/importantNote/practice/formulaBreakdown/typeBreakdown) — ระบบจะเดา type ให้อัตโนมัติ`);
    }

    // Core Formula breakdown — cases[].left/right ต้องเป็น object { sentence, note } ที่เป็น string เท่านั้น
    if (s.formula !== undefined) {
      const formula = s.formula;
      if (!formula || typeof formula !== 'object' || Array.isArray(formula)) {
        errors.push(`${at('formula')} ต้องเป็น object { cases: [...] }`);
      } else {
        const f = formula as Record<string, unknown>;
        if (!Array.isArray(f.cases)) {
          errors.push(`${at('formula.cases')} ต้องเป็น array`);
        } else {
          f.cases.forEach((item, ci) => {
            const cAt = at(`formula.cases[${ci}]`);
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
              errors.push(`${cAt} ต้องเป็น object { label, example, left, right }`);
              return;
            }
            const entry = item as Record<string, unknown>;
            for (const field of ['label', 'example'] as const) {
              if (entry[field] !== undefined && entry[field] !== null && typeof entry[field] !== 'string') {
                errors.push(`${cAt}.${field} ต้องเป็น string หรือไม่ระบุ`);
              }
            }
            for (const side of ['left', 'right'] as const) {
              const column = entry[side];
              if (column === undefined || column === null) continue;
              if (typeof column !== 'object' || Array.isArray(column)) {
                errors.push(`${cAt}.${side} ต้องเป็น object { sentence, note }`);
                continue;
              }
              const col = column as Record<string, unknown>;
              for (const field of ['sentence', 'note'] as const) {
                if (col[field] !== undefined && col[field] !== null && typeof col[field] !== 'string') {
                  errors.push(`${cAt}.${side}.${field} ต้องเป็น string หรือไม่ระบุ`);
                }
              }
              if (col.tone !== undefined && col.tone !== null && !normalizeFormulaBarTone(col.tone)) {
                errors.push(`${cAt}.${side}.tone ต้องเป็น "purple" หรือ "yellow" (หรือไม่ระบุ = ใช้สีตามตำแหน่งคอลัมน์)`);
              }
            }
          });
        }
      }
    }
    // Type Breakdown — cases[].{label, color?, description, structure, example, note} ต้องเป็น string
    if (s.typeBreakdown !== undefined) {
      const typeBreakdown = s.typeBreakdown;
      if (!typeBreakdown || typeof typeBreakdown !== 'object' || Array.isArray(typeBreakdown)) {
        errors.push(`${at('typeBreakdown')} ต้องเป็น object { cases: [...] }`);
      } else {
        const t = typeBreakdown as Record<string, unknown>;
        if (!Array.isArray(t.cases)) {
          errors.push(`${at('typeBreakdown.cases')} ต้องเป็น array`);
        } else {
          t.cases.forEach((item, ci) => {
            const cAt = at(`typeBreakdown.cases[${ci}]`);
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
              errors.push(`${cAt} ต้องเป็น object { label, description, structure, example, note }`);
              return;
            }
            const entry = item as Record<string, unknown>;
            for (const field of ['label', 'color', 'description', 'structure', 'example', 'note'] as const) {
              if (entry[field] !== undefined && entry[field] !== null && typeof entry[field] !== 'string') {
                errors.push(`${cAt}.${field} ต้องเป็น string หรือไม่ระบุ`);
              }
            }
          });
        }
      }
    }

    for (const field of ['heading', 'body', 'chip', 'description', 'tip', 'quizHeading'] as const) {
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

  // คำเตือนเชิงเนื้อหา: เคสของ Core Formula breakdown ที่ยังไม่มีประโยคในแถบสีทั้งสองข้าง
  const formulaSections = Array.isArray(raw.sections) ? raw.sections : [];
  formulaSections.forEach((section, si) => {
    if (!section || typeof section !== 'object') return;
    const s = section as Record<string, unknown>;
    const formula = s.formula && typeof s.formula === 'object' && !Array.isArray(s.formula) ? s.formula as Record<string, unknown> : null;
    if (!Array.isArray(formula?.cases)) return;
    formula.cases.forEach((item, ci) => {
      if (!item || typeof item !== 'object') return;
      const entry = item as Record<string, unknown>;
      const readSentence = (side: unknown) => {
        const col = side && typeof side === 'object' && !Array.isArray(side) ? side as Record<string, unknown> : {};
        return typeof col.sentence === 'string' ? col.sentence.trim() : '';
      };
      if (!readSentence(entry.left) && !readSentence(entry.right)) {
        warnings.push(`sections[${si}].formula.cases[${ci}]: ยังไม่มีประโยคในแถบสีทั้งสองข้าง — เคสนี้จะไม่แสดง`);
      }
    });
  });

  // คำเตือนเชิงเนื้อหา: เคสของ Type Breakdown ที่ยังไม่มีโครงสร้างหรือประโยคตัวอย่าง (จะแสดงแถบเปล่า)
  const typeSections = Array.isArray(raw.sections) ? raw.sections : [];
  typeSections.forEach((section, si) => {
    if (!section || typeof section !== 'object') return;
    const s = section as Record<string, unknown>;
    const typeBreakdown = s.typeBreakdown && typeof s.typeBreakdown === 'object' && !Array.isArray(s.typeBreakdown)
      ? s.typeBreakdown as Record<string, unknown>
      : null;
    if (!Array.isArray(typeBreakdown?.cases)) return;
    typeBreakdown.cases.forEach((item, ci) => {
      if (!item || typeof item !== 'object') return;
      const entry = item as Record<string, unknown>;
      const structure = typeof entry.structure === 'string' ? entry.structure.trim() : '';
      const example = typeof entry.example === 'string' ? entry.example.trim() : '';
      if (!structure || !example) {
        warnings.push(`sections[${si}].typeBreakdown.cases[${ci}]: ยังไม่มี${!structure ? 'ช่องโครงสร้าง' : 'ประโยคตัวอย่าง'} — แถบส่วนนี้จะว่าง`);
      }
    });
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
