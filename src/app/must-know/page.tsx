import { db } from '@/db';
import { articles } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import MustKnowClient, { DbArticle } from '@/components/MustKnowClient';
import type { Metadata } from 'next';

export const revalidate = 3600; // ISR caching

export const metadata: Metadata = {
  title: 'Must Know — หลักไวยากรณ์ภาษาอังกฤษที่ต้องรู้ก่อนสอบ CEFR',
  description: 'รวมบทความสรุปไวยากรณ์ภาษาอังกฤษที่สำคัญสำหรับการสอบ CEFR ครอบคลุม Tense, Articles, Prepositions, Modals, Vocabulary และเนื้อหาระดับ A1-C2 อ่านฟรี ไม่ต้องสมัครสมาชิก',
  keywords: ['ไวยากรณ์ภาษาอังกฤษ', 'สรุปไวยากรณ์ CEFR', 'English grammar CEFR', 'must know CEFR', 'หลักภาษาอังกฤษ', 'เตรียมสอบ CEFR'],
  alternates: {
    canonical: 'https://cefr-ready.vercel.app/must-know',
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
