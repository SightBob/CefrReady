'use client';

import { AlertTriangle, CheckCircle, MinusCircle } from 'lucide-react';
import type { CefrLevel } from '@/lib/full-test/constants';

const CEFR_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const TYPE_COLORS: Record<string, string> = {
  'focus-form': '#3B82F6',
  'focus-meaning': '#10B981',
  'form-meaning': '#8B5CF6',
  listening: '#F97316',
};

const THRESHOLDS: Record<string, { low: number; good: number }> = {
  'focus-form':    { low: 5, good: 10 },
  'focus-meaning': { low: 5, good: 10 },
  'form-meaning':  { low: 2, good: 4 },
  'listening':     { low: 5, good: 10 },
};

function cellColor(count: number, testTypeId: string): string {
  const t = THRESHOLDS[testTypeId] ?? { low: 5, good: 10 };
  if (count === 0) return 'bg-red-100 text-red-700';
  if (count < t.low) return 'bg-red-50 text-red-600';
  if (count < t.good) return 'bg-amber-50 text-amber-600';
  return 'bg-emerald-50 text-emerald-600';
}

function cellIcon(count: number, testTypeId: string) {
  const t = THRESHOLDS[testTypeId] ?? { low: 5, good: 10 };
  if (count === 0) return <MinusCircle className="w-3 h-3" />;
  if (count < t.low) return <AlertTriangle className="w-3 h-3" />;
  if (count < t.good) return null;
  return <CheckCircle className="w-3 h-3" />;
}

interface CoverageRow {
  testTypeId: string;
  testTypeName: string;
  counts: Record<CefrLevel, number>;
  total: number;
  levelsAtRisk: CefrLevel[];
}

export function QuestionPoolCoverageMatrix({
  coverageMatrix,
}: {
  coverageMatrix: CoverageRow[];
}) {
  const riskCount = coverageMatrix.reduce(
    (sum, row) => sum + row.levelsAtRisk.length,
    0,
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800">
          Question Pool Coverage
        </h2>
        {riskCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" />
            {riskCount} ช่องเสี่ยง
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 pr-4 text-slate-500 font-medium">
                Type
              </th>
              {CEFR_LEVELS.map((level) => (
                <th
                  key={level}
                  className="text-center py-2 px-2 text-slate-500 font-medium min-w-[60px]"
                >
                  {level}
                </th>
              ))}
              <th className="text-center py-2 px-2 text-slate-500 font-medium">
                รวม
              </th>
            </tr>
          </thead>
          <tbody>
            {coverageMatrix.map((row) => (
              <tr
                key={row.testTypeId}
                className="border-b border-slate-50 last:border-0"
              >
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          TYPE_COLORS[row.testTypeId] ?? '#94A3B8',
                      }}
                    />
                    <span className="font-medium text-slate-700">
                      {row.testTypeName}
                    </span>
                  </div>
                </td>
                {CEFR_LEVELS.map((level) => {
                  const c = row.counts[level];
                  return (
                    <td key={level} className="text-center py-2.5 px-2">
                      <div
                        className={`inline-flex items-center justify-center gap-1 min-w-[40px] px-2 py-1 rounded-lg text-xs font-semibold ${cellColor(c, row.testTypeId)}`}
                      >
                        {cellIcon(c, row.testTypeId)}
                        {c}
                      </div>
                    </td>
                  );
                })}
                <td className="text-center py-2.5 px-2">
                  <span className="font-bold text-slate-700">{row.total}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <div className="w-3 h-3 rounded bg-red-50 border border-red-200" />
          ต่ำกว่าขั้นต่ำ
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <div className="w-3 h-3 rounded bg-amber-50 border border-amber-200" />
          พอใช้
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <div className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200" />
          สบาย
        </div>
      </div>
    </div>
  );
}
