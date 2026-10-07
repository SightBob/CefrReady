'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, Sparkle } from 'lucide-react';
import { toast } from 'sonner';

interface TapReasonItem {
  id: number;
  attemptId: number;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  questionId: number;
  itemIndex: number;
  reason: string;
  isCorrect: boolean;
  rewardPoints: number | null;
  scoredAt: string | null;
  createdAt: string;
  questionText: string | null;
  tapExercise: { title?: string; items?: Array<{ prompt?: string; choiceA?: string; choiceB?: string }> } | null;
  setName: string | null;
}

// ต้องตรงกับ MAX_REWARD_POINTS ใน /api/admin/tap-reasons
const MAX_REWARD_POINTS = 100;

/** ช่องกรอกคะแนนของเหตุผลหนึ่งรายการ — เก็บค่าใน state ของตัวเอง แทนการอ่านจาก DOM */
function RewardEditor({
  item,
  saving,
  onSave,
}: {
  item: TapReasonItem;
  saving: boolean;
  onSave: (rewardPoints: number | null) => Promise<void>;
}) {
  const [value, setValue] = useState(item.rewardPoints === null ? '' : String(item.rewardPoints));

  const submit = async () => {
    const trimmed = value.trim();
    if (trimmed === '') {
      await onSave(null);
      setValue('');
      return;
    }
    const points = Number(trimmed);
    if (!Number.isInteger(points) || points < 0 || points > MAX_REWARD_POINTS) {
      toast.error(`คะแนนต้องเป็นจำนวนเต็ม 0-${MAX_REWARD_POINTS}`);
      return;
    }
    await onSave(points);
    setValue(String(points));
  };

  const clear = async () => {
    await onSave(null);
    setValue('');
  };

  if (saving) {
    return <Loader2 className="size-4 animate-spin text-slate-400" aria-label="กำลังบันทึก" />;
  }

  return (
    <>
      <input
        id={`points-${item.id}`}
        type="number"
        min={0}
        max={MAX_REWARD_POINTS}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="0-100"
        className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
      />
      <button
        type="button"
        onClick={() => void submit()}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        <Sparkle className="size-3" /> บันทึกคะแนน
      </button>
      {item.rewardPoints !== null && (
        <button
          type="button"
          onClick={() => void clear()}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          ล้างคะแนน
        </button>
      )}
      <CheckCircle2
        className={`size-4 ${item.rewardPoints !== null ? 'text-emerald-500' : 'text-slate-300'}`}
        aria-hidden="true"
      />
    </>
  );
}

export default function TapReasonsAdminPage() {
  const [items, setItems] = useState<TapReasonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScored, setShowScored] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tap-reasons?scored=${showScored}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data ?? []);
      } else {
        toast.error(data.error || 'โหลดรายการไม่สำเร็จ');
      }
    } catch {
      toast.error('โหลดรายการไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [showScored]);

  useEffect(() => {
    void load();
  }, [load]);

  const setPoints = async (id: number, rewardPoints: number | null) => {
    setSavingId(id);
    try {
      const res = await fetch('/api/admin/tap-reasons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, rewardPoints }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'บันทึกไม่สำเร็จ');
      toast.success(rewardPoints === null ? 'ล้างคะแนนแล้ว' : `ให้คะแนน ${rewardPoints} แล้ว`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSavingId(null);
    }
  };

  const promptOf = (item: TapReasonItem) =>
    item.tapExercise?.items?.[item.itemIndex]?.prompt ?? item.questionText ?? '';

  const choicesOf = (item: TapReasonItem) => {
    const it = item.tapExercise?.items?.[item.itemIndex];
    return it ? `${it.choiceA ?? 'A'} / ${it.choiceB ?? 'B'}` : '';
  };

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin"
          className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
          aria-label="กลับหน้าแอดมิน"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-bold text-slate-800">ให้คะแนนเหตุผล Tap &amp; Select</h1>
        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
          aria-label="รีเฟรช"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <p className="mb-4 text-sm text-slate-500">
        เฉพาะข้อย่อยที่ผู้เรียนเขียนเหตุผลเองเท่านั้นที่จะถูกเก็บไว้ที่นี่ — เหตุผลที่เว้นว่างไม่มีคะแนน
      </p>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setShowScored(false)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${!showScored ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-600'}`}
        >
          รอให้คะแนน
        </button>
        <button
          type="button"
          onClick={() => setShowScored(true)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${showScored ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-600'}`}
        >
          ให้คะแนนแล้ว
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="size-4 animate-spin" /> กำลังโหลด…
        </div>
      ) : items.length === 0 ? (
        <p className="text-slate-500">ไม่มีรายการ</p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  {item.userName || item.userEmail || item.userId}
                </span>
                {item.setName && <span>· {item.setName}</span>}
                <span>· {new Date(item.createdAt).toLocaleString('th-TH')}</span>
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${item.isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}
                >
                  เลือก{item.isCorrect ? 'ถูก' : 'ผิด'}
                </span>
                {item.rewardPoints !== null && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                    +{item.rewardPoints} pts
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">{promptOf(item)}</p>
              <p className="text-xs text-slate-400">ตัวเลือก: {choicesOf(item)}</p>
              <p className="mt-2 whitespace-pre-line break-words rounded-lg bg-slate-50 p-3 text-sm text-slate-800">
                {item.reason}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor={`points-${item.id}`}>
                  คะแนนเก็บ:
                </label>
                <RewardEditor
                  item={item}
                  saving={savingId === item.id}
                  onSave={(points) => setPoints(item.id, points)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
