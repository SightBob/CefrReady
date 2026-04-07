import DemoTestsSection from '@/components/DemoTestsSection';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DemoTestsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4">
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Demo Tests</h1>
        <p className="text-slate-600 mt-2">Try our sample tests - no login required!</p>
      </div>

      <DemoTestsSection />
    </div>
  );
}
