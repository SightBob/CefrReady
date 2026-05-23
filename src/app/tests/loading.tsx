import { SkeletonCard } from '@/components/SkeletonCard';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page title with loading indicator */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Full Tests</h1>
          <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
        </div>
        <p className="text-slate-600">Loading test sections...</p>
      </div>

      {/* Section cards grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    </div>
  );
}
