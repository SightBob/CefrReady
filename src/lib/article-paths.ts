/**
 * บทความใน DB อยู่สองโซน: section 'guide' เปิดที่ /guide/[slug]
 * ที่เหลือเปิดที่ /must-know/[slug] — ใช้ร่วมกันระหว่าง sitemap กับหน้าโซนบทความ
 */
export function articlePath(slug: string, section: string | null | undefined): string {
  return section === 'guide' ? `/guide/${slug}` : `/must-know/${slug}`;
}
