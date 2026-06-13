import { db } from '@/db';
import { articles, vocabularies } from '@/db/schema';
import { eq, desc, count } from 'drizzle-orm';
import MustKnowClient, { type DbArticle } from '@/components/MustKnowClient';
import type { Metadata } from 'next';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Must Know — ไวยากรณ์และคำศัพท์ภาษาอังกฤษสำหรับสอบ CEFR',
  description: 'รวมบทความสรุปไวยากรณ์และคำศัพท์ภาษาอังกฤษ ครอบคลุม A1–C2 อ่านฟรี',
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
  const [articleRows, vocabCountResult] = await Promise.all([
    db
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
      .orderBy(desc(articles.createdAt)),
    db
      .select({ count: count() })
      .from(vocabularies)
      .where(eq(vocabularies.isPublished, true)),
  ]);

  const dbArticles: DbArticle[] = articleRows.map((a) => ({
    ...a,
    tags: Array.isArray(a.tags) ? (a.tags as string[]) : [],
  }));

  return <MustKnowClient dbArticles={dbArticles} totalVocabularies={vocabCountResult[0].count} />;
}
