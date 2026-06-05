'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, BarChart3, Users, Target, TrendingUp,
  Award, Loader2, RefreshCw, Download, UserPlus,
  UserCheck, AlertCircle, CheckCircle, Clock,
  Activity,
} from 'lucide-react';
import { QuestionAnalytics } from '@/components/admin/QuestionAnalytics';
import { FlashcardStats } from '@/components/admin/FlashcardStats';

interface ReportData {
  overview: {
    totalUsers: number;
    totalAttempts: number;
    overallAvgScore: number;
  };
  attemptsByType: { testTypeId: string; testTypeName: string; attempts: number; avgScore: number }[];
  attemptsOverTime: { date: string; attempts: number; avgScore: number }[];
  scoreDistribution: { bucket: string; count: number }[];
  topPerformers: {
    userId: string;
    attempts: number;
    avgScore: number;
    user: { id: string; name: string | null; email: string; image: string | null } | null;
  }[];
  questionAnalytics: {
    correctRateByType: Array<{
      testTypeId: string;
      testTypeName: string;
      totalAnswers: number;
      correctAnswers: number;
      correctRate: number;
    }>;
    hardestQuestions: Array<{
      questionId: number;
      questionText: string;
      testTypeId: string;
      testTypeName: string;
      wrongCount: number;
      correctRate: number;
    }>;
  };
  flashcardStats: {
    total: number;
    newCards: number;
    learningCards: number;
    masteredCards: number;
    avgEase: number;
    dueToday: number;
  };
  userRetention: {
    newUsersThisMonth: number;
    activeUsersLast30d: number;
    avgSessionsPerActiveUser: number;
    totalRegisteredUsers: number;
  };
  questionReports: {
    byStatus: { pending: number; in_progress: number; resolved: number };
    trend: Array<{ week: string; count: number }>;
  };
  cefrDistribution: Array<{ level: string; count: number }>;
}

const BUCKET_ORDER = ['Below 50%', '50–69%', '70–89%', '90–100%'];
const BUCKET_COLORS: Record<string, string> = {
  'Below 50%': 'bg-red-400',
  '50–69%': 'bg-amber-400',
  '70–89%': 'bg-emerald-400',
  '90–100%': 'bg-blue-500',
};
const TYPE_COLORS: Record<string, string> = {
  'focus-form':    'bg-blue-500',
  'focus-meaning':  'bg-emerald-500',
  'form-meaning':   'bg-purple-500',
  listening:        'bg-orange-500',
};
const CEFR_COLORS: Record<string, string> = {
  A1: '#EF4444', A2: '#F97316', B1: '#EAB308',
  B2: '#22C55E', C1: '#3B82F6', C2: '#8B5CF6',
};
const CEFR_LABELS: Record<string, string> = {
  A1: 'A1 (Beginner)', A2: 'A2 (Elementary)', B1: 'B1 (Intermediate)',
  B2: 'B2 (Upper-Int)', C1: 'C1 (Advanced)', C2: 'C2 (Proficiency)',
};

function estimateCefrLevel(score: number): string {
  if (score >= 90) return 'C2';
  if (score >= 80) return 'C1';
  if (score >= 70) return 'B2';
  if (score >= 60) return 'B1';
  if (score >= 40) return 'A2';
  return 'A1';
}

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reports');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Bar chart max values
  const maxAttempts = Math.max(...(data?.attemptsByType.map((t) => t.attempts) ?? [1]), 1);
  const maxDaily    = Math.max(...(data?.attemptsOverTime.map((d) => d.attempts) ?? [1]), 1);
  const totalDist   = data?.scoreDistribution.reduce((s, b) => s + b.count, 0) ?? 0;

  const maxCefr = Math.max(...(data?.cefrDistribution.map((c) => c.count) ?? [1]), 1);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-3 transition-colors">
              <ArrowLeft className="w-4 h-4" /> กลับ Admin
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="bg-orange-100 p-2 rounded-xl">
                <BarChart3 className="w-7 h-7 text-orange-600" />
              </div>
              รายงานภาพรวม
            </h1>
            <p className="text-slate-500 mt-1">
              {lastUpdated
                ? `อัพเดตล่าสุด: ${lastUpdated.toLocaleTimeString('th-TH')}`
                : 'สถิติการทดสอบและผลลัพธ์ของผู้ใช้ทั้งหมด'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/api/admin/export"
              download
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </a>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm transition-colors text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </button>
          </div>
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-slate-500">ไม่สามารถโหลดข้อมูลได้</div>
        ) : (
          <div className="space-y-6">

            {/* ─── Overview Cards ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                icon={<Users className="w-6 h-6 text-purple-600" />}
                bg="bg-purple-50"
                label="ผู้ใช้ทั้งหมด"
                value={data.overview.totalUsers.toLocaleString()}
              />
              <StatCard
                icon={<Target className="w-6 h-6 text-blue-600" />}
                bg="bg-blue-50"
                label="การทดสอบทั้งหมด"
                value={data.overview.totalAttempts.toLocaleString()}
              />
              <StatCard
                icon={<TrendingUp className="w-6 h-6 text-emerald-600" />}
                bg="bg-emerald-50"
                label="คะแนนเฉลี่ยรวม"
                value={data.overview.overallAvgScore ? `${data.overview.overallAvgScore}%` : '—'}
                highlight={data.overview.overallAvgScore >= 70}
              />
            </div>

            {/* ─── Row: Attempts by Type + Score Distribution ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Attempts by type */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-5">การทดสอบแต่ละประเภท</h2>
                {data.attemptsByType.length === 0 ? (
                  <p className="text-slate-500 text-sm">ยังไม่มีข้อมูล</p>
                ) : (
                  <div className="space-y-4">
                    {data.attemptsByType.map((t) => (
                      <div key={t.testTypeId}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-slate-700">{t.testTypeName}</span>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-slate-500">{t.attempts} ครั้ง</span>
                            <span className={`font-semibold ${
                              t.avgScore >= 70 ? 'text-emerald-600' :
                              t.avgScore >= 50 ? 'text-amber-600' : 'text-red-500'
                            }`}>
                              {t.avgScore ?? '—'}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${TYPE_COLORS[t.testTypeId] ?? 'bg-slate-400'}`}
                            style={{ width: `${Math.round((t.attempts / maxAttempts) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Score Distribution */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-5">การกระจายคะแนน</h2>
                {data.scoreDistribution.length === 0 ? (
                  <p className="text-slate-500 text-sm">ยังไม่มีข้อมูล</p>
                ) : (
                  <div className="space-y-4">
                    {BUCKET_ORDER.map((bucket) => {
                      const found = data.scoreDistribution.find((b) => b.bucket === bucket);
                      const cnt   = found?.count ?? 0;
                      const pct   = totalDist > 0 ? Math.round((cnt / totalDist) * 100) : 0;
                      return (
                        <div key={bucket}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-slate-700">{bucket}</span>
                            <span className="text-sm text-slate-500">{cnt} ({pct}%)</span>
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${BUCKET_COLORS[bucket]}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ─── Row: Activity + CEFR Distribution ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Activity 30 days */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-5">กิจกรรม 30 วันล่าสุด</h2>
                {data.attemptsOverTime.length === 0 ? (
                  <p className="text-slate-500 text-sm">ไม่มีกิจกรรมใน 30 วันที่ผ่านมา</p>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="flex items-end gap-1.5 h-32 min-w-max">
                      {data.attemptsOverTime.map((d) => {
                        const h = Math.max(4, Math.round((d.attempts / maxDaily) * 112));
                        const score = d.avgScore;
                        const barColor = score >= 70 ? 'bg-emerald-400' : score >= 50 ? 'bg-amber-400' : 'bg-red-400';
                        return (
                          <div key={d.date} className="group relative flex flex-col items-center gap-1">
                            <div
                              className={`w-5 rounded-t-sm ${barColor} transition-all hover:opacity-80`}
                              style={{ height: `${h}px` }}
                              title={`${d.date}: ${d.attempts} ครั้ง, เฉลี่ย ${d.avgScore ?? '—'}%`}
                            />
                            <span className="text-[9px] text-slate-500 transform -rotate-45 origin-top-right w-8 whitespace-nowrap mt-1">
                              {d.date.slice(5)}
                            </span>
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                              {d.attempts} ครั้ง
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 text-right">สีแสดงคะแนนเฉลี่ย: 🟢≥70% 🟡50-69% 🔴&lt;50%</p>
                  </div>
                )}
              </div>

              {/* CEFR Level Distribution */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-5">ระดับ CEFR ของผู้ใช้</h2>
                {data.cefrDistribution.every((c) => c.count === 0) ? (
                  <p className="text-slate-500 text-sm">ยังไม่มีข้อมูลระดับ</p>
                ) : (
                  <div className="space-y-3">
                    {data.cefrDistribution.map((c) => {
                      const pct = maxCefr > 0 ? Math.round((c.count / maxCefr) * 100) : 0;
                      return (
                        <div key={c.level} className="flex items-center gap-3">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: CEFR_COLORS[c.level] }}
                          >
                            {c.level}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-600 font-medium">{CEFR_LABELS[c.level]}</span>
                              <span className="text-slate-500">{c.count} คน</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: CEFR_COLORS[c.level],
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ─── Row: User Retention + Question Reports ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* User Retention */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  ผู้ใช้และการกลับมา
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <RetentionCard
                    icon={<UserPlus className="w-5 h-5 text-emerald-500" />}
                    label="ผู้ใช้ใหม่ (เดือนนี้)"
                    value={data.userRetention.newUsersThisMonth}
                    sub={`${data.userRetention.totalRegisteredUsers} คน ทั้งหมด`}
                  />
                  <RetentionCard
                    icon={<UserCheck className="w-5 h-5 text-purple-500" />}
                    label="ผู้ใช้ร่วม (30 วัน)"
                    value={data.userRetention.activeUsersLast30d}
                    sub={`${data.userRetention.totalRegisteredUsers > 0
                      ? Math.round((data.userRetention.activeUsersLast30d / data.userRetention.totalRegisteredUsers) * 100)
                      : 0}% ของผู้ลงทะเบียน`}
                  />
                  <div className="col-span-2 bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">เฉลี่ยการทดสอบต่อผู้ใช้ที่ใช้งาน</p>
                    <p className="text-2xl font-bold text-slate-800">
                      {data.userRetention.avgSessionsPerActiveUser}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">ครั้ง/คน (30 วัน)</p>
                  </div>
                </div>
              </div>

              {/* Question Reports */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  รายงานปัญหาข้อสอบ
                </h2>
                <div className="flex gap-3 mb-5">
                  <ReportBadge
                    icon={<Clock className="w-3.5 h-3.5" />}
                    label="รอดำเนินการ"
                    count={data.questionReports.byStatus.pending}
                    color="bg-red-50 text-red-600 border-red-100"
                  />
                  <ReportBadge
                    icon={<Clock className="w-3.5 h-3.5" />}
                    label="กำลังดำเนินการ"
                    count={data.questionReports.byStatus.in_progress}
                    color="bg-amber-50 text-amber-600 border-amber-100"
                  />
                  <ReportBadge
                    icon={<CheckCircle className="w-3.5 h-3.5" />}
                    label="แก้ไขแล้ว"
                    count={data.questionReports.byStatus.resolved}
                    color="bg-emerald-50 text-emerald-600 border-emerald-100"
                  />
                </div>
                {data.questionReports.trend.length > 0 ? (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">แนวโน้ม 30 วัน</p>
                    <div className="flex items-end gap-1 h-12">
                      {data.questionReports.trend.map((w) => {
                        const maxW = Math.max(...data.questionReports.trend.map((t) => t.count), 1);
                        const h = Math.max(4, Math.round((w.count / maxW) * 48));
                        return (
                          <div
                            key={w.week}
                            className="flex-1 bg-slate-200 rounded-t-sm hover:bg-slate-300 transition-colors"
                            style={{ height: `${h}px` }}
                            title={`${w.week}: ${w.count} รายงาน`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">ยังไม่มีรายงาน</p>
                )}
              </div>
            </div>

            {/* ─── Row: Question Analytics + Flashcard Stats ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <QuestionAnalytics
                correctRateByType={data.questionAnalytics.correctRateByType}
                hardestQuestions={data.questionAnalytics.hardestQuestions}
              />
              <FlashcardStats {...data.flashcardStats} />
            </div>

            {/* ─── Top Performers ─── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                ผู้ใช้ที่มีคะแนนสูงสุด (ทดสอบ ≥ 3 ครั้ง)
              </h2>
              {data.topPerformers.length === 0 ? (
                <p className="text-slate-500 text-sm">ยังไม่มีข้อมูล</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left text-xs font-semibold text-slate-400 pb-3 pr-4">#</th>
                        <th className="text-left text-xs font-semibold text-slate-400 pb-3 pr-4">ผู้ใช้</th>
                        <th className="text-right text-xs font-semibold text-slate-400 pb-3 pr-4">ครั้ง</th>
                        <th className="text-right text-xs font-semibold text-slate-400 pb-3 pr-4">เฉลี่ย</th>
                        <th className="text-right text-xs font-semibold text-slate-400 pb-3">CEFR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topPerformers.map((p, i) => {
                        const cefr = estimateCefrLevel(p.avgScore);
                        return (
                          <tr key={p.userId} className="border-b border-slate-50 last:border-0">
                            <td className="py-3 pr-4">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                                i === 0 ? 'bg-amber-100 text-amber-600' :
                                i === 1 ? 'bg-slate-100 text-slate-600' :
                                i === 2 ? 'bg-orange-100 text-orange-600' :
                                'bg-slate-50 text-slate-500'
                              }`}>
                                {i + 1}
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-3">
                                {p.user?.image ? (
                                  <Image src={p.user.image} alt={p.user?.name ?? 'User'} width={36} height={36} className="rounded-full object-cover" />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                                    {(p.user?.name ?? p.user?.email ?? '?')[0].toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 truncate">{p.user?.name ?? '—'}</p>
                                  <p className="text-xs text-slate-500 truncate">{p.user?.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-right text-sm text-slate-500">{p.attempts}</td>
                            <td className="py-3 pr-4 text-right">
                              <span className={`font-bold text-lg ${
                                p.avgScore >= 70 ? 'text-emerald-600' :
                                p.avgScore >= 50 ? 'text-amber-600' : 'text-red-500'
                              }`}>
                                {p.avgScore}%
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <div
                                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-xs font-bold text-white"
                                style={{ backgroundColor: CEFR_COLORS[cefr] }}
                              >
                                {cefr}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon, bg, label, value, highlight,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${bg} p-3 rounded-xl`}>{icon}</div>
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${highlight ? 'text-emerald-600' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function RetentionCard({
  icon, label, value, sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value.toLocaleString()}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

function ReportBadge({
  icon, label, count, color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border ${color}`}>
      {icon}
      <span className="text-lg font-bold">{count}</span>
      <span className="text-[10px] font-medium text-center leading-tight">{label}</span>
    </div>
  );
}