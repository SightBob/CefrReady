'use client';

import Link from 'next/link';
import { 
  PenTool, 
  BookOpen, 
  Layers, 
  Headphones,
  ArrowRight,
  Clock,
  Target
} from 'lucide-react';

export type TestType = 'focus-form' | 'focus-meaning' | 'form-meaning' | 'listening';

interface TestCardProps {
  type: TestType;
  title: string;
  description: string;
  duration: string;
  questions: number;
  href: string;
}

const iconMap = {
  'focus-form': PenTool,
  'focus-meaning': BookOpen,
  'form-meaning': Layers,
  'listening': Headphones,
};

const colorMap = {
  'focus-form': 'from-blue-500 to-cyan-500',
  'focus-meaning': 'from-emerald-500 to-teal-500',
  'form-meaning': 'from-purple-500 to-pink-500',
  'listening': 'from-orange-500 to-amber-500',
};

const bgColorMap = {
  'focus-form': 'bg-blue-50',
  'focus-meaning': 'bg-emerald-50',
  'form-meaning': 'bg-purple-50',
  'listening': 'bg-orange-50',
};

export default function TestCard({ type, title, description, duration, questions, href }: TestCardProps) {
  const Icon = iconMap[type];
  const gradient = colorMap[type];
  const bgColor = bgColorMap[type];

  return (
    <Link href={href} className="card card-hover p-6 group block">
      <div className="flex items-start gap-4">
        <div className={`${bgColor} p-4 rounded-2xl group-hover:scale-110 transition-transform`}>
          <Icon className={`w-8 h-8 bg-gradient-to-br ${gradient} bg-clip-text text-transparent`} style={{ stroke: 'url(#gradient)' }} />
          <svg width="0" height="0">
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: gradient.includes('blue') ? '#3b82f6' : gradient.includes('emerald') ? '#10b981' : gradient.includes('purple') ? '#a855f7' : '#f97316' }} />
                <stop offset="100%" style={{ stopColor: gradient.includes('cyan') ? '#06b6d4' : gradient.includes('teal') ? '#14b8a6' : gradient.includes('pink') ? '#ec4899' : '#f59e0b' }} />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-800 group-hover:text-primary-600 transition-colors">
            {title}
          </h3>
          <p className="text-slate-500 mt-1 text-sm leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Clock className="w-4 h-4" />
          <span>{duration}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Target className="w-4 h-4" />
          <span>{questions} questions</span>
        </div>
        <div className="ml-auto">
          <div className="bg-primary-50 group-hover:bg-primary-100 p-2 rounded-full transition-colors">
            <ArrowRight className="w-5 h-5 text-primary-600 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}
