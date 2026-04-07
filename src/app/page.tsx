import DemoTestsSection from '@/components/DemoTestsSection';
import ProgressStats from '@/components/ProgressStats';
import { Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <section className="text-center py-12 md:py-20">
        <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          CEFR Aligned English Tests
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
          Master Your English
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent"> Proficiency</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-8">
          Comprehensive tests covering grammar, vocabulary, and listening skills aligned with CEFR standards.
        </p>
      </section>

      {/* Progress Stats */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Your Progress</h2>
        <ProgressStats />
      </section>

      {/* Demo Tests Section - Embedded from /demo page */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">🎯 Try a Demo</h2>
          <span className="text-sm text-slate-500 flex items-center gap-1">
            No login required
          </span>
        </div>
        <DemoTestsSection showInfoBanner={false} />
      </section>
    </div>
  );
}
