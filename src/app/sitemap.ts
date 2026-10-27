import { MetadataRoute } from 'next';

export const revalidate = 3600; // re-generate every hour (ISR)

const BASE_URL = 'https://cefr-ready.site';

// Fixed build timestamp for static pages — avoids unnecessary recrawls
const BUILD_DATE = new Date('2026-05-24');

// หน้าที่ไม่ใส่ sitemap: /admin, /api, /maintenance (noindex), /review (noindex),
// หน้าสอบ (/tests/.../[setId], /tests/full/exam — noindex), /support (noindex), /demo/intro
const STATIC_PAGES: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
  { path: '', priority: 1, changeFrequency: 'daily' },
  { path: '/tests', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/tests/full', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/cefr', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/cefr-levels', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/cefr-vs-ielts', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/progress', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/demo', priority: 0.8, changeFrequency: 'monthly' },
  // Test section pages
  { path: '/tests/focus-form', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/tests/focus-meaning', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/tests/form-meaning', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/tests/listening', priority: 0.8, changeFrequency: 'weekly' },
  // Demo pages
  { path: '/demo/focus-form', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/demo/focus-meaning', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/demo/form-meaning', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/demo/listening', priority: 0.7, changeFrequency: 'monthly' },
  // หน้าข้อมูล/นโยบาย
  { path: '/packages', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'monthly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'monthly' },
  { path: '/refund', priority: 0.3, changeFrequency: 'monthly' },
];

// บทความใน DB ไม่มีหน้าของตัวเองแล้ว (ลบ /guide ออก) จึงมีแต่หน้า static ใน sitemap
export default function sitemap(): MetadataRoute.Sitemap {
  return STATIC_PAGES.map((page) => ({
    url: `${BASE_URL}${page.path}`,
    lastModified: BUILD_DATE,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
