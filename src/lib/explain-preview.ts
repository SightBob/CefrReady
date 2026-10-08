/**
 * พรีวิวสำหรับแอดมิน — ให้แอดมินเปิด "หน้าอธิบายจริง" ของเนื้อหาที่ยังไม่เผยแพร่ได้
 *
 * ใช้กฎเดียวกับที่ผู้เรียนเห็นทุกข้อ: ส่วนที่ตั้งเป็นฉบับร่างถูกตัดออก แต่ **ข้ามด่านสถานะ**
 * เพื่อให้ตรวจเนื้อหาสถานะ ฉบับร่าง / รอตรวจสอบ / ปิดชั่วคราว ได้ก่อนเผยแพร่
 *
 * ผู้เรียนยังไม่เห็นเนื้อหาที่ไม่ใช่ published ทุกเส้นทาง (หน้าอธิบายก่อนสอบและ overlay
 * ระหว่างทำข้อสอบอ่านเฉพาะ published ผ่าน src/lib/test-explains.ts และ
 * src/app/api/test-explains/lookup) — ที่นี่จึงเป็นทางเดียวที่เห็นของที่ยังไม่เผยแพร่
 */

import {
  contentStatusMeta,
  filterLearnerSections,
  isLearnerVisibleStatus,
  parseContentStatus,
  parseSectionVisibility,
  PUBLISHED_STATUS,
  type ContentStatus,
  type ContentStatusMeta,
} from './explain-visibility';
import { normalizeLessonSections, type LessonSection } from './lesson-sections';

export interface AdminExplainPreview {
  status: ContentStatus;
  meta: ContentStatusMeta;
  /** ส่วนที่ผู้เรียนจะเห็นจริง (ฉบับร่างถูกตัดออกแล้ว) */
  sections: LessonSection[];
  visibleSectionCount: number;
  /** จำนวนส่วนที่กรอกไว้แต่ตั้งเป็นฉบับร่าง — ผู้เรียนจะไม่เห็น */
  hiddenSectionCount: number;
  /** true = สถานะยังไม่เผยแพร่ หรือทุกส่วนเป็นฉบับร่าง (ผู้เรียนไม่เห็นเนื้อหาเรื่องนี้) */
  learnerSeesNothing: boolean;
  /** ข้อความแบนเนอร์บนหน้าพรีวิว */
  notice: string;
}

export function buildAdminExplainPreview(
  row: { status?: unknown; sections?: unknown } | null | undefined
): AdminExplainPreview {
  const status = parseContentStatus(row?.status);
  const meta = contentStatusMeta(status);
  const allSections = normalizeLessonSections(row?.sections);
  const sections = filterLearnerSections(allSections);
  const hiddenSectionCount = allSections.filter(
    (section) => parseSectionVisibility(section.visibility) === 'draft'
  ).length;

  return {
    status,
    meta,
    sections,
    visibleSectionCount: sections.length,
    hiddenSectionCount,
    learnerSeesNothing: sections.length === 0 || !isLearnerVisibleStatus(status),
    notice: `พรีวิวสำหรับแอดมิน · สถานะ ${meta.label} — ${noticeTail(status, sections.length, hiddenSectionCount)}`,
  };
}

function noticeTail(status: ContentStatus, visibleCount: number, hiddenCount: number): string {
  if (visibleCount === 0) {
    return status === PUBLISHED_STATUS
      ? 'ทุกส่วนถูกตั้งเป็นฉบับร่าง ผู้เรียนจึงไม่เห็นเนื้อหาเรื่องนี้เลย'
      : 'ผู้เรียนยังไม่เห็นเนื้อหาเรื่องนี้ (รวมถึงตอนทำข้อสอบ)';
  }

  const parts = [
    status === PUBLISHED_STATUS ? `ผู้เรียนเห็น ${visibleCount} ส่วนนี้` : `เมื่อเผยแพร่ ผู้เรียนจะเห็น ${visibleCount} ส่วนนี้`,
  ];
  if (hiddenCount > 0) parts.push(`อีก ${hiddenCount} ส่วนถูกซ่อนไว้ (ฉบับร่าง)`);
  if (status !== PUBLISHED_STATUS) parts.push('ตอนนี้ผู้เรียนยังไม่เห็น รวมถึงตอนทำข้อสอบ');
  return parts.join(' · ');
}
