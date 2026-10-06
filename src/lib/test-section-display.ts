import { getCachedSections } from '@/lib/sections';

/** พาร์ทที่มีสิทธิ์โชว์ป้ายเหลืองบนหน้า maintenance */
export const SECTION_BADGES = ['focus-form', 'focus-meaning', 'form-meaning', 'listening'];

/** หา section จาก id — คืน null ถ้าไม่รู้จัก (ใช้แสดงชื่อพาร์ทบนหน้า maintenance) */
export async function getSection(sectionId: string) {
  try {
    const sections = await getCachedSections();
    return sections.find((section) => section.id === sectionId) ?? null;
  } catch (err) {
    console.error('[test-section-display] Failed to fetch sections:', err);
    return null;
  }
}
