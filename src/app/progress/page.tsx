'use client';

import { ArrowLeft, TrendingUp, Award, Target, Clock, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function ProgressPage() {
  const recentTests = [
    { name: 'Focus on Form', score: 85, total: 20, date: '2024-03-10', status: 'passed' },
    { name: 'Focus on Meaning', score: 72, total: 25, date: '2024-03-09', status: 'passed' },
    { name: 'Listening', score: 68, total: 20, date: '2024-03-08', status: 'failed' },
    { name: 'Form & Meaning', score: 90, total: 30, date: '2024-03-07', status: 'passed' },
  ];

  const overallStats = {
    totalTests: 12,
    averageScore: 78,
    bestCategory: 'Focus on Form',
    weakestCategory: 'Listening',
    streak: 7,
  };

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
          <p className="text-2xl font-bold text-slate-800">{overallStats.totalTests}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 p-3 rounded-xl">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-3">Average Score</p>
          <p className="text-2xl font-bold text-slate-800">{overallStats.averageScore}%</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-amber-50 p-3 rounded-xl">
              <Award className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-3">Best Category</p>
          <p className="text-lg font-bold text-slate-800">{overallStats.bestCategory}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-orange-50 p-3 rounded-xl">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-3">Current Streak</p>
          <p className="text-2xl font-bold text-slate-800">{overallStats.streak} days</p>
        </div>
      </div>

      {/* Recent Tests */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Recent Tests</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {recentTests.map((test, index) => (
            <div key={index} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${test.status === 'passed' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  {test.status === 'passed' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{test.name}</p>
                  <p className="text-sm text-slate-500">{test.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-800">{test.score}%</p>
                <p className="text-sm text-slate-500">{test.score * test.total / 100}/{test.total} correct</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
