'use client';

import { ArrowLeft, TrendingUp, Award, Target, Clock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import ProgressCard from '@/components/ProgressCard';
import TestHistoryTable from '@/components/TestHistoryTable';
import { estimateCefrLevel, CEFR_COLORS, CEFR_GRADIENT, CEFR_DESCRIPTIONS, SCORE_RANGES } from '@/lib/cefr-estimator';

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

export default function ProgressContent({ progress }: { progress: ProgressData }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Your Progress</h1>
        <p className="text-slate-600 mt-2">Track your learning journey and performance</p>
      </div>

      {/* CEFR Level Banner */}
      {progress.overall.testsTaken > 0 && (() => {
        const level = estimateCefrLevel(progress.overall.averageScore);
        return (
          <div className={`relative overflow-hidden rounded-2xl p-6 mb-8 bg-gradient-to-r ${CEFR_GRADIENT[level]} shadow-lg`}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
            <div className="relative flex items-center gap-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                <span className="text-5xl font-black text-white">{level}</span>
              </div>
              <div className="text-white">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium opacity-80">ระดับ CEFR ที่ประเมิน</span>
                </div>
                <p className="text-xl font-bold">{CEFR_DESCRIPTIONS[level]}</p>
                <p className="text-sm opacity-75 mt-1">
                  จากคะแนนเฉลี่ย {progress.overall.averageScore}% • ช่วงคะแนน {SCORE_RANGES[level]}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-3 rounded-xl">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-3">ทำข้อสอบทั้งหมด</p>
          <p className="text-2xl font-bold text-slate-800">{progress.overall.testsTaken}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 p-3 rounded-xl">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-3">คะแนนเฉลี่ย</p>
          <p className="text-2xl font-bold text-slate-800">{progress.overall.averageScore}%</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-amber-50 p-3 rounded-xl">
              <Award className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-3">คะแนนสูงสุด</p>
          <p className="text-lg font-bold text-slate-800">
            {progress.byCategory.length > 0
              ? `${Math.max(...progress.byCategory.map((c) => c.averageScore))}%`
              : '-'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-orange-50 p-3 rounded-xl">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-3">ทักษะที่ฝึกแล้ว</p>
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
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
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
