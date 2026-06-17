'use client';

import Link from 'next/link';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';

interface CategoryData {
  testTypeId: string;
  averageScore: number;
  testsTaken: number;
}

interface AttemptData {
  id: number;
  testTypeId: string;
  testTypeName: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  completedAt: string;
}

const BASE_SKILLS: Record<string, { label: string; sectionHref: string }> = {
  'focus-form':    { label: 'Focus Form',    sectionHref: '/tests/focus-form' },
  'focus-meaning': { label: 'Focus Meaning', sectionHref: '/tests/focus-meaning' },
  'form-meaning':  { label: 'Form Meaning',  sectionHref: '/tests/form-meaning' },
  'listening':     { label: 'Listening',     sectionHref: '/tests/listening' },
  'full-test':     { label: 'Full Mock Exam', sectionHref: '/tests/full' },
};

function CustomLineTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-[#EAEAEA] rounded-xl shadow-md px-4 py-3 text-sm min-w-[160px]">
      <p className="font-semibold text-[#111] mb-1">{d.type}</p>
      <p className="text-[#787774]">คะแนน: <span className="font-bold text-[#111]">{Number(d.score).toFixed(2)}%</span></p>
      <p className="text-[#787774] text-xs mt-1">{d.date}</p>
    </div>
  );
}

export function SkillRadarChart({ data }: { data: CategoryData[] }) {
  const formattedData = Object.keys(BASE_SKILLS).map(key => {
    const match = data.find(d => d.testTypeId === key);
    return {
      subject: BASE_SKILLS[key].label,
      score: match ? match.averageScore : 0,
      fullMark: 100,
    };
  });

  data.forEach(d => {
    if (!BASE_SKILLS[d.testTypeId]) {
      formattedData.push({
        subject: d.testTypeId.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        score: d.averageScore,
        fullMark: 100,
      });
    }
  });

  const hasData = data.length > 0;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={formattedData}>
          <PolarGrid stroke="#EAEAEA" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#787774', fontSize: 11, fontWeight: 500 }}
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Score"
            dataKey="score"
            stroke={hasData ? '#111111' : '#CCCCCC'}
            fill={hasData ? '#111111' : '#E5E5E5'}
            fillOpacity={hasData ? 0.15 : 0.1}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{ borderRadius: '10px', border: '1px solid #EAEAEA', boxShadow: '0 4px 12px rgb(0 0 0 / 0.06)' }}
            formatter={(val) => [`${Number(val ?? 0).toFixed(2)}%`, 'คะแนนเฉลี่ย'] as [string, string]}
          />
        </RadarChart>
      </ResponsiveContainer>
      {!hasData && (
        <p className="text-center text-xs text-[#AAAAAA] -mt-4">ทำข้อสอบอย่างน้อย 1 ครั้ง เพื่อดูกราฟทักษะของคุณ</p>
      )}
    </div>
  );
}

export function HistoryLineChart({ attempts }: { attempts: AttemptData[] }) {
  if (attempts.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3">
        <p className="text-[#AAAAAA] text-sm">ยังไม่มีประวัติการทำข้อสอบ</p>
        <Link href="/tests" className="text-xs font-semibold border border-[#111] text-[#111] rounded-full px-4 py-1.5 hover:bg-[#111] hover:text-white transition-colors">
          เริ่มทำข้อสอบ →
        </Link>
      </div>
    );
  }

  const data = [...attempts].reverse().map((a) => ({
    attempt: new Date(a.completedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
    score: a.score,
    type: a.testTypeName,
    date: new Date(a.completedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }),
  }));

  const trend = data.length >= 2 ? data[data.length - 1].score - data[0].score : 0;
  const trendText = trend > 0 ? `↑ ดีขึ้น ${trend.toFixed(2)}%` : trend < 0 ? `↓ ลดลง ${Math.abs(trend).toFixed(2)}%` : '→ ทรงตัว';
  const trendColor = trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-slate-400';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[#787774]">{data.length} ครั้งล่าสุด</p>
        {data.length >= 2 && (
          <span className={`text-xs font-semibold ${trendColor}`}>{trendText}</span>
        )}
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="10%" stopColor="#111111" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#111111" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
            <XAxis
              dataKey="attempt"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#AAAAAA', fontSize: 11 }}
              dy={8}
            />
            <YAxis
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#AAAAAA', fontSize: 11 }}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip content={CustomLineTooltip} />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#111111"
              strokeWidth={2.5}
              fill="url(#scoreGrad)"
              dot={{ r: 4, fill: '#fff', stroke: '#111111', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#111111', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}