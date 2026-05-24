import { db } from '@/db';
import { articles } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import MustKnowClient, { DbArticle } from '@/components/MustKnowClient';
import type { Metadata } from 'next';

export const revalidate = 3600; // ISR caching

export const metadata: Metadata = {
  title: 'Must Know — หลักไวยากรณ์ภาษาอังกฤษที่ต้องรู้ก่อนสอบ CEFR',
  description: 'รวมบทความสรุปไวยากรณ์ภาษาอังกฤษสำหรับสอบ CEFR — Tense, Articles, Prepositions และ Vocabulary ครอบคลุม A1-C2 อ่านฟรี',
  keywords: ['ไวยากรณ์ภาษาอังกฤษ', 'สรุปไวยากรณ์ CEFR', 'English grammar CEFR', 'must know CEFR', 'หลักภาษาอังกฤษ', 'เตรียมสอบ CEFR'],
  alternates: {
    canonical: 'https://cefr-ready.site/must-know',
  },
  openGraph: {
    title: 'Must Know — หลักไวยากรณ์ภาษาอังกฤษ | CEFR Ready',
    description: 'รวมบทความสรุปไวยากรณ์ภาษาอังกฤษที่สำคัญสำหรับการสอบ CEFR ครอบคลุม A1-C2 อ่านฟรี',
    url: 'https://cefr-ready.site/must-know',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'Must Know — หลักไวยากรณ์ภาษาอังกฤษ | CEFR Ready' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Must Know — หลักไวยากรณ์ภาษาอังกฤษ | CEFR Ready',
    description: 'รวมบทความสรุปไวยากรณ์ภาษาอังกฤษที่สำคัญสำหรับการสอบ CEFR ครอบคลุม A1-C2',
  },
};

export default async function MustKnowPage() {
  const data = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      category: articles.category,
      cefrLevel: articles.cefrLevel,
      tags: articles.tags,
      content: articles.content,
    })
    .from(articles)
    .where(eq(articles.isPublished, true))
    .orderBy(desc(articles.createdAt));

  // Cast tags safely since it comes back as unknown from raw db in some queries, or string[]
  const dbArticles: DbArticle[] = data.map((a) => ({
    ...a,
    tags: Array.isArray(a.tags) ? (a.tags as string[]) : [],
  }));

  return <MustKnowClient dbArticles={dbArticles} />;
}
