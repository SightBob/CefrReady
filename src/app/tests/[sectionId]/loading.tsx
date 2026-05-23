import { SkeletonCard } from '@/components/SkeletonCard';

export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button skeleton */}
      <div className="mb-6">
        <div className="h-5 bg-slate-100 rounded w-32 animate-pulse" />
      </div>

      {/* Header skeleton */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-slate-200 rounded-2xl animate-pulse" />
        <div className="flex-1">
          <div className="h-8 bg-slate-200 rounded-lg w-48 mb-2 animate-pulse" />
          <div className="h-4 bg-slate-100 rounded w-64 animate-pulse" />
        </div>
      </div>

      {/* Stats text skeleton */}
      <div className="mb-4">
        <div className="h-5 bg-slate-100 rounded w-40 animate-pulse" />
      </div>

      {/* Test sets list skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
    </div>
  );
}
