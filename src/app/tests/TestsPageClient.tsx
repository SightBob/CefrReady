'use client';

import { ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import SectionCard, { type SectionData } from '@/components/SectionCard';
import TestsLoginPrompt from './TestsLoginPrompt';
import FullTestCard from '@/components/FullTestCard';

// FeedbackDiscoveryModal intentionally not rendered — feature disabled until
// the feedback survey launches.

interface TestsPageClientProps {
  sections: SectionData[];
  user: { name: string | null; email: string | null } | null;
}

export default function TestsPageClient({ sections, user }: TestsPageClientProps) {
  const isAuthenticated = Boolean(user);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4">
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Full Tests</h1>
        {isAuthenticated ? (
          <p className="text-slate-600 mt-2">
            Welcome back,{' '}
            <span className="font-semibold text-primary-600">
              {user!.name || user!.email}
            </span>
            ! Select a section to begin.
          </p>
        ) : (
          <p className="text-slate-600 mt-2">Complete tests with progress tracking and detailed results</p>
        )}
      </div>

      {!isAuthenticated && <TestsLoginPrompt />}

      <FullTestCard disabled={!isAuthenticated} />

      {sections.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-lg font-medium">No test sections available yet.</p>
          <p className="text-sm mt-1">Please check back later.</p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${!isAuthenticated ? 'opacity-60' : ''}`}>
          {sections.map((section) => (
            <div key={section.id} className="relative">
              <SectionCard section={section} disabled={!isAuthenticated} />
              {!isAuthenticated && (
                <div className="absolute inset-0 bg-slate-100/50 rounded-2xl flex items-center justify-center">
                  <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-slate-600">
                    <Lock className="w-5 h-5" />
                    <span className="font-medium">Login Required</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isAuthenticated && (
        <div className="mt-12 text-center">
          <p className="text-slate-600 mb-4">Want to try without logging in?</p>
          <Link href="/demo" className="btn-secondary inline-flex items-center gap-2">
            Try Demo Tests
          </Link>
        </div>
      )}
    </div>
  );
}
