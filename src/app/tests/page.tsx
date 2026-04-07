'use client';

import TestCard from '@/components/TestCard';
import { ArrowLeft, Lock, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function TestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const tests = [
    {
      type: 'focus-form' as const,
      title: 'Focus on Form',
      description: 'Test your knowledge of grammatical structures, verb forms, and sentence patterns. Focus on grammatical accuracy and structural correctness.',
      duration: '15 min',
      questions: 20,
      href: '/tests/focus-form',
    },
    {
      type: 'focus-meaning' as const,
      title: 'Focus on Meaning',
      description: 'Understand vocabulary meanings, synonyms, antonyms, and contextual usage. Focus on semantic understanding and word relationships.',
      duration: '20 min',
      questions: 25,
      href: '/tests/focus-meaning',
    },
    {
      type: 'form-meaning' as const,
      title: 'Form & Meaning',
      description: 'Combined assessment of both grammatical accuracy and semantic understanding. Tests your ability to use correct forms in meaningful contexts.',
      duration: '25 min',
      questions: 30,
      href: '/tests/form-meaning',
    },
    {
      type: 'listening' as const,
      title: 'Listening Comprehension',
      description: 'Comprehend spoken English through audio passages and conversations. Tests your ability to understand main ideas, details, and inferences.',
      duration: '30 min',
      questions: 20,
      href: '/tests/listening',
    },
  ];

  // Redirect to login if not authenticated (optional - can also show login prompt)
  useEffect(() => {
    if (status === 'unauthenticated') {
      // Optionally redirect or just show login prompt
      // router.push('/');
    }
  }, [status, router]);

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!session) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4">
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Full Tests</h1>
          <p className="text-slate-600 mt-2">Complete tests with progress tracking and detailed results</p>
        </div>

        {/* Login Prompt Banner */}
        <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Lock className="w-6 h-6" />
            <h2 className="text-xl font-bold">Login Required</h2>
          </div>
          <p className="text-white/90 mb-4">
            Please login to access full tests with 20-30 questions each, save your progress, and track your improvement over time.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-white text-primary-600 px-6 py-2 rounded-lg font-medium hover:bg-primary-50 transition-colors inline-flex items-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Login to Continue
          </button>
        </div>

        {/* Tests Grid - Disabled State */}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60 pointer-events-none">
            {tests.map((test, index) => (
              <div key={index} className="relative">
                <TestCard {...test} />
                <div className="absolute inset-0 bg-slate-100/50 rounded-2xl flex items-center justify-center">
                  <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-slate-600">
                    <Lock className="w-5 h-5" />
                    <span className="font-medium">Login Required</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Demo Tests Link */}
        <div className="mt-12 text-center">
          <p className="text-slate-600 mb-4">Want to try without logging in?</p>
          <Link href="/demo" className="btn-secondary inline-flex items-center gap-2">
            Try Demo Tests
          </Link>
        </div>
      </div>
    );
  }

  // Show full tests when authenticated
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4">
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Full Tests</h1>
        <p className="text-slate-600 mt-2">
          Welcome back, <span className="font-semibold text-primary-600">{session.user?.name || session.user?.email}</span>!
          Complete tests and track your progress.
        </p>
      </div>

      {/* Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tests.map((test, index) => (
          <TestCard key={index} {...test} />
        ))}
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-primary-50 border border-primary-200 rounded-xl p-6">
        <h3 className="font-semibold text-primary-900 mb-2">📊 Your progress is saved</h3>
        <p className="text-primary-700 text-sm">
          After completing each test, your score will be saved automatically.
          Visit the <Link href="/progress" className="underline font-medium">Progress</Link> page to track your improvement over time.
        </p>
      </div>

      {/* Demo Tests Link */}
      <div className="mt-8 text-center">
        <p className="text-slate-600 mb-4">Want to practice without scoring?</p>
        <Link href="/demo" className="btn-secondary inline-flex items-center gap-2">
          Try Demo Tests
        </Link>
      </div>
    </div>
  );
}
