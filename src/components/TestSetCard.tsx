'use client';

import Link from 'next/link';
import { BookOpen, HelpCircle, ArrowRight, CheckCircle } from 'lucide-react';

export interface TestSetData {
  id: number;
  sectionId: string;
  name: string;
  description: string | null;
  orderIndex: number;
  isActive: boolean;
  questionCount: number;
}

const GRADIENT_MAP: Record<string, string> = {
  'focus-form': 'from-blue-500 to-cyan-500',
  'focus-meaning': 'from-emerald-500 to-teal-500',
  'form-meaning': 'from-purple-500 to-pink-500',
  'listening': 'from-orange-500 to-amber-500',
};

const BADGE_MAP: Record<string, string> = {
  'focus-form': 'bg-blue-100 text-blue-700',
  'focus-meaning': 'bg-emerald-100 text-emerald-700',
  'form-meaning': 'bg-purple-100 text-purple-700',
  'listening': 'bg-orange-100 text-orange-700',
};

const BORDER_HOVER_MAP: Record<string, string> = {
  'focus-form': 'hover:border-blue-200 hover:shadow-blue-50',
  'focus-meaning': 'hover:border-emerald-200 hover:shadow-emerald-50',
  'form-meaning': 'hover:border-purple-200 hover:shadow-purple-50',
  'listening': 'hover:border-orange-200 hover:shadow-orange-50',
};

export default function TestSetCard({
  testSet,
  sectionId,
  index,
}: {
  testSet: TestSetData;
  sectionId: string;
  index: number;
}) {
  const gradient = GRADIENT_MAP[sectionId] ?? 'from-slate-400 to-slate-500';
  const badge = BADGE_MAP[sectionId] ?? 'bg-slate-100 text-slate-600';
  const borderHover = BORDER_HOVER_MAP[sectionId] ?? 'hover:border-slate-200';
  const isReady = testSet.questionCount >= 20;

  return (
    <Link
      href={`/tests/${sectionId}/${testSet.id}`}
      className={`
        group block bg-white rounded-2xl border border-slate-100 p-5
        hover:shadow-md transition-all duration-200 ${borderHover}
      `}
    >
      <div className="flex items-start gap-4">
        {/* Set number circle */}
        <div className={`bg-gradient-to-br ${gradient} w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
          <span className="text-white font-bold text-base">{index + 1}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-slate-800 text-base leading-snug group-hover:text-slate-900 transition-colors">
              {testSet.name}
            </h3>
            {isReady && (
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            )}
          </div>
          {testSet.description && (
            <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">
              {testSet.description}
            </p>
          )}

          {/* Footer meta */}
          <div className="flex items-center gap-3 mt-3">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${badge}`}>
              <HelpCircle className="w-3 h-3" />
              {testSet.questionCount} questions
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <BookOpen className="w-3 h-3" />
              Set {index + 1}
            </span>
          </div>
        </div>

        {/* Arrow */}
        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all self-center flex-shrink-0" />
      </div>
    </Link>
  );
}
