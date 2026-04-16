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
      publishedTime: (article as any).createdAt?.toISOString?.(),
      modifiedTime: (article as any).updatedAt?.toISOString?.(),
    },
    alternates: {
      canonical: `https://cefr-ready.vercel.app/must-know/${slug}`,
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

  const BASE_URL = 'https://cefr-ready.vercel.app';
  const plainDesc = (article.content || '')
    .slice(0, 200)
    .replace(/#+\s/g, '')
    .replace(/[\*_`>\[\]]/g, '')
    .trim();
  const description = plainDesc ? plainDesc + '...' : 'บทความไวยากรณ์ภาษาอังกฤษสำหรับเตรียมสอบ CEFR';

  return (
    <div className="min-h-screen bg-[#fafaf9] selection:bg-yellow-200 selection:text-stone-900">
      <JsonLd data={articleSchema({
        title: article.title,
        description,
        url: `${BASE_URL}/must-know/${slug}`,
        datePublished: (article as any).createdAt?.toISOString?.(),
        dateModified: (article as any).updatedAt?.toISOString?.(),
        tags: Array.isArray(article.tags) ? (article.tags as string[]) : [],
      })} />
      <JsonLd data={breadcrumbSchema([
        { name: 'หน้าหลัก', url: BASE_URL },
        { name: 'Must Know', url: `${BASE_URL}/must-know` },
        { name: article.title, url: `${BASE_URL}/must-know/${slug}` },
      ])} />
      <header className="bg-white border-b border-stone-200/60 sticky top-0 z-10 backdrop-blur-md bg-white/80">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link
            href="/must-know"
            className="group flex items-center text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center mr-3 group-hover:bg-stone-200 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </div>
            Back to Library
          </Link>
          <div className="flex items-center gap-3">
             {article.cefrLevel && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-900 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-sm">
                <BarChart className="w-3.5 h-3.5" />
                {article.cefrLevel}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-12 pb-24">
        {/* Article Header */}
        <div className="mb-14 relative">
          <div className="absolute -left-6 top-0 w-1 h-16 bg-stone-800 rounded-r-full hidden md:block"></div>
          {article.category && (
              <span className="inline-block text-indigo-600 text-sm font-bold tracking-widest uppercase mb-4">
                {article.category}
              </span>
          )}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-serif text-stone-900 leading-tight tracking-tighter mb-6">
            {article.title}
          </h1>
          
          {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-8 py-4 border-y border-stone-200/60">
                <Tag className="w-4 h-4 text-stone-400 mr-1" />
                {tags.map((t) => (
                  <span key={t} className="px-3 py-1 bg-stone-100 text-stone-600 text-xs font-medium rounded-md hover:bg-stone-200 transition-colors cursor-default">
                    {t}
                  </span>
                ))}
              </div>
          )}
        </div>

        {/* Content Body */}
        <article className="prose-container relative">
          <MarkdownContent content={article.content || ''} />
        </article>
      </main>
    </div>
  );
}
