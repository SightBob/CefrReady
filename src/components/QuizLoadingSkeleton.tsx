export default function QuizLoadingSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-white">
      {/* Header shell — mirrors TestLayout header */}
      <div className="bg-white border-b border-slate-200 pt-1">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 md:py-0 md:h-[6.6875rem] h-[90px]">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-200 animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 w-40 sm:w-56 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-24 sm:w-32 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-5 w-20 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Body shell — pill + panel + card */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mt-[30px] pb-44 animate-pulse">
        <div className="w-72 h-9 bg-[#F9F9F9] rounded-full" />

        <div className="flex gap-6 mt-[1.1875rem] items-start">
          <div className="hidden md:block w-72 shrink-0 rounded-2xl border border-slate-100 bg-slate-50 p-[1.1875rem] space-y-3">
            <div className="h-8 bg-slate-200 rounded-xl" />
            <div className="h-20 bg-slate-200 rounded-xl" />
            <div className="h-20 bg-slate-200 rounded-xl" />
            <div className="h-20 bg-slate-100 rounded-xl" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8" style={{ minHeight: '500px' }}>
              <div className="h-5 w-3/4 bg-slate-200 rounded mb-4" />
              <div className="bg-slate-50 rounded-xl p-[1.6875rem] space-y-4 mb-6">
                <div className="h-4 w-2/3 bg-slate-100 rounded" />
                <div className="h-4 w-1/2 bg-slate-100 rounded" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-14 bg-slate-100 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
