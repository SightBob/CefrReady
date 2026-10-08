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

/** ต้องตรงกับ TapReasonRewardSettings ใน src/lib/tap-reason-rewards.ts */
interface RewardSettings {
  autoAward: boolean;
  points: number;
}

interface LeaderboardRow {
  rank: number;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  totalPoints: number;
  totalReasons: number;
  scoredReasons: number;
  lastScoredAt: string | null;
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

/** ตั้งคะแนนเหมา: พิมพ์ตอบ = ได้คะแนนทันที ไม่ต้องประเมินทีละคำตอบ */
function RewardSettingsPanel({
  settings,
  loaded,
  saving,
  backfilling,
  onChange,
  onSave,
  onBackfill,
}: {
  settings: RewardSettings;
  loaded: boolean;
  saving: boolean;
  backfilling: boolean;
  onChange: (settings: RewardSettings) => void;
  onSave: () => Promise<void>;
  onBackfill: () => Promise<void>;
}) {
  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-slate-800">คะแนนเหมา (ไม่ต้องประเมินรายคำตอบ)</h2>
      <p className="mt-1 text-sm text-slate-500">
        เปิดไว้ = ผู้เรียนที่พิมพ์เหตุผลจะได้คะแนนที่ตั้งไว้ทันทีเมื่อส่งข้อสอบ · ปิดไว้ = ต้องให้คะแนนเองทีละรายการด้านล่าง
      </p>
      <fieldset
        disabled={!loaded || saving || backfilling}
        className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 disabled:opacity-60"
      >
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            className="size-5"
            checked={settings.autoAward}
            onChange={(event) => onChange({ ...settings, autoAward: event.target.checked })}
          />
          ให้คะแนนทันทีที่พิมพ์เหตุผล
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700">
          คะแนนต่อเหตุผล
          <input
            type="number"
            min={0}
            max={MAX_REWARD_POINTS}
            step={1}
            value={Number.isFinite(settings.points) ? settings.points : ''}
            onChange={(event) => onChange({ ...settings, points: Number(event.target.value) })}
            className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
          <span className="text-xs font-normal text-slate-400">(0-{MAX_REWARD_POINTS})</span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void onSave()}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Sparkle className="size-4" />}
            {saving ? 'กำลังบันทึก…' : 'บันทึกค่า'}
          </button>
          <button
            type="button"
            onClick={() => void onBackfill()}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            {backfilling && <Loader2 className="size-4 animate-spin" />}
            ให้คะแนนย้อนหลังรายการที่ค้าง
          </button>
        </div>
      </fieldset>
    </section>
  );
}

/** อันดับคะแนนเก็บรายคน — นับเฉพาะเหตุผลที่ให้คะแนนแล้ว */
function LeaderboardPanel({
  rows,
  loading,
  onRefresh,
}: {
  rows: LeaderboardRow[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}) {
  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold text-slate-800">อันดับคะแนนเก็บรายคน</h2>
        <span className="text-xs text-slate-400">นับเฉพาะเหตุผลที่ให้คะแนนแล้ว</span>
        <button
          type="button"
          onClick={() => void onRefresh()}
          className="ml-auto rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
          aria-label="รีเฟรชอันดับ"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" /> กำลังโหลด…
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">ยังไม่มีใครได้คะแนน</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-2 pr-3 font-semibold">อันดับ</th>
                <th className="py-2 pr-3 font-semibold">ผู้เรียน</th>
                <th className="py-2 pr-3 text-right font-semibold">คะแนนรวม</th>
                <th className="py-2 pr-3 text-right font-semibold">เหตุผลที่ให้คะแนน</th>
                <th className="py-2 font-semibold">ให้คะแนนล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId} className="border-t border-slate-100 align-top">
                  <td className="py-2 pr-3 font-semibold text-slate-700">{row.rank}</td>
                  <td className="py-2 pr-3 text-slate-700">
                    <span className="font-semibold">{row.userName || row.userEmail || row.userId}</span>
                    {row.userName && row.userEmail && (
                      <span className="block text-xs text-slate-400">{row.userEmail}</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right font-bold text-amber-700">{row.totalPoints}</td>
                  <td className="py-2 pr-3 text-right text-slate-600">
                    {row.scoredReasons}/{row.totalReasons}
                  </td>
                  <td className="py-2 text-xs text-slate-500">
                    {row.lastScoredAt ? new Date(row.lastScoredAt).toLocaleString('th-TH') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function TapReasonsAdminPage() {
  const [items, setItems] = useState<TapReasonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScored, setShowScored] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [settings, setSettings] = useState<RewardSettings>({ autoAward: true, points: 50 });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

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

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tap-reason-rewards');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'โหลดการตั้งค่าคะแนนไม่สำเร็จ');
      setSettings(data.data);
      setSettingsLoaded(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'โหลดการตั้งค่าคะแนนไม่สำเร็จ');
    }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const res = await fetch('/api/admin/tap-reasons/leaderboard');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'โหลดอันดับไม่สำเร็จ');
      setLeaderboard(data.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'โหลดอันดับไม่สำเร็จ');
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([load(), loadLeaderboard()]);
  }, [load, loadLeaderboard]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadSettings();
    void loadLeaderboard();
  }, [loadSettings, loadLeaderboard]);

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
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSavingId(null);
    }
  };

  const validateSettings = (): number | null => {
    if (!Number.isInteger(settings.points) || settings.points < 0 || settings.points > MAX_REWARD_POINTS) {
      toast.error(`คะแนนต่อเหตุผลต้องเป็นจำนวนเต็ม 0-${MAX_REWARD_POINTS}`);
      return null;
    }
    return settings.points;
  };

  const saveSettings = async () => {
    const points = validateSettings();
    if (points === null) return;
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/tap-reason-rewards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoAward: settings.autoAward, points }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'บันทึกการตั้งค่าไม่สำเร็จ');
      setSettings(data.data);
      setSettingsLoaded(true);
      toast.success(
        data.data.autoAward
          ? `พิมพ์เหตุผล = ได้ ${data.data.points} คะแนนทันที`
          : 'ปิดการให้คะแนนอัตโนมัติแล้ว — ให้คะแนนเองทีละรายการ'
      );
      await loadLeaderboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'บันทึกการตั้งค่าไม่สำเร็จ');
    } finally {
      setSavingSettings(false);
    }
  };

  const backfill = async () => {
    const points = validateSettings();
    if (points === null) return;
    setBackfilling(true);
    try {
      const res = await fetch('/api/admin/tap-reasons/score-all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'ให้คะแนนย้อนหลังไม่สำเร็จ');
      const { scored, remaining } = data.data as { scored: number; remaining: boolean };
      toast.success(
        scored === 0
          ? 'ไม่มีรายการค้างให้คะแนน'
          : `ให้คะแนนย้อนหลัง ${scored} รายการ (+${data.data.points} คะแนน)` +
              (remaining ? ' — ยังมีที่เหลือ กดอีกครั้ง' : '')
      );
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ให้คะแนนย้อนหลังไม่สำเร็จ');
    } finally {
      setBackfilling(false);
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
          onClick={() => void refreshAll()}
          className="ml-auto rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
          aria-label="รีเฟรช"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <p className="mb-4 text-sm text-slate-500">
        เฉพาะข้อย่อยที่ผู้เรียนเขียนเหตุผลเองเท่านั้นที่จะถูกเก็บไว้ที่นี่ — เหตุผลที่เว้นว่างไม่มีคะแนน
      </p>

      <RewardSettingsPanel
        settings={settings}
        loaded={settingsLoaded}
        saving={savingSettings}
        backfilling={backfilling}
        onChange={setSettings}
        onSave={saveSettings}
        onBackfill={backfill}
      />

      <LeaderboardPanel rows={leaderboard} loading={leaderboardLoading} onRefresh={loadLeaderboard} />

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
