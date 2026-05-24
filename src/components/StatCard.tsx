'use client';

import React from 'react';
import { motion } from 'framer-motion';

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
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 100,
        damping: 20,
        delay: 0.25 + index * 0.07,
      }}
      whileHover={{
        y: -2,
        transition: { type: 'spring', stiffness: 300, damping: 20 },
      }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-2xl p-5 border border-[#EAEAEA] shadow-[0_4px_16px_-4px_rgba(0,0,0,0.05)]"
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
    </motion.div>
  );
});

export default StatCard;
