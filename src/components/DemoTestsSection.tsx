'use client';

import TestCard from '@/components/TestCard';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export interface DemoTest {
  type: 'focus-form' | 'focus-meaning' | 'form-meaning' | 'listening';
  title: string;
  description: string;
  duration: string;
  questions: number;
  href: string;
}

interface DemoTestsSectionProps {
  title?: string;
  showInfoBanner?: boolean;
}

export const demoTests: DemoTest[] = [
  {
    type: 'focus-form',
    title: 'Focus on Form',
    description: 'Try a sample test on grammatical structures, verb forms, and sentence patterns.',
    duration: '5 min',
    questions: 5,
    href: '/demo/focus-form',
  },
  {
    type: 'focus-meaning',
    title: 'Focus on Meaning',
    description: 'Sample vocabulary test covering meanings, synonyms, and contextual usage.',
    duration: '5 min',
    questions: 5,
    href: '/demo/focus-meaning',
  },
  {
    type: 'form-meaning',
    title: 'Form & Meaning',
    description: 'Sample fill-in-the-blank test combining grammar and vocabulary.',
    duration: '5 min',
    questions: 5,
    href: '/demo/form-meaning',
  },
  {
    type: 'listening',
    title: 'Listening',
    description: 'Sample listening comprehension test with audio passages.',
    duration: '5 min',
    questions: 5,
    href: '/demo/listening',
  },
];

export default function DemoTestsSection({ title = 'Demo Tests', showInfoBanner = true }: DemoTestsSectionProps) {
  return (
    <div>
      {showInfoBanner && (
        <div className="bg-primary-50 rounded-2xl p-6 mb-8">
          <p className="text-primary-700 font-medium mb-2">
            🎉 These are sample tests with 5 questions each.
          </p>
          <p className="text-primary-600 text-sm">
            For full tests with 20-30 questions and progress tracking, <Link href="/tests" className="underline font-medium">login here</Link>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {demoTests.map((test, index) => (
          <TestCard key={index} {...test} />
        ))}
      </div>
    </div>
  );
}
