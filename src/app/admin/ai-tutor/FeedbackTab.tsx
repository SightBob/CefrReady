'use client';

// ─── แท็บ "ความพึงพอใจ" ของ /admin/ai-tutor ─────────────────────────────────
// ตัวเลขและรายการมาจาก GET /api/admin/ai-tutor/feedback (30 วันล่าสุด)
// โหลดครั้งแรกครั้งเดียว + กด "รีเฟรช" เพื่ออ่านใหม่ (ไม่มี polling)
// เนื้อหาคำตอบที่ได้ 👎 คือจุดที่ควรปรับ system prompt — ไม่มีข้อมูลส่วนตัวของผู้เรียน
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, ThumbsDown, ThumbsUp } from 'lucide-react';

import type { AdminFeedbackResponse } from './types';

function formatNumber(value: number): string {
  return value.toLocaleString('th-TH');
}

function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FeedbackTab() {
  const [data, setData] = useState<AdminFeedbackResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setRefreshing(true);
    try {
      const response = await fetch('/api/admin/ai-tutor/feedback', { cache: 'no-store' });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success || !body?.data) {
        throw new Error(typeof body?.error === 'string' ? body.error : 'อ่านผล 👍/👎 ไม่สำเร็จ');
      }
      setData(body.data as AdminFeedbackResponse);
      setError('');
      setUpdatedAt(new Date());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'อ่านผล 👍/👎 ไม่สำเร็จ');
    } finally {
      busyRef.current = false;
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> กำลังโหลดผล 👍/👎…
        </p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 sm:p-6">
        <p className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error || 'อ่านผล 👍/👎 ไม่สำเร็จ'}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="btn-secondary mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 px-4"
        >
          <RefreshCw className="size-4" aria-hidden="true" /> ลองใหม่
        </button>
      </section>
    );
  }

  const upPercent = percent(data.up, data.total);
  const downPercent = percent(data.down, data.total);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">ความพึงพอใจต่อคำตอบ AI</h2>
          <p className="mt-0.5 max-w-[62ch] text-sm leading-5 text-slate-500">
            นับจากปุ่ม 👍/👎 ที่ผู้เรียนกดในแผง AI Tutor · {data.days} วันล่าสุด ·
            หนึ่งคนกดได้หนึ่งเสียงต่อหนึ่งคำตอบ (กดซ้ำถือเป็นเสียงเดียว)
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          disabled={refreshing}
          className="btn-secondary inline-flex min-h-11 cursor-pointer items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          {refreshing ? 'กำลังรีเฟรช…' : 'รีเฟรช'}
        </button>
      </div>

      {error && (
        <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {error} — ตัวเลขด้านล่างเป็นข้อมูลล่าสุดที่เคยอ่านได้
        </p>
      )}

      {updatedAt && (
        <p className="mt-3 text-[11px] font-medium text-slate-400">
          ข้อมูล ณ {updatedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      )}

      {data.total === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm text-slate-500">
          ยังไม่มีผู้เรียนกด 👍/👎 ในช่วง {data.days} วันล่าสุด
        </p>
      ) : (
        <>
          {/* ─── อัตราส่วน ─── */}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                <ThumbsUp className="size-[18px]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500">พอใจ (👍)</p>
                <p className="text-xl font-bold tabular-nums text-slate-900">{formatNumber(data.up)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600">
                <ThumbsDown className="size-[18px]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500">ไม่พอใจ (👎)</p>
                <p className="text-xl font-bold tabular-nums text-slate-900">{formatNumber(data.down)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                <span className="text-sm font-bold">Σ</span>
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500">เสียงทั้งหมด</p>
                <p className="text-xl font-bold tabular-nums text-slate-900">{formatNumber(data.total)}</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div
              role="img"
              aria-label={`พอใจ ${upPercent}% ไม่พอใจ ${downPercent}%`}
              className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
            >
              <div className="h-full bg-emerald-500" style={{ width: `${upPercent}%` }} />
              <div className="h-full bg-rose-400" style={{ width: `${downPercent}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              👍 {upPercent}% · 👎 {downPercent}%
            </p>
          </div>

          {/* ─── คำตอบที่ได้ 👎 ─── */}
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-slate-700">คำตอบที่ได้ 👎 ล่าสุด</h3>
            {data.downvoted.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center text-sm text-slate-500">
                ยังไม่มีคำตอบที่ได้ 👎 ในช่วงนี้
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {data.downvoted.map((row) => (
                  <li key={row.messageId} className="rounded-xl border border-slate-200 p-3">
                    <p className="line-clamp-4 whitespace-pre-line break-words text-sm leading-6 text-slate-700">
                      {row.content}
                    </p>
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold">
                        {row.grammarTopic ?? 'ไม่ระบุหัวข้อ'}
                      </span>
                      {row.cefrLevel && <span>{row.cefrLevel}</span>}
                      {row.model && <span className="font-mono">{row.model}</span>}
                      <span className="text-slate-400">· {formatDateTime(row.votedAt)}</span>
                    </p>
                    {row.questionText && (
                      <p className="mt-1.5 line-clamp-2 break-words text-[11px] text-slate-400">
                        โจทย์: {row.questionText}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
