'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Coins, Gauge, ListChecks, Loader2, ShieldAlert, Sparkles } from 'lucide-react';

type PerUserRow = {
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  lastUsedAt: string | null;
};

type UsageData = {
  window: string;
  summary: {
    totalRequests: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    errorCount: number;
    latencyAvgMs: number;
  };
  perUser: PerUserRow[];
};

const WINDOW_OPTIONS = [
  { key: '7d', label: '7 วัน' },
  { key: '30d', label: '30 วัน' },
  { key: 'all', label: 'ทั้งหมด' },
] as const;

const numberFormat = new Intl.NumberFormat('th-TH');
const dateFormat = new Intl.DateTimeFormat('th-TH', { dateStyle: 'short', timeStyle: 'short' });

const formatTokens = (value: number) => (value >= 1000 ? `${numberFormat.format(Math.round(value / 100) / 10)}K` : numberFormat.format(value));

const formatLastUsed = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormat.format(date);
};

export default function AdminAiUsagePage() {
  const [window, setWindow] = useState<(typeof WINDOW_OPTIONS)[number]['key']>('7d');
  const [data, setData] = useState<UsageData | null>(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (selected: typeof window) => {
    setLoading(true);
    setNotice('');
    try {
      const response = await fetch(`/api/admin/ai-usage?window=${selected}`);
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'โหลดข้อมูลไม่สำเร็จ');
      setData(body.data as UsageData);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(window); }, [load, window]);

  const cards = data ? [
    { icon: ListChecks, label: 'Request ทั้งหมด', value: numberFormat.format(data.summary.totalRequests), hint: `เฉลี่ย ${numberFormat.format(data.summary.latencyAvgMs)} ms/ครั้ง` },
    { icon: Coins, label: 'Token ทั้งหมด', value: numberFormat.format(data.summary.totalTokens), hint: `prompt ${formatTokens(data.summary.promptTokens)} · completion ${formatTokens(data.summary.completionTokens)}` },
    { icon: Gauge, label: 'Token เฉลี่ยต่อ request', value: data.summary.totalRequests > 0 ? numberFormat.format(Math.round(data.summary.totalTokens / data.summary.totalRequests)) : '0', hint: 'รวม prompt + completion' },
    { icon: ShieldAlert, label: 'Error', value: numberFormat.format(data.summary.errorCount), hint: data.summary.totalRequests > 0 ? `${Math.round((data.summary.errorCount / data.summary.totalRequests) * 100)}% ของ request` : '—' },
  ] : [];

  const inputClass = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500';

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-[1049px] px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/admin" aria-label="กลับหน้า admin" className="grid min-h-11 min-w-11 place-items-center text-slate-500"><ArrowLeft /></Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Sparkles className="shrink-0 text-primary-600" /> การใช้ AI</h1>
            <p className="mt-1 text-sm text-slate-500">OpenRouter · token และ request รายบุคคล (เริ่มนับตั้งแต่เปิดระบบบันทึก)</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="เลือกช่วงเวลา">
          {WINDOW_OPTIONS.map(option => (
            <button
              key={option.key}
              type="button"
              onClick={() => setWindow(option.key)}
              aria-pressed={window === option.key}
              className={`min-h-9 rounded-lg border px-4 text-sm font-semibold transition-colors ${window === option.key ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {notice && <p role="status" className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{notice}</p>}
        {loading && <p className="mb-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> กำลังโหลด…</p>}

        {data && (
          <>
            <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="สรุปการใช้ AI">
              {cards.map(card => (
                <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="flex items-center gap-2 text-sm text-slate-500"><card.icon className="size-4 shrink-0 text-primary-600" /> {card.label}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{card.hint}</p>
                </div>
              ))}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="การใช้ AI รายบุคคล">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <th scope="col" className="px-4 py-3 font-semibold">ผู้ใช้</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Requests</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Prompt tokens</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Completion tokens</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Token รวม</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">ใช้ล่าสุด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.perUser.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">ยังไม่มีข้อมูลการใช้ AI ในช่วงนี้</td></tr>
                    )}
                    {data.perUser.map(row => (
                      <tr key={row.userId ?? row.userEmail ?? 'unknown'} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{row.userName || 'ไม่ทราบชื่อ'}</p>
                          <p className="text-xs text-slate-400">{row.userEmail || row.userId || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">{numberFormat.format(row.requests)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">{numberFormat.format(row.promptTokens)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">{numberFormat.format(row.completionTokens)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">{numberFormat.format(row.totalTokens)}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{formatLastUsed(row.lastUsedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
