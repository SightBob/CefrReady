'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Trash2, Pencil, ChevronUp, ChevronDown, ChevronRight, ChevronDown as ChevronDownIcon,
  Map as MapIcon, BookOpen, Star, Package, Trophy, Loader2, Check, X, Eye, EyeOff, Layers,
  Download, Upload, FileDown,} from 'lucide-react';

// ============================================================
// Types (mirror DB rows via /api/admin/units)
// ============================================================

interface NodeRow {
  id: number;
  unitId: number;
  title: string;
  kind: string;
  orderIndex: number;
  isPublished: boolean;
}

interface UnitRow {
  id: number;
  title: string;
  subtitle: string | null;
  colorKey: string;
  orderIndex: number;
  isPublished: boolean;
  nodes: NodeRow[];
}

interface PageRow {
  id: number;
  nodeId: number;
  pageType: string;
  sections: Array<{ heading: string; body: string }> | null;
  quiz: { sentence: string; options: string[]; answerIndex: number; explanation: string } | null;
  vocabBank: Array<{ subject: string; verbForm: string; example: string }> | null;
  tip: string | null;
  orderIndex: number;
}

const COLOR_OPTIONS: Array<{ key: string; label: string; class: string }> = [
  { key: 'green', label: 'เขียว', class: 'bg-[#58CC02]' },
  { key: 'blue', label: 'ฟ้า', class: 'bg-[#1CB0F6]' },
  { key: 'purple', label: 'ม่วง', class: 'bg-[#CE82FF]' },
  { key: 'orange', label: 'ส้ม', class: 'bg-[#FF9600]' },
];

const KIND_META: Record<string, { label: string; icon: typeof Star }> = {
  star: { label: 'บทเรียน', icon: Star },
  chest: { label: 'โบนัส', icon: Package },
  trophy: { label: 'ท้าทาย', icon: Trophy },
};

export default function AdminUnitsPage() {
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Expanded UI state
  const [expandedUnits, setExpandedUnits] = useState<Record<number, boolean>>({});
  const [expandedNodes, setExpandedNodes] = useState<Record<number, boolean>>({});
  const [pagesOf, setPagesOf] = useState<Record<number, PageRow[]>>({});

  // Create / edit forms
  const [newUnit, setNewUnit] = useState<{ title: string; subtitle: string; colorKey: string } | null>(null);
  const [editUnit, setEditUnit] = useState<UnitRow | null>(null);
  const [newNodeUnit, setNewNodeUnit] = useState<{ unitId: number; title: string; kind: string } | null>(null);
  const [editNode, setEditNode] = useState<NodeRow | null>(null);

  // Import / export
  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExport = () => {
    // Browser handles the download via Content-Disposition; just navigate.
    window.location.href = '/api/admin/units/export';
    toast.success('กำลังดาวน์โหลดไฟล์ JSON');
  };

  const handleImportFile = async (file: File) => {
    let payload: unknown;
    try {
      payload = JSON.parse(await file.text());
    } catch {
      toast.error('ไฟล์ไม่ใช่ JSON ที่ถูกต้อง');
      return;
    }

    const previewUnits = (payload as { units?: unknown[] }).units;
    const unitCount = Array.isArray(previewUnits) ? previewUnits.length : 0;

    // Detect whether the file matches the current path exactly — offer replace
    const isLikelyFullSnapshot = Array.isArray(previewUnits) && unitCount > 0;
    let mode: 'merge' | 'replace' = 'merge';
    if (isLikelyFullSnapshot) {
      const useReplace = confirm(
        `ไฟล์นี้มี ${unitCount} ยูนิต\n\n` +
        'ตกลง = แทนที่ทั้งหมด (ลบข้อมูลปัจจุบันก่อนนำเข้า)\n' +
        'ยกเลิก = เพิ่มต่อท้าย (merge)'
      );
      mode = useReplace ? 'replace' : 'merge';
      if (useReplace && !confirm('ยืนยันอีกครั้ง: ข้อมูลเส้นทางการเรียนปัจจุบันทั้งหมดจะถูกลบถาวร — แน่ใจหรือไม่?')) return;
    }

    setImporting(true);
    try {
      const res = await fetch('/api/admin/units/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, mode }),
      });
      const json = await res.json();
      if (json.success) {
        const d = json.data as { unitCount: number; nodeCount: number; pageCount: number; mode: string };
        toast.success(`นำเข้าสำเร็จ (${d.mode === 'replace' ? 'แทนที่' : 'เพิ่มต่อ'}): ${d.unitCount} ยูนิต · ${d.nodeCount} โหนด · ${d.pageCount} หน้า`);
        await fetchData();
      } else {
        toast.error(json.error ?? 'นำเข้าไม่สำเร็จ');
      }
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/units');
      const json = await res.json();
      if (json.success) {
        setUnits(json.data);
        setExpandedUnits(Object.fromEntries(json.data.map((u: UnitRow) => [u.id, true])));
      } else {
        toast.error(json.error ?? 'โหลดข้อมูลไม่สำเร็จ');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchPages = async (nodeId: number) => {
    const res = await fetch(`/api/admin/nodes/${nodeId}/pages`);
    const json = await res.json();
    if (json.success) setPagesOf((p) => ({ ...p, [nodeId]: json.data }));
  };

  // ---------- Unit actions ----------
  const createUnit = async () => {
    if (!newUnit?.title.trim()) return;
    const res = await fetch('/api/admin/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUnit),
    });
    if (res.ok) {
      toast.success('สร้างยูนิตแล้ว');
      setNewUnit(null);
      await fetchData();
    } else {
      const j = await res.json().catch(() => null);
      toast.error(j?.error ?? 'สร้างไม่สำเร็จ');
    }
  };

  const saveUnit = async () => {
    if (!editUnit) return;
    const res = await fetch(`/api/admin/units/${editUnit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editUnit.title, subtitle: editUnit.subtitle, colorKey: editUnit.colorKey, isPublished: editUnit.isPublished }),
    });
    if (res.ok) {
      toast.success('บันทึกยูนิตแล้ว');
      setEditUnit(null);
      await fetchData();
    } else {
      const j = await res.json().catch(() => null);
      toast.error(j?.error ?? 'บันทึกไม่สำเร็จ');
    }
  };

  const deleteUnit = async (unit: UnitRow) => {
    if (!confirm(`ลบยูนิต "${unit.title}" ?\n\nโหนดและหน้าบทเรียนทั้งหมดในยูนิตนี้จะถูกลบด้วย (ลบถาวร)`)) return;
    const res = await fetch(`/api/admin/units/${unit.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('ลบยูนิตแล้ว');
      await fetchData();
    } else {
      toast.error('ลบไม่สำเร็จ');
    }
  };

  const toggleUnitPublish = async (unit: UnitRow) => {
    await fetch(`/api/admin/units/${unit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !unit.isPublished }),
    });
    await fetchData();
  };

  const moveUnit = async (unit: UnitRow, direction: 'up' | 'down') => {
    await fetch(`/api/admin/units/${unit.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction }),
    });
    await fetchData();
  };

  // ---------- Node actions ----------
  const createNode = async () => {
    if (!newNodeUnit?.title.trim()) return;
    const res = await fetch(`/api/admin/units/${newNodeUnit.unitId}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newNodeUnit.title, kind: newNodeUnit.kind, withExplainPage: true }),
    });
    if (res.ok) {
      toast.success('สร้างโหนดแล้ว (พร้อมหน้าเนื้อหาเริ่มต้น)');
      setNewNodeUnit(null);
      await fetchData();
    } else {
      const j = await res.json().catch(() => null);
      toast.error(j?.error ?? 'สร้างไม่สำเร็จ');
    }
  };

  const saveNode = async () => {
    if (!editNode) return;
    const res = await fetch(`/api/admin/nodes/${editNode.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editNode.title, kind: editNode.kind, isPublished: editNode.isPublished }),
    });
    if (res.ok) {
      toast.success('บันทึกโหนดแล้ว');
      setEditNode(null);
      await fetchData();
    } else {
      const j = await res.json().catch(() => null);
      toast.error(j?.error ?? 'บันทึกไม่สำเร็จ');
    }
  };

  const deleteNode = async (node: NodeRow) => {
    if (!confirm(`ลบโหนด "${node.title}" ?\n\nหน้าบทเรียนทั้งหมดในโหนดนี้จะถูกลบด้วย`)) return;
    const res = await fetch(`/api/admin/nodes/${node.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('ลบโหนดแล้ว');
      await fetchData();
    } else {
      toast.error('ลบไม่สำเร็จ');
    }
  };

  const moveNode = async (unitId: number, nodeId: number, direction: 'up' | 'down') => {
    await fetch(`/api/admin/units/${unitId}/nodes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId, direction }),
    });
    await fetchData();
  };

  // ---------- Page actions ----------
  const toggleExpandNode = async (nodeId: number) => {
    const next = !expandedNodes[nodeId];
    setExpandedNodes((e) => ({ ...e, [nodeId]: next }));
    if (next && !pagesOf[nodeId]) await fetchPages(nodeId);
  };

  const deletePage = async (nodeId: number, pageId: number) => {
    if (!confirm('ลบหน้านี้?')) return;
    const res = await fetch(`/api/admin/pages/${pageId}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('ลบหน้าแล้ว');
      await fetchPages(nodeId);
    } else {
      toast.error('ลบไม่สำเร็จ');
    }
  };

  const movePage = async (nodeId: number, pageId: number, direction: 'up' | 'down') => {
    await fetch(`/api/admin/nodes/${nodeId}/pages`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId, direction }),
    });
    await fetchPages(nodeId);
  };

  const createQuizPage = async (nodeId: number) => {
    const res = await fetch(`/api/admin/nodes/${nodeId}/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageType: 'quiz',
        quiz: {
          sentence: 'I ____ two brothers.',
          options: ['has', 'had', 'have', 'having'],
          answerIndex: 2,
          explanation: '',
        },
      }),
    });
    if (res.ok) {
      toast.success('เพิ่มหน้าคำถามแล้ว (แบบชั่วคราว — กดแก้ไขเพื่อปรับ)');
      await fetchPages(nodeId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" /> กลับ Admin
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-xl"><MapIcon className="w-7 h-7 text-emerald-600" /></div>
            จัดการเส้นทางการเรียน
          </h1>
          <p className="text-slate-500 mt-1">ยูนิต → โหนด (บทเรียน) → หน้าเนื้อหา/คำถาม — เพิ่ม ลบ แก้ไข และจัดลำดับได้ทั้งหมด</p>

          {/* Import / export toolbar */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
            >
              <Upload className="w-4 h-4" /> Export JSON
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:border-sky-300 hover:text-sky-700 transition-colors disabled:opacity-50"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {importing ? 'กำลังนำเข้า…' : 'Import JSON'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportFile(f);
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {units.map((unit, uIdx) => (
              <div key={unit.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-visible">
                {/* Unit row */}
                <div className="flex items-center gap-3 p-4">
                  <span className={`w-2.5 h-10 rounded-full ${COLOR_OPTIONS.find(c => c.key === unit.colorKey)?.class ?? 'bg-emerald-500'}`} />
                  <button
                    onClick={() => setExpandedUnits((e) => ({ ...e, [unit.id]: !e[unit.id] }))}
                    className="flex-1 text-left"
                  >
                    <p className="font-bold text-slate-900 flex items-center gap-2">
                      {expandedUnits[unit.id] ? <ChevronDownIcon className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      ยูนิต {uIdx + 1}: {unit.title}
                      {!unit.isPublished && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Draft</span>}
                    </p>
                    <p className="text-xs text-slate-400 ml-6">{unit.subtitle ?? '—'} · {unit.nodes.length} โหนด</p>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        window.location.href = `/api/admin/units/${unit.id}/export`;
                        toast.success(`กำลังดาวน์โหลดยูนิต "${unit.title}"`);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50"
                      title={`Export ยูนิตนี้ (${unit.nodes.length} โหนด)`}
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                    <button onClick={() => moveUnit(unit, 'up')} disabled={uIdx === 0} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30" title="ขึ้น"><ChevronUp className="w-4 h-4" /></button>
                    <button onClick={() => moveUnit(unit, 'down')} disabled={uIdx === units.length - 1} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30" title="ลง"><ChevronDown className="w-4 h-4" /></button>
                    <button onClick={() => toggleUnitPublish(unit)} className={`p-1.5 rounded-lg ${unit.isPublished ? 'text-emerald-500 hover:bg-red-50 hover:text-red-500' : 'text-slate-300 hover:bg-emerald-50 hover:text-emerald-500'}`} title={unit.isPublished ? 'ซ่อน' : 'เผยแพร่'}>
                      {unit.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setEditUnit(unit)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="แก้ไข"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => deleteUnit(unit)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50" title="ลบ"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                {/* Nodes */}
                {expandedUnits[unit.id] && (
                  <div className="border-t border-slate-100 pl-6 pr-4 py-3 space-y-1.5 bg-slate-50/50">
                    {unit.nodes.length === 0 && <p className="text-sm text-slate-400 py-2">ยังไม่มีโหนด</p>}
                    {unit.nodes.map((node, nIdx) => (
                      <div key={node.id} className="bg-white rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                          {KIND_META[node.kind] && React.createElement(KIND_META[node.kind].icon, { className: 'w-4 h-4 text-slate-400 shrink-0' })}
                          <button onClick={() => toggleExpandNode(node.id)} className="flex-1 text-left">
                            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                              {expandedNodes[node.id] ? <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                              {node.title}
                              {!node.isPublished && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Draft</span>}
                            </p>
                            <p className="text-xs text-slate-400 ml-5">{KIND_META[node.kind]?.label} · {(pagesOf[node.id] ?? []).length > 0 ? `${(pagesOf[node.id] ?? []).length} หน้า` : 'แตะเพื่อโหลดหน้า'}</p>
                          </button>
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => moveNode(unit.id, node.id, 'up')} disabled={nIdx === 0} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30" title="ขึ้น"><ChevronUp className="w-3.5 h-3.5" /></button>
                            <button onClick={() => moveNode(unit.id, node.id, 'down')} disabled={nIdx === unit.nodes.length - 1} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30" title="ลง"><ChevronDown className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditNode(node)} className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="แก้ไข"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteNode(node)} className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50" title="ลบ"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>

                        {/* Pages of this node */}
                        {expandedNodes[node.id] && (
                          <div className="border-t border-slate-50 px-3.5 py-2.5 space-y-1.5 bg-slate-50/70 rounded-b-xl">
                            {(pagesOf[node.id] ?? []).map((page, pIdx) => (
                              <div key={page.id} className="flex items-center gap-2 text-sm bg-white rounded-lg border border-slate-100 px-3 py-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${page.pageType === 'quiz' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'}`}>
                                  {page.pageType === 'quiz' ? 'คำถาม' : 'เนื้อหา'}
                                </span>
                                <span className="flex-1 truncate text-slate-600">
                                  {page.pageType === 'quiz' ? page.quiz?.sentence : page.sections?.[0]?.heading ?? '(ว่าง)'}
                                </span>
                                <button onClick={() => movePage(node.id, page.id, 'up')} disabled={pIdx === 0} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                                <button onClick={() => movePage(node.id, page.id, 'down')} disabled={pIdx === (pagesOf[node.id]?.length ?? 1) - 1} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                                <Link href={`/admin/units/pages/${page.id}`} className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="แก้ไขหน้า"><Pencil className="w-3.5 h-3.5" /></Link>
                                <button onClick={() => deletePage(node.id, page.id)} className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50" title="ลบหน้า"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            ))}
                            <div className="flex items-center gap-2 pt-1">
                              <button onClick={() => createQuizPage(node.id)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:bg-purple-50 px-2.5 py-1.5 rounded-lg transition-colors">
                                <Plus className="w-3.5 h-3.5" /> เพิ่มหน้าคำถาม
                              </button>
                              <Link href={`/admin/units/nodes/${node.id}/pages/new`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50 px-2.5 py-1.5 rounded-lg transition-colors">
                                <Plus className="w-3.5 h-3.5" /> เพิ่มหน้าเนื้อหา
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* New node form */}
                    {newNodeUnit?.unitId === unit.id ? (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-2">
                        <input
                          type="text"
                          placeholder="ชื่อโหนด เช่น Basic Rules"
                          value={newNodeUnit.title}
                          onChange={(e) => setNewNodeUnit({ ...newNodeUnit, title: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && createNode()}
                          className="w-full px-3 py-2 rounded-lg border border-emerald-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          autoFocus
                        />
                        <div className="flex items-center gap-2">
                          {Object.entries(KIND_META).map(([key, meta]) => {
                            const Icon = meta.icon;
                            return (
                              <button
                                key={key}
                                onClick={() => setNewNodeUnit({ ...newNodeUnit, kind: key })}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${newNodeUnit.kind === key ? 'border-emerald-400 bg-white text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                              >
                                <Icon className="w-3.5 h-3.5" /> {meta.label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={createNode} disabled={!newNodeUnit.title.trim()} className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                            <Check className="w-4 h-4" /> สร้าง
                          </button>
                          <button onClick={() => setNewNodeUnit(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-white rounded-lg">ยกเลิก</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setNewNodeUnit({ unitId: unit.id, title: '', kind: 'star' })}
                        className="w-full inline-flex items-center gap-2 px-3 py-2.5 text-sm text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                      >
                        <Plus className="w-4 h-4" /> เพิ่มโหนดในยูนิตนี้
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* New unit */}
            {newUnit ? (
              <div className="bg-white rounded-2xl border-2 border-emerald-200 p-5 space-y-3">
                <p className="text-sm font-bold text-emerald-700">สร้างยูนิตใหม่</p>
                <input
                  type="text"
                  placeholder="ชื่อยูนิต เช่น Subject-Verb Agreement"
                  value={newUnit.title}
                  onChange={(e) => setNewUnit({ ...newUnit, title: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="คำโปรย (ไม่จำเป็น)"
                  value={newUnit.subtitle}
                  onChange={(e) => setNewUnit({ ...newUnit, subtitle: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <div className="flex items-center gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setNewUnit({ ...newUnit, colorKey: c.key })}
                      className={`w-8 h-8 rounded-full ${c.class} ${newUnit.colorKey === c.key ? 'ring-4 ring-slate-200' : 'opacity-60'} transition-all`}
                      title={c.label}
                    />
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={createUnit} disabled={!newUnit.title.trim()} className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                    <Check className="w-4 h-4" /> สร้างยูนิต
                  </button>
                  <button onClick={() => setNewUnit(null)} className="px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50 rounded-xl">ยกเลิก</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setNewUnit({ title: '', subtitle: '', colorKey: COLOR_OPTIONS[units.length % 4].key })}
                className="w-full inline-flex items-center justify-center gap-2 py-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-sm font-semibold text-slate-400 hover:text-emerald-600 hover:border-emerald-300 transition-colors"
              >
                <Plus className="w-4 h-4" /> เพิ่มยูนิตใหม่
              </button>
            )}
          </div>
        )}
      </div>

      {/* Edit unit modal */}
      {editUnit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditUnit(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-slate-900">แก้ไขยูนิต</h2>
              <button onClick={() => setEditUnit(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ</label>
            <input type="text" value={editUnit.title} onChange={(e) => setEditUnit({ ...editUnit, title: e.target.value })} className="w-full mb-3 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            <label className="block text-sm font-medium text-slate-700 mb-1">คำโปรย</label>
            <input type="text" value={editUnit.subtitle ?? ''} onChange={(e) => setEditUnit({ ...editUnit, subtitle: e.target.value })} className="w-full mb-3 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            <label className="block text-sm font-medium text-slate-700 mb-1.5">สี</label>
            <div className="flex items-center gap-2 mb-5">
              {COLOR_OPTIONS.map((c) => (
                <button key={c.key} onClick={() => setEditUnit({ ...editUnit, colorKey: c.key })} className={`w-9 h-9 rounded-full ${c.class} ${editUnit.colorKey === c.key ? 'ring-4 ring-slate-200' : 'opacity-60'}`} title={c.label} />
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditUnit(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">ยกเลิก</button>
              <button onClick={saveUnit} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit node modal */}
      {editNode && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditNode(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-slate-900">แก้ไขโหนด</h2>
              <button onClick={() => setEditNode(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ</label>
            <input type="text" value={editNode.title} onChange={(e) => setEditNode({ ...editNode, title: e.target.value })} className="w-full mb-3 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            <label className="block text-sm font-medium text-slate-700 mb-1.5">ประเภท</label>
            <div className="flex items-center gap-2 mb-5">
              {Object.entries(KIND_META).map(([key, meta]) => {
                const Icon = meta.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setEditNode({ ...editNode, kind: key })}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${editNode.kind === key ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:text-slate-700'}`}
                  >
                    <Icon className="w-4 h-4" /> {meta.label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditNode(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">ยกเลิก</button>
              <button onClick={saveNode} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
