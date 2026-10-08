/**
 * สถานะของเนื้อหา Explain — แยก "สถานะ" ออกจาก "ข้อมูล"
 *
 * ระบบใช้ DB และโค้ดชุดเดียวกันทั้งแอดมินและผู้เรียน แล้วคุมการแสดงผลด้วยสถานะ:
 *
 *  draft      → อยู่ระหว่างการพัฒนา (ผู้เรียนไม่เห็น)
 *  review     → เขียนเสร็จแล้ว กำลังตรวจสอบ (ผู้เรียนไม่เห็น)
 *  published  → พร้อมให้ผู้เรียนเห็น
 *  hidden     → มีข้อมูลอยู่ แต่ปิดไม่ให้ผู้เรียนเห็นชั่วคราว (maintenance)
 *
 * เนื้อหาเต็มเรื่องอาจพร้อมแล้วแต่บางส่วนยังไม่เสร็จ จึงกำหนดสถานะรายส่วนได้ด้วย
 * (`section.visibility`) — ส่วนที่เป็น `draft` จะถูกตัดออกก่อนถึงมือผู้เรียนเสมอ
 * ที่นี่เป็นที่เดียวที่ตัดสินกฎนี้ ทั้งหน้าแอดมิน (พรีวิว) และ API ฝั่งผู้เรียนใช้ร่วมกัน
 */

import type { LessonSection } from '@/lib/lesson-sections';

export type ContentStatus = 'draft' | 'review' | 'published' | 'hidden';
export type SectionVisibility = 'draft' | 'published';

export const CONTENT_STATUSES: readonly ContentStatus[] = ['draft', 'review', 'published', 'hidden'];

/** สถานะเดียวที่ผู้เรียนเห็นได้ */
export const PUBLISHED_STATUS: ContentStatus = 'published';

/** ค่าที่ไม่รู้จัก/ว่าง → draft (ปลอดภัยกว่าเผลอเปิดเนื้อหาที่ยังไม่เสร็จให้ผู้เรียน) */
export function parseContentStatus(value: unknown): ContentStatus {
  return typeof value === 'string' && (CONTENT_STATUSES as readonly string[]).includes(value)
    ? (value as ContentStatus)
    : 'draft';
}

/**
 * สถานะจาก payload ของแอดมิน — รับทั้ง `status` แบบใหม่และ `isPublished` แบบเดิม
 * (ฟอร์ม/ไฟล์ที่ยังใช้อยู่ต้องไม่พัง):
 *   - มี status  → ต้องเป็นค่าที่รู้จัก ไม่งั้นคืน null (ผู้เรียกตอบ 400)
 *   - ไม่มี status → isPublished true = published, false/ไม่ระบุ = draft
 */
export function resolveContentStatus(payload: { status?: unknown; isPublished?: unknown }): ContentStatus | null {
  if (payload.status !== undefined && payload.status !== null) {
    return typeof payload.status === 'string' && (CONTENT_STATUSES as readonly string[]).includes(payload.status)
      ? (payload.status as ContentStatus)
      : null;
  }
  if (payload.isPublished === true) return PUBLISHED_STATUS;
  return 'draft';
}

/** ผู้เรียนเห็นเนื้อหานี้ได้ไหม (draft/review/hidden = เห็นเฉพาะแอดมิน) */
export function isLearnerVisibleStatus(value: unknown): boolean {
  return parseContentStatus(value) === PUBLISHED_STATUS;
}

/** ค่าที่ไม่รู้จัก → published เพราะเนื้อหาเดิมที่ยังไม่มีฟิลด์นี้ต้องไม่หายไปจากผู้เรียน */
export function parseSectionVisibility(value: unknown): SectionVisibility {
  return value === 'draft' ? 'draft' : 'published';
}

export function isSectionVisibleToLearners(section: { visibility?: unknown } | null | undefined): boolean {
  return parseSectionVisibility(section?.visibility) === 'published';
}

/** ตัดส่วนที่ยังไม่เสร็จออก — ใช้ก่อนส่งเนื้อหาให้ผู้เรียนทุกเส้นทาง */
export function filterLearnerSections(sections: LessonSection[] | null | undefined): LessonSection[] {
  if (!Array.isArray(sections)) return [];
  return sections.filter((section) => isSectionVisibleToLearners(section));
}

export interface ContentStatusMeta {
  label: string;
  hint: string;
  /** true = ผู้เรียนเห็นเนื้อหาส่วนที่พร้อมแล้ว */
  learnerVisible: boolean;
  /** ป้ายสถานะในลิสต์/ตาราง */
  badgeClass: string;
  /** ปุ่มที่ถูกเลือกในตัวเลือกสถานะ */
  selectedClass: string;
}

export const CONTENT_STATUS_META: Record<ContentStatus, ContentStatusMeta> = {
  draft: {
    label: 'ฉบับร่าง',
    hint: 'กำลังพัฒนา — ผู้เรียนยังไม่เห็นเนื้อหานี้',
    learnerVisible: false,
    badgeClass: 'bg-amber-100 text-amber-700',
    selectedClass: 'border-amber-400 bg-amber-50 text-amber-700',
  },
  review: {
    label: 'รอตรวจสอบ',
    hint: 'เขียนเสร็จแล้ว กำลังตรวจสอบ — ผู้เรียนยังไม่เห็น',
    learnerVisible: false,
    badgeClass: 'bg-sky-100 text-sky-700',
    selectedClass: 'border-sky-400 bg-sky-50 text-sky-700',
  },
  published: {
    label: 'เผยแพร่',
    hint: 'ผู้เรียนเห็นเนื้อหาส่วนที่พร้อมแล้ว',
    learnerVisible: true,
    badgeClass: 'bg-emerald-100 text-emerald-700',
    selectedClass: 'border-emerald-400 bg-emerald-50 text-emerald-700',
  },
  hidden: {
    label: 'ปิดชั่วคราว',
    hint: 'มีข้อมูลอยู่ แต่ปิดไม่ให้ผู้เรียนเห็น (maintenance)',
    learnerVisible: false,
    badgeClass: 'bg-slate-200 text-slate-600',
    selectedClass: 'border-slate-400 bg-slate-100 text-slate-700',
  },
};

export function contentStatusMeta(value: unknown): ContentStatusMeta {
  return CONTENT_STATUS_META[parseContentStatus(value)];
}

/**
 * เหมือน `toLearnerExplain` แต่ **ไม่เช็คสถานะ** — สำหรับ "โหมดพรีวิวของแอดมิน" เท่านั้น
 * ยังตัดส่วนที่เป็นฉบับร่างออกเหมือนที่ผู้เรียนจะได้รับ เพื่อให้เห็นของจริงว่าอะไรจะถึงมือผู้เรียน
 * (ทุกเส้นทางของผู้เรียนต้องใช้ `toLearnerExplain` ไม่ใช่ตัวนี้)
 */
export function toPreviewExplain<
  T extends { status?: unknown; sections?: LessonSection[] | null },
>(row: T | null | undefined): (T & { sections: LessonSection[] }) | null {
  if (!row) return null;
  const sections = filterLearnerSections(row.sections);
  return sections.length ? { ...row, sections } : null;
}

/**
 * แปลงแถวจาก DB เป็นเนื้อหาที่ผู้เรียนเห็นได้จริง — คืน null เมื่อ
 *  - สถานะไม่ใช่ published (draft/review/hidden), หรือ
 *  - ทุกส่วนยังเป็นฉบับร่าง (ผู้เรียนจะไม่เจอหน้าว่าง)
 */
export function toLearnerExplain<
  T extends { status?: unknown; sections?: LessonSection[] | null },
>(row: T | null | undefined): (T & { sections: LessonSection[] }) | null {
  if (!row || !isLearnerVisibleStatus(row.status)) return null;
  const sections = filterLearnerSections(row.sections);
  return sections.length ? { ...row, sections } : null;
}
