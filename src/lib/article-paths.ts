/**
 * URL ของบทความใน DB — มีโซนเดียวคือ section 'guide' ที่ /guide/[slug]
 *
 * คืน null เมื่อ section ไม่ใช่ 'guide' เพราะไม่มีหน้ารองรับ
 * (ผู้เรียกต้องข้ามบทความนั้น เช่น ตอนสร้าง sitemap)
 */
export function articlePath(slug: string, section: string | null | undefined): string | null {
  return section === 'guide' ? `/guide/${slug}` : null;
}
