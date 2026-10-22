'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MessageSquareText, Search } from 'lucide-react';

type MessageRow = {
  id: number;
  createdAt: string;
  role: string;
  status: string;
  content: string;
  archived: boolean;
  questionId: number;
  questionText: string | null;
  cefrLevel: string | null;
  grammarTopic: string | null;
  userId: string;
  userEmail: string;
  userName: string | null;
  model: string | null;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  attemptKey: string | null;
};

type Summary = {
  questions: number;
  answers: number;
  failed: number;
  learners: number;
  topQuestions: Array<{ questionId: number; count: number; questionText: string | null }>;
};

const ROLE_LABEL: Record<string, string> = {
  user: 'คำถามผู้เรียน',
  assistant: 'คำตอบ AI',
};

const STATUS_LABEL: Record<string, string> = {
  ok: 'สำเร็จ',
  failed: 'ล้มเหลว',
  pending: 'กำลังประมวลผล',
};

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
}

/** ตัดข้อความยาวให้พอดีกับตาราง (คลิกที่แถวเพื่อดูทั้งหมด) */
function preview(text: string, max = 140): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

export default function QuestionsTab() {
  const [rows, setRows] = useState<MessageRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [days, setDays] = useState(30);
  const [role, setRole] = useState<'user' | 'assistant' | 'all'>('user');
  const [status, setStatus] = useState<'all' | 'ok' | 'failed'>('all');
  const [questionId, setQuestionId] = useState('');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    setNotice('');
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        days: String(days),
        role,
        status,
      });
      if (questionId.trim()) params.set('questionId', questionId.trim());
      if (search.trim()) params.set('q', search.trim());

      const response = await fetch(`/api/admin/ai-tutor/messages?${params.toString()}`);
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'โหลดคำถามไม่สำเร็จ');

      setRows(body.data?.rows ?? []);
      setSummary(body.data?.summary ?? null);
      setTotal(body.meta?.total ?? 0);
      setTotalPages(body.meta?.totalPages ?? 1);
      setPage(nextPage);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'โหลดคำถามไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [days, role, status, questionId, search]);

  // โหลดครั้งแรก (และโหลดใหม่เมื่อตัวกรองเปลี่ยน)
  useEffect(() => { void load(1); }, [load]);

  return (
    <div className="space-y-6">
      {notice && (
        <p role="status" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {notice}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <MessageSquareText className="size-5 text-primary-600" aria-hidden="true" />
            คำถามของผู้เรียน
          </h2>
          <p className="text-sm text-slate-500">
            เก็บข้อความที่ผู้เรียนถาม AI ไว้เพื่อนำไปปรับปรุงการสอน (เก็บ 180 วัน)
          </p>
        </div>

        <form
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
          onSubmit={(event) => {
            event.preventDefault();
            void load(1);
          }}
        >
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            ช่วงเวลา
            <select
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              aria-label="ช่วงเวลา"
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-primary-500"
            >
              <option value={7}>7 วัน</option>
              <option value={30}>30 วัน</option>
              <option value={90}>90 วัน</option>
              <option value={365}>365 วัน</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            ประเภทข้อความ
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as 'user' | 'assistant' | 'all')}
              aria-label="ประเภทข้อความ"
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-primary-500"
            >
              <option value="user">คำถามผู้เรียน</option>
              <option value="assistant">คำตอบ AI</option>
              <option value="all">ทั้งหมด</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            สถานะ
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as 'all' | 'ok' | 'failed')}
              aria-label="สถานะ"
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-primary-500"
            >
              <option value="all">ทั้งหมด</option>
              <option value="ok">สำเร็จ</option>
              <option value="failed">ล้มเหลว</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            ข้อสอบ (id)
            <input
              value={questionId}
              onChange={(event) => setQuestionId(event.target.value.replace(/[^\d]/g, ''))}
              inputMode="numeric"
              placeholder="เช่น 2098"
              aria-label="เลขข้อสอบ"
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-primary-500"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            ค้นหาในข้อความ
            <span className="flex gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="คำในข้อความ"
                aria-label="ค้นหาในข้อความ"
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-primary-500"
              />
              <button type="submit" disabled={loading} className="btn-secondary min-h-11 disabled:opacity-50">
                <Search className="size-4" aria-hidden="true" /> ค้นหา
              </button>
            </span>
          </label>
        </form>

        {summary && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">คำถามผู้เรียน</p>
              <p className="text-2xl font-bold text-slate-900">{summary.questions}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">ผู้เรียนที่ถาม</p>
              <p className="text-2xl font-bold text-slate-900">{summary.learners}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">คำตอบ AI</p>
              <p className="text-2xl font-bold text-slate-900">{summary.answers}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">ล้มเหลว (คืนโควตา)</p>
              <p className="text-2xl font-bold text-slate-900">{summary.failed}</p>
            </div>
          </div>
        )}

        {summary && summary.topQuestions.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700">ข้อที่ถูกถามบ่อยที่สุด</h3>
            <ol className="mt-2 space-y-1 text-sm text-slate-600">
              {summary.topQuestions.map((item) => (
                <li key={item.questionId} className="flex gap-2">
                  <span className="w-10 shrink-0 text-right tabular-nums text-slate-400">#{item.questionId}</span>
                  <span className="min-w-0 flex-1 break-words">
                    {item.questionText ? preview(item.questionText, 90) : '(ไม่พบข้อสอบ)'}
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-500">{item.count} ครั้ง</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <p className="mt-4 text-sm text-slate-500">ทั้งหมด {total} รายการ · หน้า {page} / {totalPages}</p>

        {loading ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> กำลังโหลด…
          </p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">ไม่พบข้อความตามตัวกรอง</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">เวลา</th>
                  <th className="py-2 pr-3">ผู้เรียน</th>
                  <th className="py-2 pr-3">ข้อ</th>
                  <th className="py-2 pr-3">ประเภท</th>
                  <th className="py-2 pr-3">ข้อความ</th>
                  <th className="py-2">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 align-top">
                    <td className="whitespace-nowrap py-2 pr-3 text-xs text-slate-500">{formatTime(row.createdAt)}</td>
                    <td className="break-all py-2 pr-3 text-slate-700">
                      {row.userEmail}
                      {row.archived && (
                        <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                          ปิดรอบแล้ว
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-xs text-slate-500">
                      #{row.questionId}
                      {row.cefrLevel && <span className="ml-1">{row.cefrLevel}</span>}
                    </td>
                    <td className="py-2 pr-3 text-xs text-slate-500">{ROLE_LABEL[row.role] ?? row.role}</td>
                    <td className="py-2 pr-3 text-slate-700">
                      <details>
                        <summary className="cursor-pointer break-words">
                          {preview(row.content) || '(ข้อความว่าง)'}
                        </summary>
                        <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-slate-700">
                          {row.content}
                        </p>
                        {row.questionText && (
                          <p className="mt-1 break-words text-xs text-slate-500">
                            โจทย์: {row.questionText}
                            {row.grammarTopic ? ` · ${row.grammarTopic}` : ''}
                          </p>
                        )}
                        {row.role === 'user' && (row.selectedAnswer || row.isCorrect !== null) && (
                          <p className="mt-1 text-xs text-slate-500">
                            คำตอบผู้เรียน: {row.selectedAnswer ?? '-'}
                            {row.isCorrect === true && ' · ถูก'}
                            {row.isCorrect === false && ' · ผิด'}
                          </p>
                        )}
                        {row.model && (
                          <p className="mt-1 text-xs text-slate-400">
                            {row.model}
                            {row.latencyMs !== null ? ` · ${row.latencyMs} ms` : ''}
                            {row.inputTokens !== null && row.outputTokens !== null
                              ? ` · ${row.inputTokens}/${row.outputTokens} tokens`
                              : ''}
                          </p>
                        )}
                      </details>
                    </td>
                    <td className="py-2 text-xs text-slate-500">{STATUS_LABEL[row.status] ?? row.status}</td>
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
              onClick={() => void load(page - 1)}
              className="btn-secondary min-h-11 disabled:opacity-50"
            >
              ก่อนหน้า
            </button>
            <button
              type="button"
              disabled={loading || page >= totalPages}
              onClick={() => void load(page + 1)}
              className="btn-secondary min-h-11 disabled:opacity-50"
            >
              ถัดไป
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
