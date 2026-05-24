'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Target,
  TrendUp,
  Trophy,
  BookOpen,
  ArrowRight,
} from '@phosphor-icons/react';
import {
  estimateCefrLevel,
  CEFR_DESCRIPTIONS,
  SCORE_RANGES,
} from '@/lib/cefr-estimator';
import CefrLevelBanner from '@/components/CefrLevelBanner';
import AnimatedCounter from '@/components/AnimatedCounter';
import StatCard from '@/components/StatCard';
import ProgressCard from '@/components/ProgressCard';
import TestHistoryTable from '@/components/TestHistoryTable';

const SkillRadarChart = dynamic(
  () => import('@/components/ProgressAnalytics').then((m) => m.SkillRadarChart),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-[#F7F6F3] rounded-2xl" /> }
);
const HistoryLineChart = dynamic(
  () => import('@/components/ProgressAnalytics').then((m) => m.HistoryLineChart),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-[#F7F6F3] rounded-2xl" /> }
);
const SmartInsights = dynamic(
  () => import('@/components/ProgressAnalytics').then((m) => m.SmartInsights),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-[#F7F6F3] rounded-2xl" /> }
);

// ─── Types ──────────────────────────────────────────────────────────────────────

interface ProgressData {
  overall: { testsTaken: number; averageScore: number };
  byCategory: Array<{
    testTypeId: string;
    averageScore: number;
    testsTaken: number;
  }>;
  recentAttempts: Array<{
    id: number;
    testTypeId: string;
    testTypeName: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    completedAt: string;
  }>;
}

// ─── Stagger parent variants ────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 100, damping: 20 },
  },
};

// ─── Improvement badge ─────────────────────────────────────────────────────────

function ImprovementBadge({ improvementText }: { improvementText: { label: string; positive: boolean } | null }) {
  if (!improvementText) {
    return <p className="text-[#AAAAAA] text-xs mt-0.5">คะแนนรวม</p>;
  }
  return (
    <motion.span
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6 }}
      className={`text-xs mt-0.5 font-semibold ${
        improvementText.positive ? 'text-emerald-600' : 'text-red-500'
      }`}
    >
      {improvementText.label}
    </motion.span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ProgressContent({ progress }: { progress: ProgressData }) {
  const hasData = progress.overall.testsTaken > 0;
  const level = hasData ? estimateCefrLevel(progress.overall.averageScore) : null;

  const bestScore =
    progress.recentAttempts.length > 0
      ? Math.max(...progress.recentAttempts.map((a) => a.score))
      : null;

  const improvementText = (() => {
    if (progress.recentAttempts.length < 2) return null;
    const diff =
      progress.recentAttempts[0].score - progress.recentAttempts[1].score;
    if (diff > 0) return { label: `+${diff}% จากครั้งก่อน`, positive: true };
    if (diff < 0) return { label: `${diff}% จากครั้งก่อน`, positive: false };
    return null;
  })();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* ── Page Header (Asymmetric Left-Aligned) ──────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        className="mb-10"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#787774] hover:text-[#111] transition-colors mb-5"
        >
          <ArrowLeft size={16} weight="bold" />
          กลับหน้าหลัก
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl tracking-tighter leading-none font-bold text-[#111]">
              พัฒนาการของคุณ
            </h1>
            <p className="text-[#787774] mt-2 text-sm leading-relaxed max-w-[42ch]">
              ติดตามความก้าวหน้าและวิเคราะห์ทักษะภาษาอังกฤษ CEFR
            </p>
          </div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/tests"
              className="inline-flex items-center gap-2 bg-[#111] text-white text-sm font-semibold rounded-full px-5 py-2.5 hover:bg-[#2a2a2a] transition-colors shadow-[0_8px_24px_-4px_rgba(0,0,0,0.18)]"
            >
              ทำข้อสอบ
              <ArrowRight size={16} weight="bold" />
            </Link>
          </motion.div>
        </div>
      </motion.header>

      {/* ── Empty State ────────────────────────────────────────────────────── */}
      {!hasData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.1 }}
          className="bg-[#F7F6F3] border border-[#EAEAEA] rounded-[2rem] p-10 sm:p-14 flex flex-col items-center text-center gap-5"
        >
          <div className="w-16 h-16 bg-white rounded-2xl border border-[#EAEAEA] flex items-center justify-center shadow-sm">
            <Target size={30} weight="duotone" className="text-[#AAA]" />
          </div>
          <h2 className="text-xl font-bold text-[#111] tracking-tight">
            ยังไม่มีข้อมูลพัฒนาการ
          </h2>
          <p className="text-sm text-[#787774] max-w-xs leading-relaxed">
            เริ่มทำข้อสอบ CEFR วันนี้เพื่อดูระดับภาษาอังกฤษของคุณและติดตามพัฒนาการ
          </p>
          <div className="flex gap-3 flex-wrap justify-center mt-1">
            <Link
              href="/tests"
              className="bg-[#111] text-white text-sm font-semibold rounded-full px-5 py-2.5 hover:bg-[#2a2a2a] transition-colors"
            >
              เริ่มทำข้อสอบ
            </Link>
            <Link
              href="/demo"
              className="border border-[#EAEAEA] text-[#111] text-sm font-semibold rounded-full px-5 py-2.5 hover:bg-[#F0F0F0] transition-colors"
            >
              ลองทำ Demo ก่อน
            </Link>
          </div>
        </motion.div>
      )}

      {/* ── CEFR Level Banner ──────────────────────────────────────────────── */}
      {hasData && level && (
        <div className="mb-8">
          <CefrLevelBanner
            level={level}
            averageScore={progress.overall.averageScore}
          />
        </div>
      )}

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      {hasData && (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <StatCard
            icon={Target}
            iconBg="bg-[#F7F6F3]"
            label="ทำข้อสอบทั้งหมด"
            index={0}
            subtext="ครั้ง"
          >
            <AnimatedCounter value={progress.overall.testsTaken} />
          </StatCard>

          <StatCard
            icon={TrendUp}
            iconBg="bg-[#F7F6F3]"
            label="คะแนนเฉลี่ย"
            index={1}
            subtext={<ImprovementBadge improvementText={improvementText} />}
          >
            <AnimatedCounter value={progress.overall.averageScore} suffix="%" />
          </StatCard>

          <StatCard
            icon={Trophy}
            iconBg="bg-[#F7F6F3]"
            label="คะแนนสูงสุด"
            index={2}
            subtext="จากครั้งที่ผ่านมา"
          >
            {bestScore !== null ? (
              <AnimatedCounter value={bestScore} suffix="%" />
            ) : (
              <span className="text-slate-400">&mdash;</span>
            )}
          </StatCard>

          <StatCard
            icon={BookOpen}
            iconBg="bg-[#F7F6F3]"
            label="ทักษะที่ฝึกแล้ว"
            index={3}
            subtext="ประเภทข้อสอบ"
          >
            <AnimatedCounter value={progress.byCategory.length} />
            <span className="text-base font-normal text-[#AAAAAA]">/4</span>
          </StatCard>
        </motion.div>
      )}

      {/* ── Bento Analytics Grid ───────────────────────────────────────────── */}
      {hasData && (
        <motion.section
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mb-10 grid grid-cols-1 lg:grid-cols-3 gap-5"
        >
          {/* Left Column: Radar + Insights */}
          <div className="lg:col-span-1 flex flex-col gap-5">
            <motion.div
              variants={fadeUp}
              className="bg-white border border-[#EAEAEA] rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-center justify-between mb-0.5">
                <h2 className="font-bold text-[#111] text-base tracking-tight">
                  Skill Overview
                </h2>
                <span className="text-[10px] text-[#AAAAAA] font-semibold uppercase tracking-[0.15em]">
                  Radar
                </span>
              </div>
              <p className="text-[#AAAAAA] text-xs mb-5">
                คะแนนเฉลี่ยแต่ละทักษะ
              </p>
              <SkillRadarChart data={progress.byCategory} />
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="bg-white border border-[#EAEAEA] rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.04)] flex-1"
            >
              <div className="flex items-center justify-between mb-0.5">
                <h2 className="font-bold text-[#111] text-base tracking-tight">
                  Smart Insights
                </h2>
                <span className="text-[10px] text-[#AAAAAA] font-semibold uppercase tracking-[0.15em]">
                  AI
                </span>
              </div>
              <p className="text-[#AAAAAA] text-xs mb-5">
                จุดแข็ง-จุดอ่อนและคำแนะนำ
              </p>
              <SmartInsights data={progress.byCategory} />
            </motion.div>
          </div>

          {/* Right Column: Trend + Breakdown */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <motion.div
              variants={fadeUp}
              className="bg-white border border-[#EAEAEA] rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-center justify-between mb-0.5">
                <h2 className="font-bold text-[#111] text-base tracking-tight">
                  Performance Trend
                </h2>
                <span className="text-[10px] text-[#AAAAAA] font-semibold uppercase tracking-[0.15em]">
                  Area
                </span>
              </div>
              <p className="text-[#AAAAAA] text-xs mb-3">
                แนวโน้มคะแนนจากการทำข้อสอบล่าสุด
              </p>
              <HistoryLineChart attempts={progress.recentAttempts} />
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="bg-white border border-[#EAEAEA] rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.04)] flex-1"
            >
              <div className="flex items-center justify-between mb-0.5">
                <h2 className="font-bold text-[#111] text-base tracking-tight">
                  Category Breakdown
                </h2>
                <span className="text-[10px] text-[#AAAAAA] font-semibold uppercase tracking-[0.15em]">
                  Cards
                </span>
              </div>
              <p className="text-[#AAAAAA] text-xs mb-5">
                ผลลัพธ์แบ่งตามประเภทข้อสอบ
              </p>
              {progress.byCategory.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {progress.byCategory.map((category) => (
                    <ProgressCard
                      key={category.testTypeId}
                      testTypeId={category.testTypeId}
                      testTypeName={category.testTypeId
                        .split('-')
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ')}
                      averageScore={category.averageScore}
                      testsTaken={category.testsTaken}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-[#F7F6F3] rounded-2xl p-8 text-center border border-[#EAEAEA]">
                  <p className="text-[#787774] text-sm">
                    ยังไม่มีข้อมูลแยกตามประเภท
                  </p>
                  <Link
                    href="/tests"
                    className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold border border-[#111] text-[#111] rounded-full px-4 py-1.5 hover:bg-[#111] hover:text-white transition-colors"
                  >
                    เริ่มทำข้อสอบ →
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
        </motion.section>
      )}

      {/* ── Test History ────────────────────────────────────────────────────── */}
      {hasData && (
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.5 }}
          className="bg-white rounded-[2rem] border border-[#EAEAEA] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.04)] overflow-hidden"
        >
          <div className="px-6 sm:px-8 py-5 border-b border-[#F0F0F0] flex items-center justify-between">
            <div>
              <h2 className="font-bold text-[#111] text-base tracking-tight">
                ประวัติการทำข้อสอบ
              </h2>
              <p className="text-[#AAAAAA] text-xs mt-0.5">10 ครั้งล่าสุด</p>
            </div>
            <Link
              href="/tests"
              className="text-xs font-semibold text-[#787774] hover:text-[#111] transition-colors flex items-center gap-1"
            >
              ทำข้อสอบใหม่
              <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
          <div className="p-6 sm:p-8">
            <TestHistoryTable attempts={progress.recentAttempts} />
          </div>
        </motion.section>
      )}
    </div>
  );
}
