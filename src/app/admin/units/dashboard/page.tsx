'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, BarChart3, BookOpen, CheckCircle2, FileQuestion, Layers, Loader2, Map, RefreshCw } from 'lucide-react';

type NodeStat = { id: number; title: string; questions: number; hasContent: boolean; hasTap: boolean };
type UnitStat = { id: number; title: string; isPublished: boolean; nodeCount: number; questionCount: number; incompleteNodes: number; nodes: NodeStat[] };
type DashboardData = { units: UnitStat[]; totals: { units: number; nodes: number; pages: number; explainPages: number; quizPages: number; questions: number; incompleteNodes: number } };

export default function LearningDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/learning-dashboard', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const cards = data ? [
    { label: 'Units / Modules', value: data.totals.units, icon: Map, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Nodes ทั้งหมด', value: data.totals.nodes, icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'ข้อสอบ Real Exam', value: data.totals.questions, icon: FileQuestion, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Nodes ที่ควรตรวจ', value: data.totals.incompleteNodes, icon: AlertTriangle, color: data.totals.incompleteNodes ? 'text-orange-600' : 'text-emerald-600', bg: data.totals.incompleteNodes ? 'bg-orange-50' : 'bg-emerald-50' },
  ] : [];

  const StatusIcon = data?.totals.incompleteNodes ? AlertTriangle : CheckCircle2;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-3"><ArrowLeft className="w-4 h-4" /> กลับ Admin</Link>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3"><BarChart3 className="w-8 h-8 text-emerald-600" /> Learning Path Dashboard</h1>
            <p className="text-slate-500 mt-1">ภาพรวม Units, Nodes, หน้าเรียน และข้อสอบในระบบ</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-emerald-300 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> รีเฟรช</button>
            <Link href="/admin/units" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"><BookOpen className="w-4 h-4" /> จัดการเนื้อหา</Link>
          </div>
        </div>

        {loading && !data ? <div className="py-24 flex justify-center"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div> : data && <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {cards.map((card) => { const Icon = card.icon; return <div key={card.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">{card.label}</p><p className="text-3xl font-black text-slate-900 mt-1">{card.value}</p></div><div className={`${card.bg} p-3 rounded-xl`}><Icon className={`w-6 h-6 ${card.color}`} /></div></div></div>; })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <h2 className="font-bold text-slate-800 mb-4">สรุปข้อสอบและหน้าเรียน</h2>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-sky-50 p-4"><p className="text-2xl font-black text-sky-700">{data.totals.explainPages}</p><p className="text-xs text-sky-600 mt-1">หน้าอธิบาย</p></div>
                <div className="rounded-xl bg-purple-50 p-4"><p className="text-2xl font-black text-purple-700">{data.totals.quizPages}</p><p className="text-xs text-purple-600 mt-1">หน้าข้อสอบ</p></div>
                <div className="rounded-xl bg-emerald-50 p-4"><p className="text-2xl font-black text-emerald-700">{data.totals.pages}</p><p className="text-xs text-emerald-600 mt-1">หน้าทั้งหมด</p></div>
              </div>
            </div>
            <div className={`rounded-2xl border p-5 shadow-sm ${data.totals.incompleteNodes ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex items-center gap-2 font-bold text-slate-800"><StatusIcon className="w-5 h-5" /> สถานะเนื้อหา</div>
              <p className="text-sm text-slate-600 mt-3">{data.totals.incompleteNodes ? 'มี Node ที่ควรตรวจ เพราะยังไม่มีข้อสอบ, เนื้อหา หรือ Tap & Select ครบ' : 'ทุก Node มีเนื้อหาและข้อสอบครบตามข้อมูลที่ตรวจพบ'}</p>
              <p className="text-3xl font-black mt-2 text-slate-900">{data.totals.incompleteNodes} <span className="text-sm font-medium">Nodes</span></p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100"><h2 className="font-bold text-slate-800">สถิติราย Unit / Module</h2></div>
            <div className="divide-y divide-slate-100">
              {data.units.map((unit) => <div key={unit.id} className="px-5 py-4 flex flex-wrap items-center gap-3"><div className="flex-1 min-w-[220px]"><div className="flex items-center gap-2"><span className="font-bold text-slate-800">{unit.title}</span>{!unit.isPublished && <span className="text-[10px] rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 font-bold">Draft</span>}</div><div className="h-2 bg-slate-100 rounded-full mt-2 max-w-md overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${unit.nodeCount ? Math.round(((unit.nodeCount - unit.incompleteNodes) / unit.nodeCount) * 100) : 0}%` }} /></div></div><div className="text-center min-w-20"><p className="font-black text-slate-800">{unit.nodeCount}</p><p className="text-[11px] text-slate-400">Nodes</p></div><div className="text-center min-w-20"><p className="font-black text-purple-700">{unit.questionCount}</p><p className="text-[11px] text-slate-400">ข้อสอบ</p></div><div className="text-center min-w-24"><p className={`font-black ${unit.incompleteNodes ? 'text-orange-600' : 'text-emerald-600'}`}>{unit.incompleteNodes}</p><p className="text-[11px] text-slate-400">ควรตรวจ</p></div><Link href="/admin/units" className="text-sm font-semibold text-emerald-600 hover:underline">จัดการ</Link></div>)}
            </div>
          </div>
        </>}
      </div>
    </div>
  );
}
