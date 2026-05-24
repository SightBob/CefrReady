import { MetadataRoute } from 'next';

export const revalidate = 3600; // re-generate every hour (ISR)

const BASE_URL = 'https://cefr-ready.site';

// Fixed build timestamp for static pages — avoids unnecessary recrawls
const BUILD_DATE = new Date('2026-05-24');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ─── Static pages ─────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: BUILD_DATE,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/tests`,
      lastModified: BUILD_DATE,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/must-know`,
      lastModified: BUILD_DATE,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/progress`,
      lastModified: BUILD_DATE,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    // Test section pages
    {
      url: `${BASE_URL}/tests/focus-form`,
      lastModified: BUILD_DATE,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/tests/focus-meaning`,
      lastModified: BUILD_DATE,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/tests/form-meaning`,
      lastModified: BUILD_DATE,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/tests/listening`,
      lastModified: BUILD_DATE,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // Demo pages
    {
      url: `${BASE_URL}/demo`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/demo/focus-form`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/demo/focus-meaning`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/demo/form-meaning`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/demo/listening`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  // ─── Dynamic: must-know articles ──────────────────────────────────
  let articlePages: MetadataRoute.Sitemap = [];
  try {
    // Lazy import so DB errors don't break the whole sitemap
    const { db } = await import('@/db');
    const { articles } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');

    const allArticles = await db
      .select({ slug: articles.slug, updatedAt: articles.updatedAt })
      .from(articles)
      .where(eq(articles.isPublished, true));

    articlePages = allArticles.map((a) => ({
      url: `${BASE_URL}/must-know/${a.slug}`,
      lastModified: a.updatedAt ?? new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch (err) {
    // Non-fatal: sitemap still works without dynamic content
    console.warn('[sitemap] Failed to fetch articles:', err);
  }

  return [...staticPages, ...articlePages];
}
