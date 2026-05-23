import { SkeletonCard } from '@/components/SkeletonCard';

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page title skeleton */}
      <div className="mb-8">
        <div className="h-10 bg-slate-200 rounded-xl w-64 mb-3 animate-pulse" />
        <div className="h-4 bg-slate-100 rounded w-96 animate-pulse" />
      </div>

      {/* Section cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    </div>
  );
}
