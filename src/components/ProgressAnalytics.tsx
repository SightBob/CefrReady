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

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_SKILLS: Record<string, { label: string; sectionHref: string }> = {
  'focus-form':    { label: 'Focus Form',    sectionHref: '/tests/focus-form' },
  'focus-meaning': { label: 'Focus Meaning', sectionHref: '/tests/focus-meaning' },
  'form-meaning':  { label: 'Form Meaning',  sectionHref: '/tests/form-meaning' },
  'listening':     { label: 'Listening',     sectionHref: '/tests/listening' },
};

const SKILL_TIPS: Record<string, string> = {
  'focus-form':
    'ไวยากรณ์คือรากฐาน ลองทบทวนบทความ Grammar Must-Know แล้วทำชุดนี้ซ้ำครับ',
  'focus-meaning':
    'สะสมคำศัพท์และฝึกตีความประโยค ด้วยการอ่านบทความ CEFR ทุกวันครับ',
  'form-meaning':
    'โจทย์ผสมต้องการทั้งไวยากรณ์และความหมาย ลองทำ Focus Form กับ Focus Meaning ก่อนครับ',
  'listening':
    'ฝึกฟังบ่อยๆ ในบริบทธรรมชาติ เช่น Podcast ภาษาอังกฤษ 10 นาทีต่อวันครับ',
};

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomLineTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-[#EAEAEA] rounded-xl shadow-md px-4 py-3 text-sm min-w-[160px]">
      <p className="font-semibold text-[#111] mb-1">{d.type}</p>
      <p className="text-[#787774]">คะแนน: <span className="font-bold text-[#111]">{d.score}%</span></p>
      <p className="text-[#787774] text-xs mt-1">{d.date}</p>
    </div>
  );
}

// ─── Skill Radar Chart ─────────────────────────────────────────────────────────
export function SkillRadarChart({ data }: { data: CategoryData[] }) {
  const formattedData = Object.keys(BASE_SKILLS).map(key => {
    const match = data.find(d => d.testTypeId === key);
    return {
      subject: BASE_SKILLS[key].label,
      score: match ? match.averageScore : 0,
      fullMark: 100,
    };
  });

  // Append any unknown test types
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
            formatter={(val) => [`${val ?? 0}%`, 'คะแนนเฉลี่ย'] as [string, string]}
          />
        </RadarChart>
      </ResponsiveContainer>
      {!hasData && (
        <p className="text-center text-xs text-[#AAAAAA] -mt-4">ทำข้อสอบอย่างน้อย 1 ครั้ง เพื่อดูกราฟทักษะของคุณ</p>
      )}
    </div>
  );
}

// ─── History Area Chart ────────────────────────────────────────────────────────
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

  // Calculate trend
  const trend = data.length >= 2 ? data[data.length - 1].score - data[0].score : 0;
  const trendText = trend > 0 ? `↑ ดีขึ้น ${trend}%` : trend < 0 ? `↓ ลดลง ${Math.abs(trend)}%` : '→ ทรงตัว';
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
            <Tooltip content={<CustomLineTooltip />} />
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

// ─── Smart Insights ────────────────────────────────────────────────────────────
export function SmartInsights({ data }: { data: CategoryData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-4 bg-[#F9F9F8] rounded-2xl border border-[#EAEAEA]">
        <div className="text-4xl">📊</div>
        <div>
          <p className="font-semibold text-[#111] mb-1">ยังไม่มีข้อมูลเพียงพอ</p>
          <p className="text-sm text-[#787774]">ทำข้อสอบอย่างน้อย 1 ครั้งเพื่อดู Smart Insights ของคุณ</p>
        </div>
        <Link href="/tests" className="text-xs font-semibold border border-[#111] text-[#111] rounded-full px-4 py-1.5 hover:bg-[#111] hover:text-white transition-colors">
          เริ่มทำข้อสอบ →
        </Link>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => a.averageScore - b.averageScore);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];
  const weakestHref = BASE_SKILLS[weakest.testTypeId]?.sectionHref || '/tests';
  const strongestLabel = BASE_SKILLS[strongest.testTypeId]?.label || strongest.testTypeId;
  const weakestLabel = BASE_SKILLS[weakest.testTypeId]?.label || weakest.testTypeId;
  const tip = SKILL_TIPS[weakest.testTypeId] || 'ฝึกฝนอย่างสม่ำเสมอในจุดที่ยังพลาดอยู่ เพื่ออัปเลเวลให้เร็วยิ่งขึ้นครับ';

  // Score bar colors
  const getBar = (score: number) => {
    if (score >= 70) return 'bg-emerald-400';
    if (score >= 50) return 'bg-amber-400';
    return 'bg-red-400';
  };

  return (
    <div className="space-y-3">
      {/* Score summary for each skill taken */}
      <div className="space-y-2.5">
        {sorted.slice().reverse().map(cat => {
          const label = BASE_SKILLS[cat.testTypeId]?.label ?? cat.testTypeId;
          return (
            <div key={cat.testTypeId}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-[#333]">{label}</span>
                <span className="font-bold text-[#111]">{cat.averageScore}%</span>
              </div>
              <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                <div
                  className={`h-full ${getBar(cat.averageScore)} rounded-full transition-all duration-700`}
                  style={{ width: `${cat.averageScore}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Strongest */}
      <div className="p-4 rounded-2xl border border-[#EAEAEA] bg-[#F7F6F3] mt-1">
        <div className="flex gap-3">
          <span className="shrink-0 text-xl">🌟</span>
          <div>
            <p className="font-bold text-[#111] text-xs uppercase tracking-widest mb-0.5">จุดแข็ง</p>
            <p className="font-semibold text-[#111] text-base leading-snug">{strongestLabel}</p>
            <p className="text-xs text-[#787774] mt-0.5">คะแนนเฉลี่ย {strongest.averageScore}% — ยอดเยี่ยมมาก 🎉</p>
          </div>
        </div>
      </div>

      {/* Weakest + CTA */}
      <div className="p-4 rounded-2xl border border-[#EAEAEA] bg-white">
        <div className="flex gap-3">
          <span className="shrink-0 text-xl">🎯</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#111] text-xs uppercase tracking-widest mb-0.5">ควรพัฒนา</p>
            <p className="font-semibold text-[#111] text-base leading-snug">{weakestLabel}</p>
            <p className="text-xs text-[#787774] mt-0.5 mb-3">{tip}</p>
            <Link
              href={weakestHref}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#111] text-white rounded-full px-3.5 py-1.5 hover:bg-[#333] transition-colors"
            >
              ฝึกทักษะนี้เลย →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
