'use client';

import { CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

interface TestResultsProps {
  score: number;
  totalQuestions: number;
  isDemo?: boolean;
  onRestart: () => void;
}

export default function TestResults({ score, totalQuestions, isDemo = false, onRestart }: TestResultsProps) {
  const percentage = Math.round((score / totalQuestions) * 100);
  const passed = percentage >= 70;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href={isDemo ? "/demo" : "/tests"} className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-6">
        ← Back to {isDemo ? "Demo Tests" : "Tests"}
      </Link>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center">
        <div className={`inline-flex p-4 rounded-full ${passed ? 'bg-emerald-50' : 'bg-red-50'} mb-6`}>
          {passed ? (
            <CheckCircle className="w-12 h-12 text-emerald-600" />
          ) : (
            <XCircle className="w-12 h-12 text-red-600" />
          )}
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          {passed ? (isDemo ? 'Great Job!' : 'Congratulations!') : 'Keep Practicing!'}
        </h1>
        <p className="text-slate-600 mb-6">
          {passed
            ? (isDemo ? 'You passed the demo test!' : 'You passed the test!')
            : 'You need 70% to pass. Try again!'}
        </p>

        <div className="bg-slate-50 rounded-xl p-6 mb-6">
          <p className="text-5xl font-bold text-slate-900 mb-2">{percentage}%</p>
          <p className="text-slate-500">{score} out of {totalQuestions} correct</p>
        </div>

        {!isDemo && (
          <div className="flex gap-4 justify-center">
            <button onClick={onRestart} className="btn-primary">
              Other Tests
            </button>
          </div>
        )}

        {isDemo && (
          <>
            <div className="bg-primary-50 rounded-xl p-4 mb-6">
              <p className="text-primary-700 font-medium">Want more questions and progress tracking?</p>
              <Link href="/tests" className="text-primary-600 hover:text-primary-700 underline font-medium">
                Login for Full Tests →
              </Link>
            </div>

            <div className="flex gap-4 justify-center">
              <button onClick={onRestart} className="btn-primary">
                Try Again
              </button>
              <Link href="/demo" className="btn-secondary">
                Other Demo Tests
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}