'use client';

import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Trophy } from '@phosphor-icons/react';
import type { CefrLevel } from '@/lib/cefr-estimator';
import { CEFR_GRADIENT, CEFR_DESCRIPTIONS, SCORE_RANGES } from '@/lib/cefr-estimator';

const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

const CEFR_THRESHOLDS: Record<string, number> = {
  A1: 38, A2: 52, B1: 65, B2: 78, C1: 90, C2: 101,
};

interface CefrLevelBannerProps {
  level: CefrLevel;
  averageScore: number;
}

const AnimatedRing = React.memo(function AnimatedRing({
  progress,
  id,
}: {
  progress: number;
  id: string;
}) {
  const R = 54;
  const C = 2 * Math.PI * R;
  const mv = useMotionValue(0);
  const offset = useTransform(mv, [0, 100], [C, 0]);
  const circleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const ctrl = animate(mv, progress, {
      type: 'spring',
      stiffness: 50,
      damping: 18,
      delay: 0.4,
    });
    const unsub = offset.on('change', (v) => {
      if (circleRef.current) circleRef.current.style.strokeDashoffset = String(v);
    });
    return () => {
      ctrl.stop();
      unsub();
    };
  }, [progress, mv, offset]);

  return (
    <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.4)" />
          </linearGradient>
        </defs>
        <circle
          cx="60"
          cy="60"
          r={R}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="5"
          fill="none"
        />
        <circle
          ref={circleRef}
          cx="60"
          cy="60"
          r={R}
          stroke={`url(#${id})`}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={C}
          strokeDashoffset={C}
        />
      </svg>
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Trophy size={26} weight="fill" className="text-white/90" />
        <span className="text-white/50 text-[9px] font-semibold mt-0.5 tracking-[0.15em]">
          LEVEL
        </span>
      </motion.div>
    </div>
  );
});

export default React.memo(function CefrLevelBanner({
  level,
  averageScore,
}: CefrLevelBannerProps) {
  const idx = CEFR_ORDER.indexOf(level);
  const next = idx < CEFR_ORDER.length - 1 ? CEFR_ORDER[idx + 1] : null;
  const prevThresh =
    idx > 0 ? CEFR_THRESHOLDS[CEFR_ORDER[idx - 1] as string] : 0;
  const nextThresh = next ? CEFR_THRESHOLDS[level] : 100;
  const rawPct =
    nextThresh !== prevThresh
      ? ((averageScore - prevThresh) / (nextThresh - prevThresh)) * 100
      : 0;
  const pct = Math.min(100, Math.max(0, Math.round(rawPct)));
  const gap = next ? Math.max(0, nextThresh - averageScore) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${CEFR_GRADIENT[level]} shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)]`}
    >
      {/* Liquid glass refraction border */}
      <div className="absolute inset-0 rounded-[2rem] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] pointer-events-none" />

      {/* Breathing decorative blobs */}
      <motion.div
        className="absolute -top-20 -right-20 w-56 h-56 bg-white/[0.06] rounded-full pointer-events-none"
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.06, 0.1, 0.06],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-16 -left-8 w-36 h-36 bg-white/[0.03] rounded-full pointer-events-none"
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.03, 0.06, 0.03],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
      />

      <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 p-6 sm:p-8 lg:p-10">
        <AnimatedRing progress={pct} id={`ring-${level}`} />

        <div className="text-white flex-1 min-w-0 text-center sm:text-left">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 20,
              delay: 0.15,
            }}
          >
            <span className="text-5xl sm:text-6xl font-black leading-none tracking-tighter">
              {level}
            </span>
            <p className="text-base sm:text-lg font-semibold mt-1.5 text-white/90">
              {CEFR_DESCRIPTIONS[level]}
            </p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-2.5 text-sm text-white/60"
          >
            คะแนนเฉลี่ย {averageScore}% — ช่วงระดับ {SCORE_RANGES[level]}
          </motion.p>

          {next && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 100,
                damping: 20,
                delay: 0.45,
              }}
              className="mt-5"
            >
              <div className="flex justify-between text-xs text-white/70 mb-1.5">
                <span>ความคืบหน้าสู่ระดับ {next}</span>
                <span className="font-semibold">{pct}%</span>
              </div>
              <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white/80 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{
                    type: 'spring',
                    stiffness: 50,
                    damping: 18,
                    delay: 0.55,
                  }}
                />
              </div>
              <p className="text-xs text-white/50 mt-1.5">
                ต้องการ {nextThresh}% — ยังขาดอีก {gap}%
              </p>
            </motion.div>
          )}

          {!next && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 120,
                damping: 15,
                delay: 0.45,
              }}
              className="mt-4 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2"
            >
              <Trophy size={16} weight="fill" className="text-amber-300" />
              <span className="text-sm font-semibold text-white/90">
                ถึงระดับสูงสุดแล้ว
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
