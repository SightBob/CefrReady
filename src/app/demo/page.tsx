import TestCard from '@/components/TestCard';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DemoTestsPage() {
  const demoTests = [
    {
      type: 'focus-form' as const,
      title: 'Focus on Form',
      description: 'Try a sample test on grammatical structures, verb forms, and sentence patterns.',
      duration: '5 min',
      questions: 5,
      href: '/demo/focus-form',
    },
    {
      type: 'focus-meaning' as const,
      title: 'Focus on Meaning',
      description: 'Sample vocabulary test covering meanings, synonyms, and contextual usage.',
      duration: '5 min',
      questions: 5,
      href: '/demo/focus-meaning',
    },
    {
      type: 'form-meaning' as const,
      title: 'Form & Meaning',
      description: 'Sample fill-in-the-blank test combining grammar and vocabulary.',
      duration: '5 min',
      questions: 5,
      href: '/demo/form-meaning',
    },
    {
      type: 'listening' as const,
      title: 'Listening',
      description: 'Sample listening comprehension test with audio passages.',
      duration: '5 min',
      questions: 5,
      href: '/demo/listening',
    },
  ];

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

      <div className="bg-primary-50 rounded-2xl p-6 mb-8">
        <p className="text-primary-700 font-medium mb-2">
          🎉 These are sample tests with 5 questions each.
        </p>
        <p className="text-primary-600 text-sm">
          For full tests with 20-30 questions and progress tracking, <Link href="/tests" className="underline font-medium">login here</Link>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {demoTests.map((test, index) => (
          <TestCard key={index} {...test} />
        ))}
      </div>
    </div>
  );
}
