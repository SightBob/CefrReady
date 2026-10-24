/**
 * ตัวกรองรายการคำถามของผู้เรียนในหน้า admin
 *
 * โมดูลนี้ "ไม่มี dependency ฝั่ง server" (ไม่แตะฐานข้อมูล) → ใช้ฝั่ง client ได้
 * และเทสได้โดยไม่ต้องต่อ DB
 */

/** จำนวนแถวต่อหน้าในหน้า admin */
export const ADMIN_MESSAGE_PAGE_SIZE = 25;

/** ช่วงเวลาสูงสุดที่ดูได้ (วัน) */
export const ADMIN_MESSAGE_MAX_DAYS = 365;

export type AiTutorMessageRoleFilter = 'user' | 'assistant' | 'all';
export type AiTutorMessageStatusFilter = 'ok' | 'failed' | 'pending' | 'all';

export type AiTutorMessageFilters = {
  /** ช่วงเวลา (วัน) — นับย้อนหลังจากตอนนี้ */
  days: number;
  role: AiTutorMessageRoleFilter;
  status: AiTutorMessageStatusFilter;
  questionId: number | null;
  /** ค้นหาข้อความ (substring) */
  search: string | null;
  /** รวมแถวที่ถูกเก็บถัง (รอบที่จบแล้ว) ด้วยไหม */
  includeArchived: boolean;
  page: number;
  pageSize: number;
};

/**
 * อ่านตัวกรองจาก query string — ค่าผิดทุกตัว fallback ไปที่ค่าเริ่มต้น (ไม่ error)
 * ค่าเริ่มต้ม: 30 วัน · เฉพาะคำถามของผู้เรียน · ทุกสถานะ · รวมแถวที่เก็บถัง
 */
export function parseAiTutorMessageFilters(params: URLSearchParams): AiTutorMessageFilters {
  const daysRaw = Number.parseInt(params.get('days') ?? '30', 10);
  const days = Number.isFinite(daysRaw) && daysRaw > 0
    ? Math.min(daysRaw, ADMIN_MESSAGE_MAX_DAYS)
    : 30;

  const roleRaw = params.get('role');
  const role: AiTutorMessageRoleFilter =
    roleRaw === 'assistant' || roleRaw === 'all' ? roleRaw : 'user';

  const statusRaw = params.get('status');
  const status: AiTutorMessageStatusFilter =
    statusRaw === 'ok' || statusRaw === 'failed' || statusRaw === 'pending' || statusRaw === 'all'
      ? statusRaw
      : 'all';

  const questionIdRaw = Number.parseInt(params.get('questionId') ?? '', 10);
  const questionId = Number.isFinite(questionIdRaw) && questionIdRaw > 0 ? questionIdRaw : null;

  // ตัด % และ _ ออก (ถ้าไม่ตัดจะกลายเป็น wildcard ของ SQL เงียบ ๆ)
  const searchRaw = params.get('q')?.trim().replace(/[%_]/g, '').slice(0, 100);
  const search = searchRaw ? searchRaw : null;

  const pageRaw = Number.parseInt(params.get('page') ?? '1', 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.min(pageRaw, 500) : 1;

  return {
    days,
    role,
    status,
    questionId,
    search,
    includeArchived: params.get('includeArchived') !== '0',
    page,
    pageSize: ADMIN_MESSAGE_PAGE_SIZE,
  };
}
