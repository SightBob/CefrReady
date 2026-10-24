'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Search, UserMinus, UserPlus, Users } from 'lucide-react';

import ConfirmModal from './ConfirmModal';
import type { BulkResult } from './types';

type Tester = { id: string; email: string; name: string | null };

export default function TestersTab({ rolloutPercent }: { rolloutPercent: number }) {
  const [testers, setTesters] = useState<Tester[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [noticeKind, setNoticeKind] = useState<'ok' | 'error'>('ok');
  const [emailsInput, setEmailsInput] = useState('');
  const [result, setResult] = useState<BulkResult | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Tester | null>(null);

  const load = useCallback(async (nextPage: number, search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage) });
      if (search.trim()) params.set('q', search.trim());
      const response = await fetch(`/api/admin/ai-tutor/testers?${params.toString()}`);
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'โหลดรายชื่อไม่สำเร็จ');
      setTesters(body.data ?? []);
      setTotal(body.meta?.total ?? 0);
      setTotalPages(body.meta?.totalPages ?? 1);
      setPage(nextPage);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'โหลดรายชื่อไม่สำเร็จ');
      setNoticeKind('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(1, ''); }, [load]);

  const submitBulk = async (action: 'grant' | 'revoke') => {
    const emails = emailsInput
      .split(/[\n,]/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (emails.length === 0) {
      setNotice('ใส่อีเมลอย่างน้อย 1 รายการ');
      setNoticeKind('error');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/admin/ai-tutor/testers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, emails }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'บันทึกสิทธิ์ไม่สำเร็จ');
      setResult(body.data);
      setNotice(
        `เพิ่ม ${body.data.summary.granted} · ไม่พบผู้ใช้ ${body.data.summary.notFound} · มีสิทธิ์อยู่แล้ว ${body.data.summary.already} · รูปแบบผิด ${body.data.summary.invalid}`,
      );
      setNoticeKind(body.data.summary.granted > 0 ? 'ok' : 'error');
      setEmailsInput('');
      await load(1, query);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'บันทึกสิทธิ์ไม่สำเร็จ');
      setNoticeKind('error');
    } finally {
      setBusy(false);
    }
  };

  const revokeOne = async (tester: Tester) => {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/ai-tutor/testers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', emails: [tester.email] }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'ถอนสิทธิ์ไม่สำเร็จ');
      setNotice(`ถอนสิทธิ์ ${tester.email} แล้ว`);
      setNoticeKind('ok');
      await load(page, query);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'ถอนสิทธิ์ไม่สำเร็จ');
      setNoticeKind('error');
    } finally {
      setBusy(false);
      setRevokeTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {notice && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${noticeKind === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}
        >
          {notice}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
              <Users className="size-[18px]" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">ผู้ที่มีสิทธิ์ใช้ AI Tutor</h2>
              <p className="mt-0.5 text-sm leading-5 text-slate-500">
                บัญชีที่ได้รับสิทธิ์เฉพาะราย — นอกเหนือจากกลุ่ม rollout
              </p>
            </div>
          </div>
          <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
            rollout ปัจจุบัน <strong className="text-slate-700">{rolloutPercent}%</strong>
            <span className="text-slate-300" aria-hidden="true">·</span>
            แก้ในแท็บ “ตั้งค่า”
          </p>
        </div>

        <form
          className="mt-4 flex flex-wrap gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void load(1, query);
          }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาอีเมล"
            aria-label="ค้นหาอีเมลผู้ทดสอบ"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-primary-500"
          />
          <button type="submit" disabled={loading} className="btn-secondary min-h-11 disabled:opacity-50">
            <Search className="size-4" aria-hidden="true" /> ค้นหา
          </button>
        </form>

        <p className="mt-3 text-sm text-slate-500">ทั้งหมด {total} คน · หน้า {page} / {totalPages}</p>

        {loading ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> กำลังโหลด…
          </p>
        ) : testers.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm text-slate-500">
            ไม่พบผู้ที่มีสิทธิ์
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs tracking-wide text-slate-500">
                  <th className="py-2.5 pr-3 pl-3 font-semibold">อีเมล</th>
                  <th className="py-2.5 pr-3 font-semibold">ชื่อ</th>
                  <th className="py-2.5 pr-3 text-right font-semibold">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {testers.map((tester) => (
                  <tr key={tester.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70">
                    <td className="break-all py-2 pr-3 text-slate-700">{tester.email}</td>
                    <td className="py-2 pr-3 text-slate-500">{tester.name ?? '-'}</td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setRevokeTarget(tester)}
                        className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <UserMinus className="size-4" aria-hidden="true" /> ถอนสิทธิ์
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => void load(page - 1, query)}
              className="btn-secondary min-h-11 disabled:opacity-50"
            >
              ก่อนหน้า
            </button>
            <button
              type="button"
              disabled={loading || page >= totalPages}
              onClick={() => void load(page + 1, query)}
              className="btn-secondary min-h-11 disabled:opacity-50"
            >
              ถัดไป
            </button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
            <UserPlus className="size-[18px]" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900">เพิ่ม/ถอนสิทธิ์แบบหลายรายการ</h2>
            <p className="mt-0.5 text-sm leading-5 text-slate-500">
              วางอีเมลทีละบรรทัด (หรือคั่นด้วยจุลภาค) · สูงสุด 200 รายการต่อครั้ง
            </p>
          </div>
        </div>
        <textarea
          value={emailsInput}
          onChange={(event) => setEmailsInput(event.target.value)}
          rows={5}
          aria-label="รายการอีเมลที่ต้องการเพิ่มหรือถอนสิทธิ์"
          placeholder={'learner1@example.com\nlearner2@example.com'}
          className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base outline-none focus:border-primary-500"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void submitBulk('grant')}
            className="btn-primary min-h-11 disabled:opacity-50"
          >
            <UserPlus className="size-4" aria-hidden="true" /> เพิ่มสิทธิ์
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submitBulk('revoke')}
            className="btn-secondary min-h-11 disabled:opacity-50"
          >
            <UserMinus className="size-4" aria-hidden="true" /> ถอนสิทธิ์
          </button>
        </div>

        {result && (
          <div aria-live="polite" className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold">สรุปผล: เพิ่ม {result.summary.granted} · ไม่พบผู้ใช้ {result.summary.notFound} · มีสิทธิ์อยู่แล้ว {result.summary.already} · รูปแบบผิด {result.summary.invalid}</p>
            {result.notFound.length > 0 && <p className="mt-2 break-all">ไม่พบผู้ใช้: {result.notFound.join(', ')}</p>}
            {result.already.length > 0 && <p className="mt-1 break-all">ไม่เปลี่ยนแปลง (มีสิทธิ์อยู่แล้ว): {result.already.join(', ')}</p>}
            {result.invalid.length > 0 && <p className="mt-1 break-all">รูปแบบอีเมลผิด: {result.invalid.join(', ')}</p>}
          </div>
        )}
      </section>

      <ConfirmModal
        open={revokeTarget !== null}
        title="ถอนสิทธิ์ใช้ AI Tutor?"
        description={revokeTarget ? `ผู้ใช้ ${revokeTarget.email} จะใช้โหมด AI ไม่ได้จนกว่าจะเพิ่มสิทธิ์ใหม่` : ''}
        confirmLabel="ถอนสิทธิ์"
        danger
        busy={busy}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={() => { if (revokeTarget) void revokeOne(revokeTarget); }}
      />
    </div>
  );
}
