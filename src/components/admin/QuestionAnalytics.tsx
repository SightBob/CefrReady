'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { HelpCircle } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  'focus-form':    '#3B82F6',
  'focus-meaning': '#10B981',
  'form-meaning':  '#8B5CF6',
  listening:       '#F97316',
};

const TYPE_GRADIENTS: Record<string, string> = {
  'focus-form':    'from-blue-50 to-blue-100',
  'focus-meaning': 'from-emerald-50 to-emerald-100',
  'form-meaning':  'from-purple-50 to-purple-100',
  listening:       'from-orange-50 to-orange-100',
};

function HardQuestionRow({
  q,
  index,
}: {
  q: {
    questionId: number;
    questionText: string;
    testTypeId: string;
    testTypeName: string;
    wrongCount: number;
    correctRate: number;
  };
  index: number;
}) {
  const rate = q.correctRate;
  const color =
    rate < 30 ? 'text-red-500 bg-red-50' :
    rate < 60 ? 'text-amber-500 bg-amber-50' :
                'text-emerald-500 bg-emerald-50';

  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5
        ${index === 0 ? 'bg-red-100 text-red-600' :
          index === 1 ? 'bg-amber-100 text-amber-600' :
          index === 2 ? 'bg-orange-100 text-orange-600' :
          'bg-slate-100 text-slate-500'}`}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800 leading-snug line-clamp-2">{q.questionText}</p>
        <p className="text-xs text-slate-400 mt-0.5">{q.testTypeName}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
          {q.wrongCount} ผิด
        </span>
        <p className="text-xs text-slate-400 mt-1">{q.correctRate}% ถูก</p>
      </div>
    </div>
  );
}

function CustomBarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-md px-4 py-3 text-sm">
      <p className="font-semibold text-slate-800">{d.testTypeName}</p>
      <p className="text-slate-500">ถูก: <span className="font-bold text-slate-800">{d.correctRate}%</span></p>
    </div>
  );
}

export function QuestionAnalytics({
  correctRateByType,
  hardestQuestions,
}: {
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
}) {
  const [activeTab, setActiveTab] = useState<'chart' | 'hard'>('chart');

  const hasData = correctRateByType.length > 0 || hardestQuestions.length > 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-500" />
          วิเคราะห์ข้อสอบ
        </h2>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('chart')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'chart'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            กราฟ
          </button>
          <button
            onClick={() => setActiveTab('hard')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'hard'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            ข้อยากสุด
          </button>
        </div>
      </div>

      {!hasData ? (
        <p className="text-slate-500 text-sm py-8 text-center">ยังไม่มีข้อมูลคำตอบ</p>
      ) : (
        <div>
          {activeTab === 'chart' ? (
            <div className="space-y-4">
              {/* Correct rate chart */}
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={correctRateByType.map((r) => ({
                      ...r,
                      fill: TYPE_COLORS[r.testTypeId] ?? '#94A3B8',
                    }))}
                    margin={{ top: 5, right: 10, bottom: 5, left: -10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                    <XAxis
                      dataKey="testTypeName"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      dy={8}
                    />
                    <YAxis
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar
                      dataKey="correctRate"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={52}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3">
                {correctRateByType.map((r) => (
                  <div key={r.testTypeId} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: TYPE_COLORS[r.testTypeId] ?? '#94A3B8' }}
                    />
                    <span className="text-xs text-slate-600">{r.testTypeName}</span>
                    <span className="text-xs font-semibold text-slate-800">{r.correctRate}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {hardestQuestions.length === 0 ? (
                <p className="text-slate-500 text-sm py-8 text-center">ยังไม่มีข้อมูล</p>
              ) : (
                hardestQuestions.map((q, i) => (
                  <HardQuestionRow key={q.questionId} q={q} index={i} />
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
