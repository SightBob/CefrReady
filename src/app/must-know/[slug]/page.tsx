import { db } from '@/db';
import { articles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { MarkdownContent } from '@/components/MarkdownContent';
import Link from 'next/link';
import { ArrowLeft, Tag, BarChart } from 'lucide-react';
import type { Metadata } from 'next';
import JsonLd, { articleSchema, breadcrumbSchema } from '@/components/JsonLd';

export const revalidate = 3600;

interface ArticlePageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = params;

  const [article] = await db
    .select()
    .from(articles)
    .where(eq(articles.slug, slug))
    .limit(1);

  if (!article || !article.isPublished) {
    return { title: 'Article Not Found' };
  }

  const plainDesc = (article.content || '')
    .slice(0, 200)
    .replace(/#+\s/g, '')
    .replace(/[\*_`>\[\]]/g, '')
    .trim();
  const description = plainDesc ? plainDesc + '...' : 'อ่านบทความและทบทวนไวยากรณ์ก่อนสอบ CEFR';

  return {
    title: `${article.title}`,
    description,
    openGraph: {
      title: article.title,
      description,
      type: 'article',
      tags: Array.isArray(article.tags) ? (article.tags as string[]) : [],
      publishedTime: article.createdAt.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description,
    },
    alternates: {
      canonical: `https://cefr-ready.site/must-know/${slug}`,
    },
  };
}

export default async function MustKnowArticlePage({ params }: ArticlePageProps) {
  const { slug } = params;

  const [article] = await db
    .select()
    .from(articles)
    .where(eq(articles.slug, slug))
    .limit(1);

  if (!article || !article.isPublished) {
    notFound();
  }

  const tags = Array.isArray(article.tags) ? (article.tags as string[]) : [];

  const BASE_URL = 'https://cefr-ready.site';
  const plainDesc = (article.content || '')
    .slice(0, 200)
    .replace(/#+\s/g, '')
    .replace(/[\*_`>\[\]]/g, '')
    .trim();
  const description = plainDesc ? plainDesc + '...' : 'บทความไวยากรณ์ภาษาอังกฤษสำหรับเตรียมสอบ CEFR';

  return (
    <div className="min-h-[100dvh] bg-[#fafaf9] selection:bg-yellow-200 selection:text-stone-900">
      <JsonLd data={articleSchema({
        title: article.title,
        description,
        url: `${BASE_URL}/must-know/${slug}`,
        datePublished: article.createdAt.toISOString(),
        dateModified: article.updatedAt.toISOString(),
        tags: Array.isArray(article.tags) ? (article.tags as string[]) : [],
      })} />
      <JsonLd data={breadcrumbSchema([
        { name: 'หน้าหลัก', url: BASE_URL },
        { name: 'Must Know', url: `${BASE_URL}/must-know` },
        { name: article.title, url: `${BASE_URL}/must-know/${slug}` },
      ])} />

      {/* Nav */}
      <nav className="bg-white border-b border-stone-200/60 sticky top-0 z-10 backdrop-blur-md bg-white/80">
        <div className="max-w-[720px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/must-know"
            className="flex items-center gap-2 text-[13px] font-medium text-stone-400 hover:text-stone-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Library
          </Link>
          {article.cefrLevel && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded bg-indigo-50 text-indigo-700">
              <BarChart className="w-3.5 h-3.5" />
              {article.cefrLevel}
            </span>
          )}
        </div>
      </nav>

      {/* Article */}
      <main className="max-w-[720px] mx-auto px-6 pt-12 pb-20">
        <div className="mb-10">
          {article.category && (
            <p className="text-[11px] font-medium tracking-[2px] uppercase text-indigo-500 mb-3.5">
              {article.category}
            </p>
          )}
          <h1 className="text-[38px] font-extrabold tracking-tight text-stone-900 leading-[1.15] mb-5">
            {article.title}
          </h1>
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-[7px] py-4 border-t border-b border-stone-200/60">
              <Tag className="w-4 h-4 text-stone-400 mr-0.5" />
              {tags.map(t => (
                <span key={t} className="text-[11px] px-2.5 py-1 bg-stone-100 text-stone-500 rounded">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <MarkdownContent content={article.content || ''} />
      </main>
    </div>
  );
}
