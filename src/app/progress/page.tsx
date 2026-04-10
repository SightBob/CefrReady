'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, Award, Target, Clock, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import ProgressCard from '@/components/ProgressCard';
import TestHistoryTable from '@/components/TestHistoryTable';

interface ProgressData {
  overall: {
    testsTaken: number;
    averageScore: number;
  };
  byCategory: Array<{
    testTypeId: string;
    averageScore: number;
    testsTaken: number;
  }>;
  recentAttempts: Array<{
    id: number;
    testTypeId: string;
    testTypeName: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    completedAt: string;
  }>;
}

export default function ProgressPage() {
  const { data: session, status } = useSession();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      setLoading(false);
      return;
    }
    if (status === 'authenticated') {
      fetchProgress();
    }
  }, [status]);

  const fetchProgress = async () => {
    try {
      const res = await fetch('/api/progress');
      const data = await res.json();
      if (data.success) {
        setProgress(data.data);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading your progress...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-flex bg-gradient-to-br from-primary-500 to-accent-500 p-4 rounded-xl mb-6">
              <TrendingUp className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              กรุณาเข้าสู่ระบบก่อนใช้งาน
            </h2>
            <p className="text-slate-500 mb-6">
              เข้าสู่ระบบเพื่อดูความก้าวหน้าในการเรียนของคุณ
            </p>
            <button
              onClick={() => signIn('google', { callbackUrl: '/progress' })}
              className="btn-primary inline-flex items-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              เข้าสู่ระบบ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!progress) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4">
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Your Progress</h1>
        <p className="text-slate-600 mt-2">Track your learning journey and performance</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-3 rounded-xl">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-3">Total Tests</p>
          <p className="text-2xl font-bold text-slate-800">{progress.overall.testsTaken}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 p-3 rounded-xl">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-3">Average Score</p>
          <p className="text-2xl font-bold text-slate-800">{progress.overall.averageScore}%</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-amber-50 p-3 rounded-xl">
              <Award className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-3">Best Score</p>
          <p className="text-lg font-bold text-slate-800">
            {progress.byCategory.length > 0
              ? `${Math.max(...progress.byCategory.map(c => c.averageScore))}%`
              : '-'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-orange-50 p-3 rounded-xl">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-3">Categories</p>
          <p className="text-2xl font-bold text-slate-800">{progress.byCategory.length}</p>
        </div>
      </div>

      {/* Progress by Category */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Progress by Category</h2>
        {progress.byCategory.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {progress.byCategory.map((category) => (
              <ProgressCard
                key={category.testTypeId}
                testTypeId={category.testTypeId}
                testTypeName={category.testTypeId
                  .split('-')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}
                averageScore={category.averageScore}
                testsTaken={category.testsTaken}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 text-center border border-slate-100">
            <p className="text-slate-500">No progress yet. Start by taking a test!</p>
            <Link href="/demo" className="btn-primary inline-flex items-center gap-2 mt-4">
              Try Demo Tests
            </Link>
          </div>
        )}
      </section>

      {/* Test History */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Test History</h2>
          <p className="text-sm text-slate-500 mt-1">Your recent test attempts</p>
        </div>
        <div className="p-6">
          <TestHistoryTable attempts={progress.recentAttempts} />
        </div>
      </section>
    </div>
  );
}
