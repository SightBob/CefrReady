import { ArrowLeft } from 'lucide-react';

export default function ArticleLoading() {
  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <header className="bg-white border-b border-stone-200/60 sticky top-0 z-10 backdrop-blur-md bg-white/80">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between animate-pulse">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-stone-200 mr-3"></div>
            <div className="h-4 w-24 bg-stone-200 rounded"></div>
          </div>
          <div className="h-6 w-16 bg-stone-200 rounded-full"></div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-12 pb-24 animate-pulse">
        {/* Article Header */}
        <div className="mb-14 relative">
          <div className="absolute -left-6 top-0 w-1 h-16 bg-stone-300 rounded-r-full hidden md:block"></div>
          
          <div className="h-4 w-20 bg-indigo-100 rounded mb-6"></div>
          
          <div className="h-12 w-3/4 bg-stone-300 rounded mb-4"></div>
          <div className="h-12 w-1/2 bg-stone-300 rounded mb-6"></div>
          
          <div className="flex gap-2 mt-8 py-4 border-y border-stone-200/60">
            <div className="h-6 w-16 bg-stone-200 rounded-md"></div>
            <div className="h-6 w-20 bg-stone-200 rounded-md"></div>
            <div className="h-6 w-14 bg-stone-200 rounded-md"></div>
          </div>
        </div>

        {/* Content Body */}
        <article className="space-y-6">
          <div className="h-4 w-full bg-stone-200 rounded"></div>
          <div className="h-4 w-full bg-stone-200 rounded"></div>
          <div className="h-4 w-5/6 bg-stone-200 rounded"></div>
          
          <div className="h-32 w-full bg-stone-100 rounded-r-2xl border-l-4 border-stone-300 my-8"></div>
          
          <div className="h-8 w-1/3 bg-stone-300 rounded mt-12 mb-6"></div>
          <div className="h-4 w-full bg-stone-200 rounded"></div>
          <div className="h-4 w-4/5 bg-stone-200 rounded"></div>
          <div className="h-4 w-full bg-stone-200 rounded"></div>
          <div className="h-4 w-3/4 bg-stone-200 rounded"></div>
        </article>
      </main>
    </div>
  );
}
