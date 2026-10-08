import { describe, expect, it } from 'vitest';
import { buildAdminExplainPreview } from './explain-preview';

const section = (heading: string, visibility?: 'draft' | 'published') => ({
  type: 'rule' as const,
  heading,
  ...(visibility ? { visibility } : {}),
});

describe('buildAdminExplainPreview', () => {
  it('lets an admin preview review status content that learners cannot see', () => {
    const preview = buildAdminExplainPreview({
      status: 'review',
      sections: [section('หลักการใช้'), section('ส่วนที่ยังไม่เสร็จ', 'draft')],
    });
    expect(preview.status).toBe('review');
    expect(preview.meta.label).toBe('รอตรวจสอบ');
    // เห็นเนื้อหาที่จะถึงมือผู้เรียนได้จริง (ฉบับร่างถูกตัดออกเสมอ)
    expect(preview.sections.map((item) => item.heading)).toEqual(['หลักการใช้']);
    expect(preview.visibleSectionCount).toBe(1);
    expect(preview.hiddenSectionCount).toBe(1);
    expect(preview.learnerSeesNothing).toBe(true);
    expect(preview.notice).toContain('รอตรวจสอบ');
    expect(preview.notice).toContain('ผู้เรียนยังไม่เห็น');
    expect(preview.notice).toContain('ตอนทำข้อสอบ');
  });

  it('reports published content as already visible to learners', () => {
    const preview = buildAdminExplainPreview({ status: 'published', sections: [section('A'), section('B')] });
    expect(preview.learnerSeesNothing).toBe(false);
    expect(preview.hiddenSectionCount).toBe(0);
    expect(preview.notice).toContain('ผู้เรียนเห็น 2 ส่วนนี้');
    expect(preview.notice).not.toContain('ยังไม่เห็น');
  });

  it('warns that a published item with only draft sections stays invisible', () => {
    const preview = buildAdminExplainPreview({ status: 'published', sections: [section('A', 'draft')] });
    expect(preview.sections).toEqual([]);
    expect(preview.learnerSeesNothing).toBe(true);
    expect(preview.notice).toContain('ไม่เห็นเนื้อหาเรื่องนี้เลย');
  });

  it('previews hidden and draft content too, without claiming learners see it', () => {
    for (const status of ['draft', 'hidden'] as const) {
      const preview = buildAdminExplainPreview({ status, sections: [section('A')] });
      expect(preview.status).toBe(status);
      expect(preview.learnerSeesNothing).toBe(true);
      expect(preview.notice).toContain('เมื่อเผยแพร่');
    }
  });

  it('treats an unknown or missing status as draft', () => {
    for (const row of [{ status: 'อะไรก็ไม่รู้', sections: [section('A')] }, { sections: [section('A')] }, null]) {
      const preview = buildAdminExplainPreview(row);
      expect(preview.status).toBe('draft');
      expect(preview.learnerSeesNothing).toBe(true);
    }
  });

  it('counts only explicit draft sections as hidden', () => {
    const preview = buildAdminExplainPreview({
      status: 'published',
      sections: [section('ไม่มีฟิลด์ visibility'), section('published', 'published'), section('draft', 'draft')],
    });
    expect(preview.visibleSectionCount).toBe(2);
    expect(preview.hiddenSectionCount).toBe(1);
  });

  it('survives a row whose sections are not an array', () => {
    const preview = buildAdminExplainPreview({ status: 'published', sections: 'พัง' });
    expect(preview.sections).toEqual([]);
    expect(preview.learnerSeesNothing).toBe(true);
  });
});
