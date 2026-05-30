import { db } from '@/db';
import { articles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import type { Metadata } from 'next';

export const revalidate = 3600;

const BASE_URL = 'https://cefr-ready.site';

export const metadata: Metadata = {
  title: 'CEFR Guide — คู่มือเตรียมสอบตามมาตรฐาน CEFR | CEFR Ready',
  description: 'คู่มือเตรียมสอบภาษาอังกฤษตามมาตรฐาน CEFR ทุกระดับ A1-C2 เทคนิค วิธีฝึก และเปรียบเทียบกับ IELTS TOEFL',
  keywords: ['CEFR Guide', 'คู่มือ CEFR', 'เตรียมสอบ CEFR', 'CEFR A1-C2', 'ฝึกภาษาอังกฤษ', 'เทียบ CEFR IELTS'],
  alternates: { canonical: `${BASE_URL}/guide` },
  openGraph: {
    title: 'CEFR Guide — คู่มือเตรียมสอบ | CEFR Ready',
    description: 'คู่มือเตรียมสอบภาษาอังกฤษตามมาตรฐาน CEFR ทุกระดับ',
    url: `${BASE_URL}/guide`,
    type: 'website',
  },
};

export default async function GuidePage() {
  const guides = await db
    .select()
    .from(articles)
    .where(eq(articles.section, 'guide'))
    .orderBy(articles.createdAt);

  const publishedGuides = guides.filter(g => g.isPublished);

  return (
    <div className="min-h-[100dvh] bg-[#fafaf9] selection:bg-yellow-200 selection:text-stone-900">
      <header className="bg-white border-b border-stone-200/60 sticky top-0 z-10 backdrop-blur-md bg-white/80">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="group flex items-center text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors">
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center mr-3 group-hover:bg-stone-200 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </div>
            Back
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-900 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-sm">
            <BookOpen className="w-3.5 h-3.5" />
            CEFR Guide
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-12 pb-24">
        <div className="mb-14">
          <h1 className="text-4xl md:text-5xl font-bold font-serif text-stone-900 leading-tight tracking-tighter mb-4">
            CEFR Guide
          </h1>
          <p className="text-lg text-stone-500 leading-relaxed">
            คู่มือเตรียมสอบภาษาอังกฤษตามมาตรฐาน CEFR ทุกระดับ A1-C2
          </p>
        </div>

        {publishedGuides.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p>ยังไม่มีคู่มือในขณะนี้</p>
          </div>
        ) : (
          <div className="space-y-6">
            {publishedGuides.map((guide) => (
              <Link
                key={guide.id}
                href={`/guide/${guide.slug}`}
                className="block group bg-white rounded-xl border border-stone-200/60 p-6 hover:border-stone-300 hover:shadow-sm transition-all"
              >
                {guide.category && (
                  <span className="inline-block text-indigo-600 text-sm font-bold tracking-widest uppercase mb-2">
                    {guide.category}
                  </span>
                )}
                <h2 className="text-xl font-semibold text-stone-900 group-hover:text-indigo-600 transition-colors mb-2">
                  {guide.title}
                </h2>
                <p className="text-stone-500 text-sm line-clamp-2">
                  {guide.content?.slice(0, 150)?.replace(/#+\s/g, '').replace(/[\*_`>\[\]]/g, '').trim() || ''}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}