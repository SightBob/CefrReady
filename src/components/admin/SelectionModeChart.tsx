'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { AlertTriangle } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  'focus-form': '#3B82F6',
  'focus-meaning': '#10B981',
  'form-meaning': '#8B5CF6',
  listening: '#F97316',
};

const MODE_COLORS: Record<string, string> = {
  exact: '#22C55E',
  fallback: '#F59E0B',
  reuse: '#EF4444',
};

interface SelectionBucket {
  testTypeId: string;
  exact: number;
  fallback: number;
  reuse: number;
  total: number;
}

function CustomTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const pct = (n: number) =>
    d.total > 0 ? Math.round((n / d.total) * 100) : 0;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-md px-4 py-3 text-sm">
      <p className="font-semibold text-slate-800 mb-1">{d.testTypeName}</p>
      <div className="space-y-0.5">
        <p className="text-emerald-600">
          Exact: {d.exact} ({pct(d.exact)}%)
        </p>
        <p className="text-amber-500">
          Fallback: {d.fallback} ({pct(d.fallback)}%)
        </p>
        <p className="text-red-500">
          Reuse: {d.reuse} ({pct(d.reuse)}%)
        </p>
      </div>
      <p className="text-slate-400 text-xs mt-1">รวม {d.total} ครั้ง</p>
    </div>
  );
}

export function SelectionModeChart({
  last30Days,
  allTime,
  testTypeNames,
}: {
  last30Days: SelectionBucket[];
  allTime: SelectionBucket[];
  testTypeNames: Record<string, string>;
}) {
  const hasData = allTime.length > 0 && allTime.some((b) => b.total > 0);
  const reuseWarning = last30Days.some(
    (b) => b.total > 0 && b.reuse / b.total > 0.1,
  );
  const fallbackWarning = last30Days.some(
    (b) => b.total > 0 && b.fallback / b.total > 0.2,
  );

  const chartData = last30Days.length > 0
    ? last30Days
    : allTime;

  const displayData = chartData.map((b) => ({
    ...b,
    testTypeName: testTypeNames[b.testTypeId] ?? b.testTypeId,
  }));

  const periodLabel = last30Days.length > 0 ? '30 วันล่าสุด' : 'ทั้งหมด';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800">
          Fallback / Reuse Rate
        </h2>
        {(reuseWarning || fallbackWarning) && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 text-xs font-semibold rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" />
            {reuseWarning && 'Reuse > 10%'}
            {reuseWarning && fallbackWarning && ' + '}
            {fallbackWarning && 'Fallback > 20%'}
          </span>
        )}
      </div>

      {!hasData ? (
        <p className="text-slate-500 text-sm py-8 text-center">
          ยังไม่มีข้อมูล selection log (เริ่มเก็บหลัง deploy โค้ดใหม่)
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">{periodLabel}</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={displayData}
                margin={{ top: 5, right: 10, bottom: 5, left: -10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#F0F0F0"
                />
                <XAxis
                  dataKey="testTypeName"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                />
                <Tooltip content={CustomTooltip} />
                <Legend
                  formatter={(value: string) => (
                    <span className="text-xs text-slate-600">{value}</span>
                  )}
                />
                <Bar
                  dataKey="exact"
                  stackId="a"
                  fill={MODE_COLORS.exact}
                  radius={[0, 0, 0, 0]}
                  maxBarSize={48}
                />
                <Bar
                  dataKey="fallback"
                  stackId="a"
                  fill={MODE_COLORS.fallback}
                  maxBarSize={48}
                />
                <Bar
                  dataKey="reuse"
                  stackId="a"
                  fill={MODE_COLORS.reuse}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {allTime.length > 0 && (
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
              {(['exact', 'fallback', 'reuse'] as const).map((mode) => {
                const total = allTime.reduce((s, b) => s + b[mode], 0);
                const grandTotal = allTime.reduce((s, b) => s + b.total, 0);
                const pct = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0;
                return (
                  <div key={mode} className="text-center">
                    <div
                      className="w-3 h-3 rounded-full mx-auto mb-1"
                      style={{ backgroundColor: MODE_COLORS[mode] }}
                    />
                    <p className="text-xs text-slate-500 capitalize">{mode}</p>
                    <p className="text-lg font-bold text-slate-800">
                      {pct}%
                    </p>
                    <p className="text-xs text-slate-400">{total} ครั้ง</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
