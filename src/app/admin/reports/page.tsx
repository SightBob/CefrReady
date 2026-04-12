'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, BarChart3, Users, Target, TrendingUp,
  Award, Loader2, RefreshCw, Download
} from 'lucide-react';

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
}

const BUCKET_ORDER = ['Below 50%', '50–69%', '70–89%', '90–100%'];
const BUCKET_COLORS: Record<string, string> = {
  'Below 50%': 'bg-red-400',
  '50–69%': 'bg-amber-400',
  '70–89%': 'bg-emerald-400',
  '90–100%': 'bg-blue-500',
};
const TYPE_COLORS: Record<string, string> = {
  'focus-form': 'bg-blue-500',
  'focus-meaning': 'bg-emerald-500',
  'form-meaning': 'bg-purple-500',
  listening: 'bg-orange-500',
};

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

  // Bar chart: max value for relative widths
  const maxAttempts = Math.max(...(data?.attemptsByType.map((t) => t.attempts) ?? [1]), 1);
  const maxDaily = Math.max(...(data?.attemptsOverTime.map((d) => d.attempts) ?? [1]), 1);
  const totalDistribution = data?.scoreDistribution.reduce((s, b) => s + b.count, 0) ?? 0;

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
          <div className="text-center py-20 text-slate-400">ไม่สามารถโหลดข้อมูลได้</div>
        ) : (
          <div className="space-y-6">

            {/* Overview Cards */}
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

            {/* Row: Attempts by Type + Score Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Attempts by type */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-5">การทดสอบแต่ละประเภท</h2>
                {data.attemptsByType.length === 0 ? (
                  <p className="text-slate-400 text-sm">ยังไม่มีข้อมูล</p>
                ) : (
                  <div className="space-y-4">
                    {data.attemptsByType.map((t) => (
                      <div key={t.testTypeId}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-slate-700">{t.testTypeName}</span>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-slate-400">{t.attempts} ครั้ง</span>
                            <span className={`font-semibold ${t.avgScore >= 70 ? 'text-emerald-600' : t.avgScore >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
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
                  <p className="text-slate-400 text-sm">ยังไม่มีข้อมูล</p>
                ) : (
                  <div className="space-y-4">
                    {BUCKET_ORDER.map((bucket) => {
                      const found = data.scoreDistribution.find((b) => b.bucket === bucket);
                      const cnt = found?.count ?? 0;
                      const pct = totalDistribution > 0 ? Math.round((cnt / totalDistribution) * 100) : 0;
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

            {/* Activity over time */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-5">กิจกรรม 30 วันล่าสุด</h2>
              {data.attemptsOverTime.length === 0 ? (
                <p className="text-slate-400 text-sm">ไม่มีกิจกรรมใน 30 วันที่ผ่านมา</p>
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
                          <span className="text-[9px] text-slate-400 transform -rotate-45 origin-top-right w-8 whitespace-nowrap mt-1">
                            {d.date.slice(5)}
                          </span>
                          {/* Tooltip */}
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {d.attempts} ครั้ง
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 text-right">สีแสดงคะแนนเฉลี่ย: 🟢≥70% 🟡50-69% 🔴&lt;50%</p>
                </div>
              )}
            </div>

            {/* Top Performers */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                ผู้ใช้ที่มีคะแนนสูงสุด (ทดสอบ ≥ 3 ครั้ง)
              </h2>
              {data.topPerformers.length === 0 ? (
                <p className="text-slate-400 text-sm">ยังไม่มีข้อมูล</p>
              ) : (
                <div className="space-y-3">
                  {data.topPerformers.map((p, i) => (
                    <div key={p.userId} className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0">
                      {/* Rank */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        i === 0 ? 'bg-amber-100 text-amber-600' :
                        i === 1 ? 'bg-slate-100 text-slate-600' :
                        i === 2 ? 'bg-orange-100 text-orange-600' :
                        'bg-slate-50 text-slate-400'
                      }`}>
                        {i + 1}
                      </div>
                      {/* Avatar */}
                      {p.user?.image ? (
                        <img src={p.user.image} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {(p.user?.name ?? p.user?.email ?? '?')[0].toUpperCase()}
                        </div>
                      )}
                      {/* Name/email */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{p.user?.name ?? '—'}</p>
                        <p className="text-xs text-slate-400 truncate">{p.user?.email}</p>
                      </div>
                      {/* Stats */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-emerald-600">{p.avgScore}%</p>
                        <p className="text-xs text-slate-400">{p.attempts} ครั้ง</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

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
