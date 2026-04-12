export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse">
      <div className="h-5 bg-slate-200 rounded-lg w-2/3 mb-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-slate-100 rounded mb-2"
          style={{ width: i === lines - 1 ? '50%' : '100%' }}
        />
      ))}
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-4 bg-slate-200 rounded-lg w-24 mb-3" />
          <div className="h-8 bg-slate-200 rounded-lg w-16" />
        </div>
        <div className="w-12 h-12 bg-slate-200 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonProgressCard() {
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-slate-200 rounded-xl" />
        <div className="flex-1">
          <div className="h-4 bg-slate-200 rounded w-32 mb-2" />
          <div className="h-3 bg-slate-100 rounded w-20" />
        </div>
      </div>
      <div className="h-10 bg-slate-100 rounded-lg w-36 mb-4" />
      <div className="h-2 bg-slate-100 rounded-full w-full" />
    </div>
  );
}

export function SkeletonQuestionCard() {
  return (
    <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm animate-pulse">
      <div className="h-6 bg-slate-200 rounded-lg w-3/4 mb-4" />
      <div className="h-4 bg-slate-100 rounded w-full mb-2" />
      <div className="h-4 bg-slate-100 rounded w-5/6 mb-8" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-xl w-full" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonBanner() {
  return (
    <div className="bg-slate-200 rounded-2xl p-6 mb-8 animate-pulse">
      <div className="flex items-center gap-6">
        <div className="w-24 h-16 bg-slate-300 rounded-2xl" />
        <div>
          <div className="h-4 bg-slate-300 rounded w-32 mb-2" />
          <div className="h-6 bg-slate-300 rounded w-48 mb-2" />
          <div className="h-3 bg-slate-300 rounded w-40" />
        </div>
      </div>
    </div>
  );
}
