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
  title: 'CEFR คืออะไร? — คู่มทำความเข้าใจ CEFR A1-C2 | CEFR Ready',
  description: 'เรียนรู้จัก 6 ระดับ CEFR (A1, A2, B1, B2, C1, C2) คะแนนที่ต้องได้ วิธีฝึก และเทียบกับ IELTS TOEFL ดูคู่มิภาษาอังกฤษ',
  keywords: ['CEFR คืออะไร', 'CEFR levels', 'ระดับ CEFR', 'CEFR A1 A2 B1 B2 C1 C2', 'ฝึกทดสอบ CEFR', 'เทียบ CEFR IELTS', 'มาตรฐาน CEFR', 'Common European Framework'],
  alternates: { canonical: `${BASE_URL}/cefr` },
  openGraph: {
    title: 'CEFR คืออะไร? — คู่มทำความเข้าใจ | CEFR Ready',
    description: 'เรียนรู้จัก 6 ระดับ CEFR คะแนนที่ต้องได้ และวิธีฝึกภาษาอังกฤษตามมาตรฐาน CEFR',
    url: `${BASE_URL}/cefr`,
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CEFR คืออะไร? | CEFR Ready',
    description: 'เรียนรู้จัก 6 ระดับ CEFR คะแนนที่ต้องได้ และวิธีฝึกภาษาอังกฤษตามมาตรฐาน CEFR',
  },
};

export default async function CefrPage() {
  const rows = await db
    .select()
    .from(articles)
    .where(eq(articles.slug, 'what-is-cefr'))
    .limit(1);

  const article = rows[0];
  if (!article || !article.isPublished) notFound();

  const tags = Array.isArray(article.tags) ? (article.tags as string[]) : [];
  const plainDesc = (article.content || '').slice(0, 200).replace(/#+\s/g, '').replace(/[\*_`>\[\]]/g, '').trim();

  return (
    <div className="min-h-[100dvh] bg-[#fafaf9] selection:bg-yellow-200 selection:text-stone-900">
      <JsonLd data={articleSchema({
        title: article.title,
        description: plainDesc,
        url: `${BASE_URL}/cefr`,
        datePublished: article.createdAt.toISOString(),
        dateModified: article.updatedAt.toISOString(),
        tags,
      })} />
      <JsonLd data={breadcrumbSchema([
        { name: 'หน้าหลัก', url: BASE_URL },
        { name: 'CEFR', url: `${BASE_URL}/cefr` },
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
