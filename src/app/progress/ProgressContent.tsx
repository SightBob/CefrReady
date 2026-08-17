'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import React from 'react';
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
import SmartInsights from '@/components/SmartInsights';

const SkillRadarChart = dynamic(
  () => import('@/components/ChartComponents').then((m) => m.SkillRadarChart),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-[#F7F6F3] rounded-2xl" /> }
);
const HistoryLineChart = dynamic(
  () => import('@/components/ChartComponents').then((m) => m.HistoryLineChart),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-[#F7F6F3] rounded-2xl" /> }
);

const TEST_TYPE_NAMES: Record<string, string> = {
  'focus-form': 'Grammar',
  'focus-meaning': 'Vocabulary',
  'form-meaning': 'Cloze',
  'listening': 'Listening',
  'full-test': 'Full Mock Exam',
};

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

// ─── Improvement badge ─────────────────────────────────────────────────────────

function ImprovementBadge({ improvementText }: { improvementText: { label: string; positive: boolean } | null }) {
  if (!improvementText) {
    return <span className="text-[#AAAAAA] text-xs mt-0.5">คะแนนรวม</span>;
  }
  return (
    <span
      className={`text-xs mt-0.5 font-semibold ${
        improvementText.positive ? 'text-emerald-600' : 'text-red-500'
      }`}
    >
      {improvementText.label}
    </span>
  );
}

// ─── Deferred Section (renders children after browser idle) ─────────────

function DeferredAnalytics({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    const trigger = () => setReady(true);
    if ('requestIdleCallback' in window) {
      requestIdleCallback(trigger, { timeout: 1500 });
    } else {
      setTimeout(trigger, 300);
    }
  }, []);

  if (!ready) {
    return (
      <div className="space-y-5 mb-10">
        <div className="h-64 animate-pulse bg-[#F7F6F3] rounded-[2rem]" />
        <div className="h-80 animate-pulse bg-[#F7F6F3] rounded-[2rem]" />
      </div>
    );
  }

  return <>{children}</>;
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
    const diff = Math.round(
      (progress.recentAttempts[0].score - progress.recentAttempts[1].score) * 100
    ) / 100;
    if (diff > 0) return { label: `+${diff.toFixed(2)}% จากครั้งก่อน`, positive: true };
    if (diff < 0) return { label: `${diff.toFixed(2)}% จากครั้งก่อน`, positive: false };
    return null;
  })();

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* ── Page Header (Asymmetric Left-Aligned) ──────────────────────────── */}
      <header className="mb-10 stagger-animate">
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

          <Link
            href="/tests"
            className="inline-flex items-center gap-2 bg-[#111] text-white text-sm font-semibold rounded-full px-5 py-2.5 hover:bg-[#2a2a2a] active:scale-[0.97] transition-all shadow-[0_8px_24px_-4px_rgba(0,0,0,0.18)]"
          >
            ทำข้อสอบ
            <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
      </header>

      {/* ── Empty State ────────────────────────────────────────────────────── */}
      {!hasData && (
        <div className="bg-[#F7F6F3] border border-[#EAEAEA] rounded-[2rem] p-10 sm:p-14 flex flex-col items-center text-center gap-5 stagger-animate" style={{ animationDelay: '100ms' }}>
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
        </div>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
            <AnimatedCounter value={progress.overall.averageScore} suffix="%" decimals={2} />
          </StatCard>

          <StatCard
            icon={Trophy}
            iconBg="bg-[#F7F6F3]"
            label="คะแนนสูงสุด"
            index={2}
            subtext="จากครั้งที่ผ่านมา"
          >
            {bestScore !== null ? (
              <AnimatedCounter value={bestScore} suffix="%" decimals={2} />
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
            <span className="text-base font-normal text-[#AAAAAA]">/5</span>
          </StatCard>
        </div>
      )}

      {/* ── Bento Analytics Grid (deferred) ──────────────────────── */}
      {hasData && (
      <DeferredAnalytics>
        <section className="mb-10 grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column: Radar + Insights */}
          <div className="lg:col-span-1 flex flex-col gap-5">
            <div
              className="bg-white border border-[#EAEAEA] rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.04)] stagger-animate"
              style={{ animationDelay: '150ms' }}
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
            </div>

            <div
              className="bg-white border border-[#EAEAEA] rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.04)] flex-1 stagger-animate"
              style={{ animationDelay: '200ms' }}
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
            </div>
          </div>

          {/* Right Column: Trend + Breakdown */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div
              className="bg-white border border-[#EAEAEA] rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.04)] stagger-animate"
              style={{ animationDelay: '250ms' }}
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
            </div>

            <div
              className="bg-white border border-[#EAEAEA] rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.04)] flex-1 stagger-animate"
              style={{ animationDelay: '350ms' }}
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
                      testTypeName={TEST_TYPE_NAMES[category.testTypeId] || category.testTypeId
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
            </div>
          </div>
        </section>
      </DeferredAnalytics>
      )}

      {/* ── Test History ────────────────────────────────────────────────────── */}
      {hasData && (
        <section className="bg-white rounded-[2rem] border border-[#EAEAEA] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.04)] overflow-hidden stagger-animate" style={{ animationDelay: '450ms' }}>
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
        </section>
      )}
    </div>
  );
}
