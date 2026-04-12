'use client';

import {
  PenTool,
  BookOpen,
  Layers,
  Headphones,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { estimateCefrLevel, CEFR_COLORS } from '@/lib/cefr-estimator';

interface ProgressCardProps {
  testTypeId: string;
  testTypeName?: string;
  averageScore: number;
  testsTaken: number;
  previousScore?: number;
}

const iconMap: Record<string, any> = {
  'focus-form': PenTool,
  'focus-meaning': BookOpen,
  'form-meaning': Layers,
  'listening': Headphones,
};

const colorMap: Record<string, string> = {
  'focus-form': 'from-blue-500 to-cyan-500',
  'focus-meaning': 'from-emerald-500 to-teal-500',
  'form-meaning': 'from-purple-500 to-pink-500',
  'listening': 'from-orange-500 to-amber-500',
};

const bgColorMap: Record<string, string> = {
  'focus-form': 'bg-blue-50',
  'focus-meaning': 'bg-emerald-50',
  'form-meaning': 'bg-purple-50',
  'listening': 'bg-orange-50',
};

const scoreColorMap: Record<string, string> = {
  'high': 'text-emerald-600 bg-emerald-50 border-emerald-200',
  'medium': 'text-amber-600 bg-amber-50 border-amber-200',
  'low': 'text-red-600 bg-red-50 border-red-200',
};

export default function ProgressCard({
  testTypeId,
  testTypeName,
  averageScore,
  testsTaken,
  previousScore,
}: ProgressCardProps) {
  const Icon = iconMap[testTypeId] || PenTool;
  const gradient = colorMap[testTypeId] || 'from-slate-500 to-gray-500';
  const bgColor = bgColorMap[testTypeId] || 'bg-slate-50';

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  };

  const getTrendIcon = () => {
    if (!previousScore) return <Minus className="w-4 h-4 text-slate-400" />;
    if (averageScore > previousScore) {
      return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    }
    if (averageScore < previousScore) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const scoreColor = scoreColorMap[getScoreColor(averageScore)];

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`${bgColor} p-3 rounded-xl`}>
          <Icon className={`w-6 h-6 bg-gradient-to-br ${gradient} bg-clip-text text-transparent`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-800">{testTypeName || testTypeId}</h3>
            {testsTaken > 0 && (() => {
              const level = estimateCefrLevel(averageScore);
              return (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${CEFR_COLORS[level]}`}>
                  {level}
                </span>
              );
            })()}
          </div>
          <p className="text-sm text-slate-500">{testsTaken} {testsTaken === 1 ? 'ครั้ง' : 'ครั้ง'} ที่ทำ</p>
        </div>
        {getTrendIcon()}
      </div>

      {/* Score Display */}
      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${scoreColor}`}>
        <span className="text-2xl font-bold">{averageScore}%</span>
        <span className="text-sm font-medium">
          {averageScore >= 70 ? 'Excellent' : averageScore >= 50 ? 'Good' : 'Needs Practice'}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-slate-500">Progress</span>
          <span className="text-slate-700 font-medium">{averageScore}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${gradient} transition-all duration-500`}
            style={{ width: `${averageScore}%` }}
          />
        </div>
      </div>
    </div>
  );
}
