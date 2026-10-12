import { MetadataRoute } from 'next';
import { articlePath } from '@/lib/article-paths';

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
  { path: '/guide', priority: 0.8, changeFrequency: 'weekly' },
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: `${BASE_URL}${page.path}`,
    lastModified: BUILD_DATE,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  // ─── Dynamic: articles — มีโซนเดียวคือ section 'guide' ที่ URL /guide/[slug] ──
  let articlePages: MetadataRoute.Sitemap = [];
  try {
    // Lazy import so DB errors don't break the whole sitemap
    const { db } = await import('@/db');
    const { articles } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');

    const allArticles = await db
      .select({ slug: articles.slug, section: articles.section, updatedAt: articles.updatedAt })
      .from(articles)
      .where(eq(articles.isPublished, true));

    // slug เป็น nullable และ articlePath คืน null ถ้าไม่มีหน้ารองรับ section นั้น
    articlePages = allArticles.flatMap((a) => {
      const path = a.slug ? articlePath(a.slug, a.section) : null;
      return path
        ? [{
            url: `${BASE_URL}${path}`,
            lastModified: a.updatedAt ?? new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
          }]
        : [];
    });
  } catch (err) {
    // Non-fatal: sitemap still works without dynamic content
    console.warn('[sitemap] Failed to fetch articles:', err);
  }

  return [...staticPages, ...articlePages];
}
