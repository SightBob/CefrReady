'use client';

import Link from 'next/link';

interface TestAttempt {
  id: number;
  testTypeId: string;
  testTypeName: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  completedAt: Date | string | null;
}

interface TestHistoryTableProps {
  attempts: TestAttempt[];
}

const getScoreStyle = (score: number) => {
  if (score >= 70) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (score >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-red-700 bg-red-50 border-red-200';
};

const getScoreLabel = (score: number) => {
  if (score >= 70) return 'ผ่าน';
  if (score >= 50) return 'ใกล้ผ่าน';
  return 'ต้องฝึกเพิ่ม';
};

const getStatusBadge = (score: number) => {
  if (score >= 70) return 'bg-emerald-100 text-emerald-700';
  if (score >= 50) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
};

function formatDate(date: Date | string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TestHistoryTable({ attempts }: TestHistoryTableProps) {
  if (attempts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-1">ยังไม่มีประวัติการทำข้อสอบ</h3>
        <p className="text-slate-500 text-sm">ทำข้อสอบให้เสร็จเพื่อดูประวัติที่นี่</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: Card layout */}
      <div className="md:hidden space-y-3">
        {attempts.map((attempt) => (
          <Link
            key={attempt.id}
            href={`/review/${attempt.id}`}
            className="block bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-slate-800">{attempt.testTypeName}</h3>
              <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusBadge(attempt.score)}`}>
                {getScoreLabel(attempt.score)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium border ${getScoreStyle(attempt.score)}`}>
                {attempt.score}%
              </span>
              <span>{attempt.correctAnswers}/{attempt.totalQuestions}</span>
              <span className="ml-auto text-xs">{formatDate(attempt.completedAt)}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop: Table layout */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Test Type</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Score</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Correct</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Date</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600"></th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((attempt) => (
              <tr key={attempt.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="py-3 px-4">
                  <span className="font-medium text-slate-800">{attempt.testTypeName}</span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getScoreStyle(attempt.score)}`}>
                    {attempt.score}%
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-slate-600 text-sm">
                    {attempt.correctAnswers} / {attempt.totalQuestions}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-slate-500 text-sm">{formatDate(attempt.completedAt)}</span>
                </td>
                <td className="py-3 px-4">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusBadge(attempt.score)}`}>
                    {getScoreLabel(attempt.score)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <Link
                    href={`/review/${attempt.id}`}
                    className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
