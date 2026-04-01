'use client';

import { TrendingUp, Award, Target, Flame } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  color: string;
}

function StatCard({ icon, label, value, trend, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center gap-3">
        <div className={`${color} p-3 rounded-xl`}>
          {icon}
        </div>
        <div>
          <p className="text-slate-500 text-sm">{label}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
      </div>
      {trend && (
        <p className="text-emerald-600 text-sm mt-3 flex items-center gap-1">
          <TrendingUp className="w-4 h-4" />
          {trend}
        </p>
      )}
    </div>
  );
}

export default function ProgressStats() {
  const stats = [
    {
      icon: <Target className="w-6 h-6 text-blue-600" />,
      label: 'Tests Completed',
      value: 12,
      trend: '+3 this week',
      color: 'bg-blue-50',
    },
    {
      icon: <Award className="w-6 h-6 text-amber-600" />,
      label: 'Average Score',
      value: '78%',
      trend: '+5% improvement',
      color: 'bg-amber-50',
    },
    {
      icon: <Flame className="w-6 h-6 text-orange-600" />,
      label: 'Current Streak',
      value: '7 days',
      color: 'bg-orange-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}
