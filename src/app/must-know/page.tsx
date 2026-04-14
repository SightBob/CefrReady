import { db } from '@/db';
import { articles } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import MustKnowClient, { DbArticle } from '@/components/MustKnowClient';

export const dynamic = 'force-dynamic';

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
