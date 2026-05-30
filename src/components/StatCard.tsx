'use client';

import React from 'react';

interface StatCardProps {
  icon: React.ElementType;
  iconBg: string;
  label: string;
  children: React.ReactNode;
  subtext?: React.ReactNode;
  index: number;
}

const StatCard = React.memo(function StatCard({
  icon: IconComp,
  iconBg,
  label,
  children,
  subtext,
  index,
}: StatCardProps) {
  return (
    <div
      className="bg-white rounded-2xl p-5 border border-[#EAEAEA] shadow-[0_4px_16px_-4px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 transition-all duration-200"
      style={{ animation: `fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) ${0.25 + index * 0.07}s both` }}
    >
      <div
        className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center mb-3`}
      >
        <IconComp
          size={20}
          weight="duotone"
          className="text-[#111]"
        />
      </div>
      <p className="text-[#787774] text-xs font-medium mb-0.5 tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-bold text-[#111] tracking-tight">
        {children}
      </p>
      {subtext && <p className="text-[#AAAAAA] text-xs mt-0.5">{subtext}</p>}
    </div>
  );
});

export default StatCard;
