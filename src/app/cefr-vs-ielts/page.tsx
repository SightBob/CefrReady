import { db } from '@/db';
import { articles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { MarkdownContent } from '@/components/MarkdownContent';
import Link from 'next/link';
import { ArrowLeft, BarChart } from 'lucide-react';
import JsonLd, { articleSchema, breadcrumbSchema } from '@/components/JsonLd';
import type { Metadata } from 'next';

export const revalidate = 3600;

const BASE_URL = 'https://cefr-ready.site';

export const metadata: Metadata = {
  title: 'เทียบ CEFR กับ IELTS TOEFL — ตารางเปรียบคะแนนอัปรัย | CEFR Ready',
  description: 'ตารางเปรียบคะแนน CEFR กับ IELTS TOEFL ดูว่าคะแนนระดับใดแต่ละอันอย่างไร เลือกสอบอะไรดี และเตรียมตัวอย่าง',
  keywords: ['CEFR vs IELTS', 'CEFR vs TOEFL', 'ตารางเปรียบ CEFR IELTS', 'คะแนน CEFR IELTS', 'CEFR B2 เท่ากับ IELTS กี่', 'IELTS 6.5 เท่ากับ CEFR', 'เทียบมาตรฐานภาษา'],
  alternates: { canonical: `${BASE_URL}/cefr-vs-ielts` },
  openGraph: {
    title: 'เทียบ CEFR กับ IELTS TOEFL | CEFR Ready',
    description: 'ตารางเปรียบคะแนน CEFR กับ IELTS TOEFL อัปรัยดูว่าคะแนนระดบใดต่างกันอย่างไร',
    url: `${BASE_URL}/cefr-vs-ielts`,
    type: 'article',
  },
};

export default async function CefrVsIeltsPage() {
  const rows = await db
    .select()
    .from(articles)
    .where(eq(articles.slug, 'cefr-vs-ielts-toefl'))
    .limit(1);

  const article = rows[0];
  if (!article || !article.isPublished) notFound();

  const tags = Array.isArray(article.tags) ? (article.tags as string[]) : [];

  return (
    <div className="min-h-[100dvh] bg-[#fafaf9] selection:bg-yellow-200 selection:text-stone-900">
      <JsonLd data={articleSchema({
        title: article.title,
        description: article.content?.slice(0, 200)?.replace(/#+\s/g, '').replace(/[\*_`>\[\]]/g, '').trim() || '',
        url: `${BASE_URL}/cefr-vs-ielts`,
        datePublished: article.createdAt.toISOString(),
        dateModified: article.updatedAt.toISOString(),
        tags,
      })} />
      <JsonLd data={breadcrumbSchema([
        { name: 'หน้าหลัก', url: BASE_URL },
        { name: 'CEFR', url: `${BASE_URL}/cefr` },
        { name: 'CEFR vs IELTS', url: `${BASE_URL}/cefr-vs-ielts` },
      ])} />
      <header className="bg-white border-b border-stone-200/60 sticky top-0 z-10 backdrop-blur-md bg-white/80">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/must-know" className="group flex items-center text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors">
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center mr-3 group-hover:bg-stone-200 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </div>
            Back
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-900 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-sm">
            <BarChart className="w-3.5 h-3.5" />
            CEFR Guide
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-12 pb-24">
        <div className="mb-14 relative">
          <div className="absolute -left-6 top-0 w-1 h-16 bg-stone-800 rounded-r-full hidden md:block" />
          {article.category && (
            <span className="inline-block text-indigo-600 text-sm font-bold tracking-widest uppercase mb-4">{article.category}</span>
          )}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-serif text-stone-900 leading-tight tracking-tighter mb-6">
            {article.title}
          </h1>
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-8 py-4 border-y border-stone-200/60">
              {tags.map((t) => (
                <span key={t} className="px-3 py-1 bg-stone-100 text-stone-600 text-xs font-medium rounded-md">{t}</span>
              ))}
            </div>
          )}
        </div>
        <article className="prose-container relative">
          <MarkdownContent content={article.content || ''} />
        </article>
      </main>
    </div>
  );
}
