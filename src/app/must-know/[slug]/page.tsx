import { db } from '@/db';
import { articles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { MarkdownContent } from '@/components/MarkdownContent';
import Link from 'next/link';
import { ArrowLeft, Tag, BarChart } from 'lucide-react';

interface ArticlePageProps {
  params: {
    slug: string;
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

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href="/must-know"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            กลับไปหน้า Must Know
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">{article.title}</h1>
          
          <div className="flex flex-wrap items-center gap-4 mt-4">
            {article.category && (
              <span className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-full">
                {article.category}
              </span>
            )}
            {article.cefrLevel && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full">
                <BarChart className="w-4 h-4" />
                CEFR: {article.cefrLevel}
              </span>
            )}
            {tags.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">|</span>
                <Tag className="w-4 h-4 text-gray-400" />
                <div className="flex gap-2">
                  {tags.map((t) => (
                    <span key={t} className="text-sm text-gray-500 hover:text-gray-900">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <MarkdownContent content={article.content || ''} />
        </div>
      </main>
    </div>
  );
}
