'use client';

import { ArrowLeft, TrendingUp, Award, Target, BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import ProgressCard from '@/components/ProgressCard';
import TestHistoryTable from '@/components/TestHistoryTable';
import {
  estimateCefrLevel,
  CEFR_COLORS,
  CEFR_GRADIENT,
  CEFR_DESCRIPTIONS,
  SCORE_RANGES,
} from '@/lib/cefr-estimator';
import { SkillRadarChart, HistoryLineChart, SmartInsights } from '@/components/ProgressAnalytics';

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

// CEFR level progression data
const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const CEFR_THRESHOLDS: Record<string, number> = {
  A1: 38, A2: 52, B1: 65, B2: 78, C1: 90, C2: 101,
};

export default function ProgressContent({ progress }: { progress: ProgressData }) {
  const hasData = progress.overall.testsTaken > 0;
  const level = hasData ? estimateCefrLevel(progress.overall.averageScore) : null;

  // Calculate progress to next CEFR level
  const currentLevelIdx = level ? CEFR_ORDER.indexOf(level) : -1;
  const nextLevel = currentLevelIdx < CEFR_ORDER.length - 1 ? CEFR_ORDER[currentLevelIdx + 1] : null;
  const nextThreshold = nextLevel ? CEFR_THRESHOLDS[level!] : 100;
  const prevThreshold = level && currentLevelIdx > 0 ? CEFR_THRESHOLDS[CEFR_ORDER[currentLevelIdx - 1]] : 0;
  const levelProgress = level
    ? Math.round(
        ((progress.overall.averageScore - prevThreshold) /
          (nextThreshold - prevThreshold)) *
          100
      )
    : 0;
  const clampedProgress = Math.min(100, Math.max(0, levelProgress));

  // Best score from recent attempts
  const bestScore =
    progress.recentAttempts.length > 0
      ? Math.max(...progress.recentAttempts.map((a) => a.score))
      : null;

  // Improvement: compare last 2 attempts overall
  const improvementText = (() => {
    const sorted = [...progress.recentAttempts];
    if (sorted.length < 2) return null;
    const diff = sorted[0].score - sorted[1].score;
    if (diff > 0) return { label: `+${diff}% จากครั้งก่อน`, positive: true };
    if (diff < 0) return { label: `${diff}% จากครั้งก่อน`, positive: false };
    return null;
  })();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#787774] hover:text-[#111] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับหน้าหลัก
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#111] tracking-tight">
              พัฒนาการของคุณ
            </h1>
            <p className="text-[#787774] mt-1 text-sm">
              ติดตามความก้าวหน้าและวิเคราะห์ทักษะภาษาอังกฤษ CEFR
            </p>
          </div>
          <Link
            href="/tests"
            className="inline-flex items-center gap-2 bg-[#111] text-white text-sm font-semibold rounded-full px-5 py-2.5 hover:bg-[#333] transition-colors shrink-0"
          >
            ทำข้อสอบ
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ── Empty state (new user) ───────────────────────────────────────── */}
      {!hasData && (
        <div className="mb-10 bg-[#F7F6F3] border border-[#EAEAEA] rounded-3xl p-10 flex flex-col items-center text-center gap-4">
          <div className="text-5xl">🎯</div>
          <h2 className="text-xl font-bold text-[#111]">ยังไม่มีข้อมูลพัฒนาการ</h2>
          <p className="text-sm text-[#787774] max-w-xs">
            เริ่มทำข้อสอบ CEFR วันนี้เพื่อดูระดับภาษาอังกฤษของคุณและติดตามพัฒนาการ
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            <Link href="/tests" className="bg-[#111] text-white text-sm font-semibold rounded-full px-5 py-2.5 hover:bg-[#333] transition-colors">
              เริ่มทำข้อสอบ
            </Link>
            <Link href="/demo" className="border border-[#EAEAEA] text-[#111] text-sm font-semibold rounded-full px-5 py-2.5 hover:bg-[#F0F0F0] transition-colors">
              ลองทำ Demo ก่อน
            </Link>
          </div>
        </div>
      )}

      {/* ── CEFR Level Banner ────────────────────────────────────────────── */}
      {hasData && level && (
        <div
          className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 mb-8 bg-gradient-to-br ${CEFR_GRADIENT[level]}`}
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full -translate-y-20 translate-x-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-12 -translate-x-8 pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Level badge */}
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-4 border border-white/30 shrink-0 text-center min-w-[80px]">
              <span className="text-5xl font-black text-white leading-none">{level}</span>
              <p className="text-white/70 text-xs mt-1 font-medium">ระดับ CEFR</p>
            </div>

            {/* Info */}
            <div className="text-white flex-1 min-w-0">
              <p className="text-lg sm:text-xl font-bold mb-0.5">{CEFR_DESCRIPTIONS[level]}</p>
              <p className="text-sm text-white/70 mb-4">
                คะแนนเฉลี่ย {progress.overall.averageScore}% • ช่วงคะแนนระดับนี้ {SCORE_RANGES[level]}
              </p>

              {/* Progress to next level */}
              {nextLevel && (
                <div>
                  <div className="flex justify-between text-xs text-white/80 mb-1.5">
                    <span>ความคืบหน้าสู่ระดับ {nextLevel}</span>
                    <span>{clampedProgress}%</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-700"
                      style={{ width: `${clampedProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/60 mt-1.5">
                    ต้องการ {nextThreshold}% เพื่อเลื่อนขึ้น {nextLevel} • ยังขาดอีก{' '}
                    {Math.max(0, nextThreshold - progress.overall.averageScore)}%
                  </p>
                </div>
              )}
              {!nextLevel && (
                <p className="text-sm font-semibold text-white/90">
                  🏆 คุณถึงระดับสูงสุดแล้ว! รักษามาตรฐานต่อไปครับ
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Stat Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Tests taken */}
        <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] shadow-sm">
          <div className="w-9 h-9 bg-[#F7F6F3] rounded-xl flex items-center justify-center mb-3">
            <Target className="w-5 h-5 text-[#111]" />
          </div>
          <p className="text-[#787774] text-xs font-medium mb-0.5">ทำข้อสอบทั้งหมด</p>
          <p className="text-2xl font-bold text-[#111]">{progress.overall.testsTaken}</p>
          <p className="text-[#AAAAAA] text-xs mt-0.5">ครั้ง</p>
        </div>

        {/* Average score */}
        <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] shadow-sm">
          <div className="w-9 h-9 bg-[#F7F6F3] rounded-xl flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-[#111]" />
          </div>
          <p className="text-[#787774] text-xs font-medium mb-0.5">คะแนนเฉลี่ย</p>
          <p className="text-2xl font-bold text-[#111]">
            {hasData ? `${progress.overall.averageScore}%` : '—'}
          </p>
          {improvementText && (
            <p className={`text-xs mt-0.5 font-medium ${improvementText.positive ? 'text-emerald-500' : 'text-red-400'}`}>
              {improvementText.label}
            </p>
          )}
          {!improvementText && <p className="text-[#AAAAAA] text-xs mt-0.5">คะแนนรวม</p>}
        </div>

        {/* Best score */}
        <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] shadow-sm">
          <div className="w-9 h-9 bg-[#F7F6F3] rounded-xl flex items-center justify-center mb-3">
            <Award className="w-5 h-5 text-[#111]" />
          </div>
          <p className="text-[#787774] text-xs font-medium mb-0.5">คะแนนสูงสุด</p>
          <p className="text-2xl font-bold text-[#111]">
            {bestScore !== null ? `${bestScore}%` : '—'}
          </p>
          <p className="text-[#AAAAAA] text-xs mt-0.5">จากครั้งที่ผ่านมา</p>
        </div>

        {/* Skills practiced */}
        <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] shadow-sm">
          <div className="w-9 h-9 bg-[#F7F6F3] rounded-xl flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5 text-[#111]" />
          </div>
          <p className="text-[#787774] text-xs font-medium mb-0.5">ทักษะที่ฝึกแล้ว</p>
          <p className="text-2xl font-bold text-[#111]">
            {progress.byCategory.length}<span className="text-base font-normal text-[#AAAAAA]">/4</span>
          </p>
          <p className="text-[#AAAAAA] text-xs mt-0.5">ประเภทข้อสอบ</p>
        </div>
      </div>

      {/* ── Bento Analytics Grid ─────────────────────────────────────────── */}
      <section className="mb-10 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Radar + Smart Insights */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          <div className="bg-white border border-[#EAEAEA] rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-[#111] text-base">Skill Overview</h2>
              <span className="text-[10px] text-[#AAAAAA] font-medium uppercase tracking-widest">Radar</span>
            </div>
            <p className="text-[#AAAAAA] text-xs mb-4">คะแนนเฉลี่ยแต่ละทักษะ</p>
            <SkillRadarChart data={progress.byCategory} />
          </div>

          <div className="bg-white border border-[#EAEAEA] rounded-3xl p-6 shadow-sm flex-1">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-[#111] text-base">Smart Insights</h2>
              <span className="text-[10px] text-[#AAAAAA] font-medium uppercase tracking-widest">AI</span>
            </div>
            <p className="text-[#AAAAAA] text-xs mb-4">จุดแข็ง-จุดอ่อนและคำแนะนำ</p>
            <SmartInsights data={progress.byCategory} />
          </div>
        </div>

        {/* Right: Trend + Category Breakdown */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <div className="bg-white border border-[#EAEAEA] rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-[#111] text-base">Performance Trend</h2>
              <span className="text-[10px] text-[#AAAAAA] font-medium uppercase tracking-widest">Area</span>
            </div>
            <p className="text-[#AAAAAA] text-xs mb-2">แนวโน้มคะแนนจากการทำข้อสอบล่าสุด</p>
            <HistoryLineChart attempts={progress.recentAttempts} />
          </div>

          <div className="bg-white border border-[#EAEAEA] rounded-3xl p-6 shadow-sm flex-1">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-[#111] text-base">Category Breakdown</h2>
              <span className="text-[10px] text-[#AAAAAA] font-medium uppercase tracking-widest">Cards</span>
            </div>
            <p className="text-[#AAAAAA] text-xs mb-4">ผลลัพธ์แบ่งตามประเภทข้อสอบ</p>
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
                <p className="text-[#787774] text-sm">ยังไม่มีข้อมูลแยกตามประเภท</p>
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

      {/* ── Test History ──────────────────────────────────────────────────── */}
      <section className="bg-white rounded-3xl border border-[#EAEAEA] shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-[#F0F0F0] flex items-center justify-between">
          <div>
            <h2 className="font-bold text-[#111] text-base">ประวัติการทำข้อสอบ</h2>
            <p className="text-[#AAAAAA] text-xs mt-0.5">10 ครั้งล่าสุด</p>
          </div>
          <Link
            href="/tests"
            className="text-xs font-semibold text-[#787774] hover:text-[#111] transition-colors flex items-center gap-1"
          >
            ทำข้อสอบใหม่ <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="p-6">
          <TestHistoryTable attempts={progress.recentAttempts} />
        </div>
      </section>
    </div>
  );
}
