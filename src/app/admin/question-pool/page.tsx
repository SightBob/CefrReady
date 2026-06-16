'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, RefreshCw, Database } from 'lucide-react';
import { QuestionPoolCoverageMatrix } from '@/components/admin/QuestionPoolCoverageMatrix';
import { SelectionModeChart } from '@/components/admin/SelectionModeChart';
import { ReachedLevelChart } from '@/components/admin/ReachedLevelChart';
import type { CefrLevel } from '@/lib/full-test/constants';

interface QuestionPoolData {
  testTypes: Array<{ id: string; name: string; color: string | null; icon: string | null }>;
  coverageMatrix: Array<{
    testTypeId: string;
    testTypeName: string;
    counts: Record<CefrLevel, number>;
    total: number;
    levelsAtRisk: CefrLevel[];
  }>;
  selectionStats: {
    last30Days: Array<{
      testTypeId: string;
      exact: number;
      fallback: number;
      reuse: number;
      total: number;
    }>;
    allTime: Array<{
      testTypeId: string;
      exact: number;
      fallback: number;
      reuse: number;
      total: number;
    }>;
  };
  reachedLevelDistribution: Array<{
    testTypeId: string;
    testTypeName: string;
    counts: Record<CefrLevel, number>;
    total: number;
  }>;
}

export default function QuestionPoolPage() {
  const [data, setData] = useState<QuestionPoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/question-pool');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch question pool data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const testTypeNames: Record<string, string> = {};
  if (data) {
    for (const tt of data.testTypes) {
      testTypeNames[tt.id] = tt.name;
    }
  }

  const totalQuestions =
    data?.coverageMatrix.reduce((s, r) => s + r.total, 0) ?? 0;
  const totalRiskLevels =
    data?.coverageMatrix.reduce((s, r) => s + r.levelsAtRisk.length, 0) ?? 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-3 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> กลับ Admin
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-xl">
                <Database className="w-7 h-7 text-blue-600" />
              </div>
              ภาพรวม Question Pool
            </h1>
            <p className="text-slate-500 mt-1">
              {lastUpdated
                ? `อัพเดตล่าสุด: ${lastUpdated.toLocaleTimeString('th-TH')}`
                : 'ดูการกระจายข้อสอบ ระดับ CEFR และ fallback/reuse'}
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm transition-colors text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </button>
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-slate-500">
            ไม่สามารถโหลดข้อมูลได้
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="ข้อสอบ Active ทั้งหมด"
                value={totalQuestions}
                bg="bg-blue-50"
                color="text-blue-600"
              />
              <StatCard
                label="ช่องที่เสี่ยงขาด"
                value={totalRiskLevels}
                bg="bg-red-50"
                color="text-red-600"
              />
              <StatCard
                label="Selection Logs"
                value={data.selectionStats.allTime.reduce(
                  (s, b) => s + b.total,
                  0,
                )}
                bg="bg-emerald-50"
                color="text-emerald-600"
              />
            </div>

            <QuestionPoolCoverageMatrix coverageMatrix={data.coverageMatrix} />

            <SelectionModeChart
              last30Days={data.selectionStats.last30Days}
              allTime={data.selectionStats.allTime}
              testTypeNames={testTypeNames}
            />

            <ReachedLevelChart
              reachedLevelDistribution={data.reachedLevelDistribution}
              coverageMatrix={data.coverageMatrix}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  bg,
  color,
}: {
  label: string;
  value: number;
  bg: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
