import TestPreview from '@/components/TestPreview';
import ProgressStats from '@/components/ProgressStats';
import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const previewTests: Array<{ type: 'focus-form' | 'focus-meaning' | 'form-meaning' | 'listening'; title: string; description: string }> = [
    {
      type: 'focus-form',
      title: 'Focus on Form',
      description: 'Test your knowledge of grammatical structures, verb forms, and sentence patterns.',
    },
    {
      type: 'focus-meaning',
      title: 'Focus on Meaning',
      description: 'Understand vocabulary meanings, synonyms, and contextual usage.',
    },
    {
      type: 'form-meaning',
      title: 'Form & Meaning',
      description: 'Combined assessment of both grammatical accuracy and semantic understanding.',
    },
    {
      type: 'listening',
      title: 'Listening Comprehension',
      description: 'Comprehend spoken English through audio passages and conversations.',
    },
  ];

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
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/demo" className="btn-primary inline-flex items-center gap-2">
            Try Demo Tests
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/progress" className="btn-secondary">
            View Progress
          </Link>
        </div>
      </section>

      {/* Progress Stats */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Your Progress</h2>
        <ProgressStats />
      </section>

      {/* Demo Preview Section - All 4 Test Types */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">🎯 Try a Demo</h2>
          <Link href="/demo" className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
            View All Demos
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {previewTests.map((test, index) => (
            <TestPreview key={index} {...test} />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl p-8 text-center text-white">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready for the Full Experience?</h2>
        <p className="text-white/90 mb-6 max-w-2xl mx-auto">
          Access complete tests with 20-30 questions each, save your progress, and track your improvement over time.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/tests" className="bg-white text-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors inline-flex items-center justify-center gap-2">
            Access Full Tests
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/must-know" className="bg-white/20 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/30 transition-colors inline-flex items-center justify-center gap-2">
            Learn More
          </Link>
        </div>
      </section>
    </div>
  );
}
