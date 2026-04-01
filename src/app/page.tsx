import TestCard from '@/components/TestCard';
import ProgressStats from '@/components/ProgressStats';
import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const tests = [
    {
      type: 'focus-form' as const,
      title: 'Focus on Form',
      description: 'Test your knowledge of grammatical structures, verb forms, and sentence patterns.',
      duration: '15 min',
      questions: 20,
      href: '/tests/focus-form',
    },
    {
      type: 'focus-meaning' as const,
      title: 'Focus on Meaning',
      description: 'Understand vocabulary meanings, synonyms, and contextual usage.',
      duration: '20 min',
      questions: 25,
      href: '/tests/focus-meaning',
    },
    {
      type: 'form-meaning' as const,
      title: 'Form & Meaning',
      description: 'Combined assessment of both grammatical accuracy and semantic understanding.',
      duration: '25 min',
      questions: 30,
      href: '/tests/form-meaning',
    },
    {
      type: 'listening' as const,
      title: 'Listening',
      description: 'Comprehend spoken English through audio passages and conversations.',
      duration: '30 min',
      questions: 20,
      href: '/tests/listening',
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
          <Link href="/tests" className="btn-primary inline-flex items-center gap-2">
            Start Testing
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

      {/* Test Types */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Test Categories</h2>
          <Link href="/tests" className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tests.map((test, index) => (
            <TestCard key={index} {...test} />
          ))}
        </div>
      </section>
    </div>
  );
}
