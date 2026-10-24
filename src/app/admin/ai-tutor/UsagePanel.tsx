'use client';

// ─── การ์ด "การใช้วันนี้" ของ /admin/ai-tutor ──────────────────────────────────
// ตัวเลขทั้งหมดมาจาก GET /api/admin/ai-tutor/usage ซึ่งนับจากฐานข้อมูลด้วยเงื่อนไข
// เดียวกับตัวบังคับโควตา (ok + pending ที่ยังไม่ค้าง) → ตรงกับสิ่งที่ผู้เรียนโดนจริง
//
// โหลดครั้งแรกครั้งเดียว + **อัปเดตเมื่อกดปุ่มรีเฟรชเท่านั้น** (ไม่มี polling อัตโนมัติ)
// → ตัวเลขบนจอคือ "ข้อมูล ณ เวลาที่อ่านล่าสุด" ไม่ใช่ค่าที่วิ่งเองตลอดเวลา
import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, Bot, Clock3, Loader2, RefreshCw, Users } from 'lucide-react';

import type { AdminUsageResponse } from './types';

/** ระดับความรุนแรงของการใช้เทียบเพดาน → สีของหลอด */
function usageTone(percent: number): {
  bar: string;
  text: string;
  ring: string;
} {
  if (percent >= 100) return { bar: 'bg-rose-500', text: 'text-rose-600', ring: 'border-rose-200 bg-rose-50' };
  if (percent >= 90) return { bar: 'bg-rose-400', text: 'text-rose-600', ring: 'border-rose-200 bg-rose-50' };
  if (percent >= 70) return { bar: 'bg-amber-400', text: 'text-amber-700', ring: 'border-amber-200 bg-amber-50' };
  return { bar: 'bg-emerald-500', text: 'text-emerald-700', ring: 'border-emerald-200 bg-emerald-50' };
}

function formatNumber(value: number): string {
  return value.toLocaleString('th-TH');
}

function formatTime(value: Date): string {
  return value.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** เวลาที่เหลือจนถึงเที่ยงคืนไทย */
function untilReset(resetAt: string): string | null {
  const reset = new Date(resetAt).getTime();
  if (!Number.isFinite(reset)) return null;
  const diff = reset - Date.now();
  if (diff <= 0) return 'กำลังรีเซ็ต…';
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 0) return `อีก ${hours} ชม. ${minutes} น.`;
  return `อีก ${minutes} น.`;
}

export default function UsagePanel() {
  const [data, setData] = useState<AdminUsageResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    // กันยิงซ้อน (เช่นกดรีเฟรชรัว ๆ)
    if (busyRef.current) return;
    busyRef.current = true;
    setRefreshing(true);
    try {
      const response = await fetch('/api/admin/ai-tutor/usage', { cache: 'no-store' });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success || !body?.data) {
        throw new Error(typeof body?.error === 'string' ? body.error : 'อ่านสถิติการใช้งานไม่สำเร็จ');
      }
      setData(body.data as AdminUsageResponse);
      setError('');
      setUpdatedAt(new Date());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'อ่านสถิติการใช้งานไม่สำเร็จ');
    } finally {
      busyRef.current = false;
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  // โหลดครั้งแรกครั้งเดียว — ไม่มี timer/visibilitychange (ผู้ใช้กดรีเฟรชเอง)
  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> กำลังโหลดสถิติการใช้งาน…
        </p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 sm:p-6">
        <p className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error || 'อ่านสถิติการใช้งานไม่สำเร็จ'}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="btn-secondary mt-3 min-h-11 cursor-pointer"
        >
          <RefreshCw className="size-4" aria-hidden="true" /> ลองใหม่
        </button>
      </section>
    );
  }

  const limit = data.limits.systemDailyLimit;
  const used = data.questions;
  const remaining = Math.max(0, limit - used);
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const tone = usageTone(limit > 0 ? (used / limit) * 100 : 0);
  const resetIn = untilReset(data.resetAt);

  const stats = [
    { label: 'ผู้เรียนที่ถามวันนี้', value: data.learners, icon: Users, accent: 'bg-violet-50 text-violet-600' },
    { label: 'คำตอบ AI ที่สำเร็จ', value: data.answers, icon: Bot, accent: 'bg-emerald-50 text-emerald-600' },
    {
      label: 'กำลังประมวลผล',
      value: data.pending,
      icon: Activity,
      accent: data.pending > 0 ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-400',
    },
    {
      label: 'ล้มเหลว (คืนโควตา)',
      value: data.failed,
      icon: AlertTriangle,
      accent: data.failed > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400',
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600">
            <Activity className="size-[18px]" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900">การใช้วันนี้</h2>
            <p className="mt-0.5 text-sm leading-5 text-slate-500">
              นับตามเวลาไทย (Asia/Bangkok) · เฉพาะคำถามที่ถูกเรียกโมเดลจริง (แถวที่ล้มเหลวไม่นับ) ·
              ตัวเลขจะอัปเดตเมื่อกด “รีเฟรช”
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
            <Clock3 className="size-3.5" aria-hidden="true" />
            {updatedAt ? `ข้อมูล ณ ${formatTime(updatedAt)}` : 'ยังไม่ได้อ่านข้อมูล'}
          </span>
          <button
            type="button"
            aria-label="รีเฟรชสถิติ"
            onClick={() => void load()}
            disabled={refreshing}
            className="btn-secondary inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            {refreshing ? 'กำลังรีเฟรช…' : 'รีเฟรช'}
          </button>
        </div>
      </div>

      {error && (
        <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {error} — ตัวเลขด้านล่างเป็นข้อมูลล่าสุดที่เคยอ่านได้
        </p>
      )}

      {/* ─── คำถามวันนี้ vs เพดานรวมทั้งระบบ ─── */}
      <div className="mt-5 rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-slate-700">คำถามทั้งระบบวันนี้</p>
          <p className="text-sm text-slate-500">
            <span className={`text-xl font-bold tabular-nums ${tone.text}`}>{formatNumber(used)}</span>
            <span className="mx-1 text-slate-300" aria-hidden="true">/</span>
            {formatNumber(limit)} ครั้ง
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {percent}%
            </span>
          </p>
        </div>

        <div
          role="progressbar"
          aria-label="คำถามทั้งระบบวันนี้เทียบเพดานรายวัน"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuetext={`ใช้ไป ${used} จาก ${limit} ครั้ง`}
          className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${tone.bar}`}
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-slate-500">
          <p>
            เหลือ <strong className={`font-semibold ${tone.text}`}>{formatNumber(remaining)}</strong> ครั้ง ·
            เพดานต่อผู้เรียน {formatNumber(data.limits.userDailyLimit)} ครั้ง/วัน · โควตาต่อข้อ{' '}
            {formatNumber(data.limits.questionQuota)} ครั้ง/วัน
          </p>
          {resetIn && (
            <p className="flex items-center gap-1">
              <Clock3 className="size-3.5" aria-hidden="true" /> รีเซ็ตเที่ยงคืน · {resetIn}
            </p>
          )}
        </div>
      </div>

      {/* ─── ตัวเลขประกอบ ─── */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${item.accent}`}>
                <Icon className="size-[18px]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-slate-500">{item.label}</p>
                <p className="text-xl font-bold tabular-nums text-slate-900">{formatNumber(item.value)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── ผู้เรียนที่ใช้มากสุดวันนี้ ─── */}
      {data.topLearners.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-700">ผู้เรียนที่ใช้มากสุดวันนี้</h3>
            <p className="text-xs text-slate-400">เทียบเพดานต่อผู้เรียน {formatNumber(data.limits.userDailyLimit)} ครั้ง</p>
          </div>
          <ul className="mt-3 space-y-2.5">
            {data.topLearners.map((learner, index) => {
              const learnerPercent = data.limits.userDailyLimit > 0
                ? Math.min(100, Math.round((learner.count / data.limits.userDailyLimit) * 100))
                : 0;
              const learnerTone = usageTone(learnerPercent);
              return (
                <li key={learner.userId} className="min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="flex min-w-0 items-baseline gap-1.5 text-sm text-slate-700">
                      <span className="shrink-0 text-xs tabular-nums text-slate-400">{index + 1}.</span>
                      <span className="min-w-0 truncate">{learner.email}</span>
                      {learner.name && (
                        <span className="shrink-0 truncate text-xs text-slate-400">({learner.name})</span>
                      )}
                    </p>
                    <p className="shrink-0 text-xs tabular-nums text-slate-500">
                      {formatNumber(learner.count)} ครั้ง
                    </p>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${learnerTone.bar}`}
                      style={{ width: `${learnerPercent}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {data.topLearners.length === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center text-sm text-slate-500">
          วันนี้ยังไม่มีผู้เรียนถาม AI
        </p>
      )}
    </section>
  );
}
