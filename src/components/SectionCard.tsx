'use client';

import Link from 'next/link';
import {
  PenTool,
  BookOpen,
  Layers,
  Headphones,
  ArrowRight,
  Clock,
  LayoutGrid,
} from 'lucide-react';

export interface SectionData {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  duration: number | null;
  testSets: { id: number; name: string; isActive?: boolean }[];
}

const ICON_MAP: Record<string, React.ElementType> = {
  'focus-form': PenTool,
  'focus-meaning': BookOpen,
  'form-meaning': Layers,
  'listening': Headphones,
};

const GRADIENT_MAP: Record<string, string> = {
  'focus-form': 'from-blue-500 to-cyan-500',
  'focus-meaning': 'from-emerald-500 to-teal-500',
  'form-meaning': 'from-purple-500 to-pink-500',
  'listening': 'from-orange-500 to-amber-500',
};

const BG_MAP: Record<string, string> = {
  'focus-form': 'bg-blue-50',
  'focus-meaning': 'bg-emerald-50',
  'form-meaning': 'bg-purple-50',
  'listening': 'bg-orange-50',
};

const BORDER_MAP: Record<string, string> = {
  'focus-form': 'hover:border-blue-200',
  'focus-meaning': 'hover:border-emerald-200',
  'form-meaning': 'hover:border-purple-200',
  'listening': 'hover:border-orange-200',
};

const TEXT_MAP: Record<string, string> = {
  'focus-form': 'group-hover:text-blue-600',
  'focus-meaning': 'group-hover:text-emerald-600',
  'form-meaning': 'group-hover:text-purple-600',
  'listening': 'group-hover:text-orange-600',
};

export default function SectionCard({ section, disabled = false }: { section: SectionData; disabled?: boolean }) {
  const Icon = ICON_MAP[section.id] ?? LayoutGrid;
  const gradient = GRADIENT_MAP[section.id] ?? 'from-slate-400 to-slate-500';
  const bg = BG_MAP[section.id] ?? 'bg-slate-50';
  const border = BORDER_MAP[section.id] ?? 'hover:border-slate-300';
  const textHover = TEXT_MAP[section.id] ?? 'group-hover:text-slate-600';

  const setCount = section.testSets.length;

  const inner = (
    <div className={`card p-6 group block border border-slate-100 transition-all duration-200 ${border} ${disabled ? 'opacity-60 pointer-events-none' : 'card-hover'}`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`${bg} p-4 rounded-2xl group-hover:scale-110 transition-transform flex-shrink-0`}>
          <Icon
            className={`w-8 h-8`}
            style={{
              stroke: `url(#sec-grad-${section.id})`,
            }}
          />
          <svg width="0" height="0" className="absolute">
            <defs>
              <linearGradient id={`sec-grad-${section.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={gradientStart(section.id)} />
                <stop offset="100%" stopColor={gradientEnd(section.id)} />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-xl font-bold text-slate-800 transition-colors ${textHover}`}>
            {section.name}
          </h3>
          {section.description && (
            <p className="text-slate-500 mt-1 text-sm leading-relaxed line-clamp-2">
              {section.description}
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-slate-100">
        {section.duration && (
          <div className="flex items-center gap-1.5 text-slate-500 text-sm">
            <Clock className="w-4 h-4" />
            <span>{section.duration} min / set</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-slate-500 text-sm">
          <LayoutGrid className="w-4 h-4" />
          <span>{setCount} {setCount === 1 ? 'set' : 'sets'}</span>
        </div>
        <div className="ml-auto">
          <div className={`bg-gradient-to-br ${gradient} p-2 rounded-full`}>
            <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );

  if (disabled) return inner;
  return <Link href={`/tests/${section.id}`}>{inner}</Link>;
}

function gradientStart(id: string): string {
  const map: Record<string, string> = {
    'focus-form': '#3b82f6',
    'focus-meaning': '#10b981',
    'form-meaning': '#a855f7',
    'listening': '#f97316',
  };
  return map[id] ?? '#64748b';
}

function gradientEnd(id: string): string {
  const map: Record<string, string> = {
    'focus-form': '#06b6d4',
    'focus-meaning': '#14b8a6',
    'form-meaning': '#ec4899',
    'listening': '#f59e0b',
  };
  return map[id] ?? '#94a3b8';
}
