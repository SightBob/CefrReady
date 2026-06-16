'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { CefrLevel } from '@/lib/full-test/constants';

const CEFR_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const CEFR_COLORS: Record<string, string> = {
  A1: '#EF4444',
  A2: '#F97316',
  B1: '#EAB308',
  B2: '#22C55E',
  C1: '#3B82F6',
  C2: '#8B5CF6',
};

const TYPE_COLORS: Record<string, string> = {
  'focus-form': '#3B82F6',
  'focus-meaning': '#10B981',
  'form-meaning': '#8B5CF6',
  listening: '#F97316',
};

interface ReachedRow {
  testTypeId: string;
  testTypeName: string;
  counts: Record<CefrLevel, number>;
  total: number;
}

interface CoverageRow {
  testTypeId: string;
  counts: Record<CefrLevel, number>;
}

function CustomTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-md px-4 py-3 text-sm">
      <p className="font-semibold text-slate-800">{d.level}</p>
      <p className="text-slate-500">
        User ถึง: <span className="font-bold text-slate-800">{d.users}</span>
      </p>
      <p className="text-slate-500">
        Pool: <span className="font-bold text-slate-800">{d.pool}</span> ข้อ
      </p>
    </div>
  );
}

export function ReachedLevelChart({
  reachedLevelDistribution,
  coverageMatrix,
}: {
  reachedLevelDistribution: ReachedRow[];
  coverageMatrix: CoverageRow[];
}) {
  const hasData = reachedLevelDistribution.some((r) => r.total > 0);

  const coverageMap = new Map(coverageMatrix.map((c) => [c.testTypeId, c.counts]));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          ระดับ CEFR ที่ User ถึงจริง
        </h2>
      </div>

      {!hasData ? (
        <p className="text-slate-500 text-sm py-8 text-center">
          ยังไม่มีข้อมูล (รอ user ทำ test เสร็จ)
        </p>
      ) : (
        <div className="space-y-6">
          {reachedLevelDistribution.map((row) => {
            const poolCounts = coverageMap.get(row.testTypeId);
            const chartData = CEFR_LEVELS.map((level) => ({
              level,
              users: row.counts[level] ?? 0,
              pool: poolCounts?.[level] ?? 0,
            }));

            return (
              <div key={row.testTypeId}>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        TYPE_COLORS[row.testTypeId] ?? '#94A3B8',
                    }}
                  />
                  <span className="text-sm font-medium text-slate-700">
                    {row.testTypeName}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({row.total} attempts)
                  </span>
                </div>
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 5, right: 10, bottom: 5, left: -10 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#F0F0F0"
                      />
                      <XAxis
                        dataKey="level"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94A3B8', fontSize: 11 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94A3B8', fontSize: 11 }}
                        allowDecimals={false}
                      />
                      <Tooltip content={CustomTooltip} />
                      <Legend
                        formatter={(value: string) => (
                          <span className="text-xs text-slate-600">
                            {value === 'users' ? 'User ถึง' : 'Pool'}
                          </span>
                        )}
                      />
                      <Bar
                        dataKey="users"
                        fill={TYPE_COLORS[row.testTypeId] ?? '#94A3B8'}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                        opacity={0.85}
                      />
                      <Bar
                        dataKey="pool"
                        fill="#CBD5E1"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
