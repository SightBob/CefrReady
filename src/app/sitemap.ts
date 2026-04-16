import { MetadataRoute } from 'next'
import { db } from '@/db';
import { articles, testTypes } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://cefrready.com';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/tests`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/must-know`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/demo`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/demo/focus-form`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/demo/focus-meaning`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/demo/form-meaning`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/demo/listening`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  // Dynamic: test sections
  let sectionPages: MetadataRoute.Sitemap = [];
  try {
    const sections = await db.select({ id: testTypes.id }).from(testTypes);
    sectionPages = sections.map((s) => ({
      url: `${baseUrl}/tests/${s.id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch {
    // Non-fatal
  }

  // Dynamic: must-know articles
  let articlePages: MetadataRoute.Sitemap = [];
  try {
    const allArticles = await db
      .select({ slug: articles.slug, updatedAt: articles.updatedAt })
      .from(articles)
      .where(eq(articles.isPublished, true));
    articlePages = allArticles.map((a) => ({
      url: `${baseUrl}/must-know/${a.slug}`,
      lastModified: a.updatedAt ?? new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch {
    // Non-fatal
  }

  return [...staticPages, ...sectionPages, ...articlePages];
}
