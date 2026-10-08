import { describe, expect, it } from 'vitest';
import type { LessonSection } from '@/lib/lesson-sections';
import {
  CONTENT_STATUSES,
  contentStatusMeta,
  filterLearnerSections,
  isLearnerVisibleStatus,
  isSectionVisibleToLearners,
  parseContentStatus,
  parseSectionVisibility,
  resolveContentStatus,
  toLearnerExplain,
  toPreviewExplain,
} from './explain-visibility';

const section = (overrides: Partial<LessonSection> = {}): LessonSection => ({
  type: 'rule',
  heading: 'หลักการใช้',
  ...overrides,
});

describe('parseContentStatus', () => {
  it('รู้จักสถานะทั้ง 4 แบบ', () => {
    for (const status of CONTENT_STATUSES) {
      expect(parseContentStatus(status)).toBe(status);
    }
  });

  it('ค่าที่ไม่รู้จัก/ว่าง/ผิดประเภท ถือเป็นฉบับร่าง (ไม่เผลอเปิดเนื้อหาที่ยังไม่เสร็จ)', () => {
    for (const value of [undefined, null, '', 'PUBLISHED', 'publish', true, 1, {}, []]) {
      expect(parseContentStatus(value)).toBe('draft');
    }
  });
});

describe('resolveContentStatus', () => {
  it('ใช้ status ที่ส่งมาเมื่อรู้จัก (รวม hidden)', () => {
    expect(resolveContentStatus({ status: 'review' })).toBe('review');
    expect(resolveContentStatus({ status: 'hidden' })).toBe('hidden');
    expect(resolveContentStatus({ status: 'draft' })).toBe('draft');
  });

  it('status ชนะ isPublished เสมอ', () => {
    expect(resolveContentStatus({ status: 'draft', isPublished: true })).toBe('draft');
  });

  it('ไม่ส่ง status → ถอยไปใช้ isPublished แบบเดิมได้', () => {
    expect(resolveContentStatus({ isPublished: true })).toBe('published');
    expect(resolveContentStatus({ isPublished: false })).toBe('draft');
    expect(resolveContentStatus({})).toBe('draft');
  });

  it('status ที่ไม่รู้จัก/ผิดประเภท → null (ผู้เรียกต้องตอบ 400 ไม่ใช่เดาแล้วบันทึก)', () => {
    expect(resolveContentStatus({ status: 'publish' })).toBeNull();
    expect(resolveContentStatus({ status: 1 })).toBeNull();
    expect(resolveContentStatus({ status: true })).toBeNull();
  });
});

describe('isLearnerVisibleStatus', () => {
  it('เห็นเฉพาะ published — draft/review/hidden ผู้เรียนไม่เห็น', () => {
    expect(isLearnerVisibleStatus('published')).toBe(true);
    expect(isLearnerVisibleStatus('review')).toBe(false);
    expect(isLearnerVisibleStatus('draft')).toBe(false);
    expect(isLearnerVisibleStatus('hidden')).toBe(false);
    expect(isLearnerVisibleStatus(undefined)).toBe(false);
  });
});

describe('section visibility', () => {
  it('ไม่มีค่า = เผยแพร่ (เนื้อหาเดิมต้องไม่หายไปจากผู้เรียน)', () => {
    expect(parseSectionVisibility(undefined)).toBe('published');
    expect(parseSectionVisibility('published')).toBe('published');
    expect(parseSectionVisibility('อะไรก็ไม่รู้')).toBe('published');
    expect(parseSectionVisibility('draft')).toBe('draft');
  });

  it('isSectionVisibleToLearners มองข้ามค่าแปลก ๆ ได้', () => {
    expect(isSectionVisibleToLearners(section())).toBe(true);
    expect(isSectionVisibleToLearners(section({ visibility: 'draft' }))).toBe(false);
    expect(isSectionVisibleToLearners(null)).toBe(true);
  });

  it('filterLearnerSections ตัดส่วนฉบับร่างออก และทนค่า null/ไม่ใช่ array', () => {
    const sections = [section({ heading: 'A' }), section({ heading: 'B', visibility: 'draft' }), section({ heading: 'C', visibility: 'published' })];
    expect(filterLearnerSections(sections).map((item) => item.heading)).toEqual(['A', 'C']);
    expect(filterLearnerSections(null)).toEqual([]);
    expect(filterLearnerSections(undefined)).toEqual([]);
  });
});

describe('toLearnerExplain', () => {
  const row = (status: string, sections: LessonSection[]) => ({ id: 1, title: 'Present Simple', status, sections });

  it('published + มีส่วนที่พร้อม → ส่งเฉพาะส่วนที่ผู้เรียนเห็น', () => {
    const result = toLearnerExplain(row('published', [section({ heading: 'A' }), section({ heading: 'B', visibility: 'draft' })]));
    expect(result?.sections.map((item) => item.heading)).toEqual(['A']);
    expect(result?.title).toBe('Present Simple');
  });

  it('draft/review/hidden → null เสมอ', () => {
    for (const status of ['draft', 'review', 'hidden']) {
      expect(toLearnerExplain(row(status, [section()]))).toBeNull();
    }
  });

  it('published แต่ทุกส่วนเป็นฉบับร่าง → null (ผู้เรียนไม่เจอหน้าว่าง)', () => {
    expect(toLearnerExplain(row('published', [section({ visibility: 'draft' })]))).toBeNull();
  });

  it('tolerates a row without sections', () => {
    expect(toLearnerExplain({ status: 'published', sections: null })).toBeNull();
    expect(toLearnerExplain(null)).toBeNull();
  });
});

describe('toPreviewExplain (โหมดพรีวิวของแอดมิน)', () => {
  const row = (status: string, sections: LessonSection[]) => ({ id: 1, title: 'Present Simple', status, sections });

  it('ส่งเนื้อหาที่ยังไม่เผยแพร่ให้แอดมินตรวจ (ต่างจากผู้เรียน)', () => {
    for (const status of ['draft', 'review', 'hidden']) {
      const result = toPreviewExplain(row(status, [section({ heading: 'A' })]));
      expect(result?.sections.map((item) => item.heading)).toEqual(['A']);
      // ผู้เรียนยังไม่เห็นเรื่องเดียวกันนี้
      expect(toLearnerExplain(row(status, [section({ heading: 'A' })]))).toBeNull();
    }
  });

  it('ยังตัดส่วนที่เป็นฉบับร่างออกเหมือนที่ผู้เรียนจะได้รับจริง', () => {
    const result = toPreviewExplain(row('review', [section({ heading: 'A' }), section({ heading: 'B', visibility: 'draft' })]));
    expect(result?.sections.map((item) => item.heading)).toEqual(['A']);
  });

  it('คืน null เมื่อทุกส่วนเป็นฉบับร่าง หรือไม่มีแถว/ไม่มี sections', () => {
    expect(toPreviewExplain(row('published', [section({ visibility: 'draft' })]))).toBeNull();
    expect(toPreviewExplain({ status: 'review', sections: null })).toBeNull();
    expect(toPreviewExplain(null)).toBeNull();
  });
});

describe('contentStatusMeta', () => {
  it('บอกป้าย/คำอธิบาย และว่าใครเห็น', () => {
    expect(contentStatusMeta('published')).toMatchObject({ label: 'เผยแพร่', learnerVisible: true });
    expect(contentStatusMeta('hidden').label).toBe('ปิดชั่วคราว');
    expect(contentStatusMeta('hidden').learnerVisible).toBe(false);
    expect(contentStatusMeta('review').hint).toContain('ยังไม่เห็น');
    expect(contentStatusMeta(undefined).label).toBe('ฉบับร่าง');
  });
});
