'use client';

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { Sparkle, TrendingDown, CalendarCheck, Sticker } from 'lucide-react';

const STATUS_COLORS = ['#F59E0B', '#3B82F6', '#10B981'];
const STATUS_LABELS = ['ใหม่', 'กำลังเรียน', 'จำได้แล้ว'];
const STATUS_KEYS = ['newCards', 'learningCards', 'masteredCards'] as const;

function CustomPieTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-md px-4 py-3 text-sm">
      <p className="font-semibold text-slate-800">{d.name}</p>
      <p className="text-slate-500">{d.value} การ์ด</p>
    </div>
  );
}

export function FlashcardStats({
  total, newCards, learningCards, masteredCards, avgEase, dueToday,
}: {
  total: number;
  newCards: number;
  learningCards: number;
  masteredCards: number;
  avgEase: number;
  dueToday: number;
}) {
  const data = [
    { name: 'ใหม่', value: newCards },
    { name: 'กำลังเรียน', value: learningCards },
    { name: 'จำได้แล้ว', value: masteredCards },
  ].filter((d) => d.value > 0);

  const masteryPct = total > 0 ? Math.round((masteredCards / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-5">
        <Sticker className="w-5 h-5 text-purple-500" />
        Flashcards
      </h2>

      {total === 0 ? (
        <p className="text-slate-500 text-sm py-8 text-center">ยังไม่มีการ์ดศัพท์</p>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Donut chart */}
          <div className="relative">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={STATUS_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip content={CustomPieTooltip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-slate-800">{total}</span>
              <span className="text-xs text-slate-400">การ์ดทั้งหมด</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-4">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[i] }}
                />
                <span className="text-xs text-slate-500">{d.name}</span>
                <span className="text-xs font-semibold text-slate-700">{d.value}</span>
              </div>
            ))}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <Sparkle className="w-4 h-4 text-purple-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-purple-700">{newCards}</p>
              <p className="text-[10px] text-purple-500">การ์ดใหม่</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <TrendingDown className="w-4 h-4 text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-blue-700">{avgEase.toFixed(2)}</p>
              <p className="text-[10px] text-blue-500">Ease เฉลี่ย</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <CalendarCheck className="w-4 h-4 text-orange-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-orange-700">{dueToday}</p>
              <p className="text-[10px] text-orange-500">ต้องทบทวนวันนี้</p>
            </div>
          </div>

          {/* Mastery progress */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-500">ความสำเร็จ</span>
              <span className="font-semibold text-emerald-600">{masteryPct}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all"
                style={{ width: `${masteryPct}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
