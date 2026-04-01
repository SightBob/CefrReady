import TestCard from '@/components/TestCard';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TestsPage() {
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4">
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">All Tests</h1>
        <p className="text-slate-600 mt-2">Choose a test category to begin your assessment</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tests.map((test, index) => (
          <TestCard key={index} {...test} />
        ))}
      </div>
    </div>
  );
}
