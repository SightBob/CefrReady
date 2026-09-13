'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Trash2, Pencil, ChevronUp, ChevronDown, ChevronRight, ChevronDown as ChevronDownIcon,
  Map as MapIcon, BookOpen, Star, Package, Trophy, Loader2, Check, X, Eye, EyeOff, Layers,
  Download, Upload, FileDown, Info,} from 'lucide-react';

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
  isPublished: boolean;
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
  const [backups, setBackups] = useState<Array<{ id: number; createdAt: string }>>([]);
  const [showFormat, setShowFormat] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExport = () => {
    // Browser handles the download via Content-Disposition; just navigate.
    window.location.href = '/api/admin/units/export';
    toast.success('กำลังดาวน์โหลดไฟล์ JSON');
  };

  const loadBackups = async () => {
    const res = await fetch('/api/admin/units/backups');
    const json = await res.json();
    if (json.success) setBackups(json.data);
    else toast.error(json.error ?? 'โหลด backup ไม่สำเร็จ');
  };

  const downloadBackup = (id: number) => {
    window.location.href = `/api/admin/units/backups/${id}`;
    toast.success('กำลังดาวน์โหลด backup');
  };

  const restoreBackup = async (id: number) => {
    if (!confirm('กู้คืน backup นี้หรือไม่? ข้อมูลปัจจุบันจะถูกแทนที่ และระบบจะสร้าง backup ใหม่ให้อัตโนมัติ')) return;
    setImporting(true);
    try {
      const backupRes = await fetch(`/api/admin/units/backups/${id}`);
      if (!backupRes.ok) throw new Error('โหลด backup ไม่สำเร็จ');
      const payload = await backupRes.json();
      const res = await fetch('/api/admin/units/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, mode: 'replace' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'กู้คืนไม่สำเร็จ');
      toast.success('กู้คืน backup สำเร็จ');
      await fetchData();
      await loadBackups();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'กู้คืนไม่สำเร็จ');
    } finally {
      setImporting(false);
    }
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

  // Drag-and-drop reorder for units — optimistic: UI updates instantly, then persists.
  const [dragging, setDragging] = useState<{ type: 'unit' | 'node'; id: number } | null>(null);
  const [dragOverUnit, setDragOverUnit] = useState<number | null>(null);
  const [dragOverNode, setDragOverNode] = useState<number | null>(null);

  const moveUnitToIndex = async (unit: UnitRow, toIndex: number) => {
    // Optimistic update
    const prev = units;
    const ordered = [...units];
    const from = ordered.findIndex((u) => u.id === unit.id);
    if (from === -1 || from === toIndex) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(toIndex, 0, moved);
    setUnits(ordered);
    try {
      const res = await fetch(`/api/admin/units/${unit.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toIndex }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setUnits(prev);
      toast.error('ย้ายลำดับไม่สำเร็จ');
    }
  };

  const moveNodeToIndex = async (unit: UnitRow, nodeId: number, toIndex: number) => {
    const prev = units;
    const ordered = [...unit.nodes];
    const from = ordered.findIndex((n) => n.id === nodeId);
    if (from === -1 || from === toIndex) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(toIndex, 0, moved);
    setUnits((us) => us.map((u) => (u.id === unit.id ? { ...u, nodes: ordered.map((n, i) => ({ ...n, orderIndex: i })) } : u)));
    try {
      const res = await fetch(`/api/admin/units/${unit.id}/nodes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, toIndex }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setUnits(prev);
      toast.error('ย้ายลำดับไม่สำเร็จ');
    }
  };

  const moveUnit = async (unit: UnitRow, direction: 'up' | 'down') => {
    const idx = units.findIndex((u) => u.id === unit.id);
    await moveUnitToIndex(unit, direction === 'up' ? idx - 1 : idx + 1);
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

  const duplicateNode = async (node: NodeRow) => {
    const res = await fetch(`/api/admin/nodes/${node.id}/duplicate`, { method: 'POST' });
    if (res.ok) { toast.success('คัดลอกโหนดเป็นฉบับร่างแล้ว'); await fetchData(); }
    else toast.error('คัดลอกโหนดไม่สำเร็จ');
  };

  const moveNode = async (unitId: number, nodeId: number, direction: 'up' | 'down') => {
    const unit = units.find((u) => u.id === unitId);
    if (!unit) return;
    const idx = unit.nodes.findIndex((n) => n.id === nodeId);
    await moveNodeToIndex(unit, nodeId, direction === 'up' ? idx - 1 : idx + 1);
  };

  // ---------- Page actions ----------
  const toggleExpandNode = async (nodeId: number) => {
    const next = !expandedNodes[nodeId];
    setExpandedNodes((e) => ({ ...e, [nodeId]: next }));
    if (next && !pagesOf[nodeId]) await fetchPages(nodeId);
  };

  const duplicatePage = async (nodeId: number, pageId: number) => {
    const res = await fetch(`/api/admin/pages/${pageId}/duplicate`, { method: 'POST' });
    if (res.ok) { toast.success('คัดลอกหน้าเป็นฉบับร่างแล้ว'); await fetchPages(nodeId); }
    else toast.error('คัดลอกหน้าไม่สำเร็จ');
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
            <button
              onClick={loadBackups}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors"
            >
              <Layers className="w-4 h-4" /> Backups
            </button>
            <button
              onClick={() => setShowFormat(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors"
            >
              <Info className="w-4 h-4" /> รูปแบบไฟล์ Import
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

        {backups.length > 0 && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-amber-800">Backup ก่อน Replace Import</p>
              <button onClick={() => setBackups([])} className="text-xs text-amber-600 hover:underline">ซ่อน</button>
            </div>
            <div className="space-y-1.5">
              {backups.slice().reverse().map((backup) => (
                <div key={backup.id} className="flex items-center gap-2 bg-white/70 rounded-lg px-3 py-2 text-xs">
                  <span className="flex-1 text-slate-600">#{backup.id} · {new Date(backup.createdAt).toLocaleString('th-TH')}</span>
                  <button onClick={() => downloadBackup(backup.id)} className="font-semibold text-sky-600 hover:underline">ดาวน์โหลด</button>
                  <button onClick={() => restoreBackup(backup.id)} disabled={importing} className="font-semibold text-amber-700 hover:underline disabled:opacity-50">กู้คืน</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {units.map((unit, uIdx) => (
              <div
                key={unit.id}
                className={`bg-white rounded-2xl shadow-sm border overflow-visible transition-opacity ${
                  dragOverUnit === unit.id && dragging?.type === 'unit' && dragging.id !== unit.id
                    ? 'border-emerald-400 ring-2 ring-emerald-200'
                    : 'border-slate-100'
                } ${dragging?.type === 'unit' && dragging.id === unit.id ? 'opacity-50' : ''}`}
                onDragOver={(e) => {
                  if (dragging?.type !== 'unit') return;
                  e.preventDefault();
                  setDragOverUnit(unit.id);
                }}
                onDragLeave={() => setDragOverUnit((cur) => (cur === unit.id ? null : cur))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverUnit(null);
                  if (dragging?.type !== 'unit' || dragging.id === unit.id) return;
                  const toIndex = units.findIndex((u) => u.id === unit.id);
                  const dragged = units.find((u) => u.id === dragging.id);
                  if (dragged && toIndex !== -1) moveUnitToIndex(dragged, toIndex);
                  setDragging(null);
                }}
              >
                {/* Unit row */}
                <div className="flex items-center gap-3 p-4">
                  <span
                    draggable
                    onDragStart={() => setDragging({ type: 'unit', id: unit.id })}
                    onDragEnd={() => { setDragging(null); setDragOverUnit(null); }}
                    className={`w-2.5 h-10 rounded-full cursor-grab active:cursor-grabbing ${COLOR_OPTIONS.find(c => c.key === unit.colorKey)?.class ?? 'bg-emerald-500'}`}
                    title="ลากเพื่อย้ายยูนิต"
                  />
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
                      <div
                        key={node.id}
                        className={`bg-white rounded-xl border transition-opacity ${
                          dragOverNode === node.id && dragging?.type === 'node' && dragging.id !== node.id
                            ? 'border-emerald-400 ring-2 ring-emerald-200'
                            : 'border-slate-100'
                        } ${dragging?.type === 'node' && dragging.id === node.id ? 'opacity-50' : ''}`}
                        onDragOver={(e) => {
                          if (dragging?.type !== 'node') return;
                          e.preventDefault();
                          setDragOverNode(node.id);
                        }}
                        onDragLeave={() => setDragOverNode((cur) => (cur === node.id ? null : cur))}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverNode(null);
                          if (dragging?.type !== 'node' || dragging.id === node.id) return;
                          const toIndex = unit.nodes.findIndex((n) => n.id === node.id);
                          if (toIndex !== -1) moveNodeToIndex(unit, dragging.id, toIndex);
                          setDragging(null);
                        }}
                      >
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                          <span
                            draggable
                            onDragStart={(e) => { e.stopPropagation(); setDragging({ type: 'node', id: node.id }); }}
                            onDragEnd={() => { setDragging(null); setDragOverNode(null); }}
                            className="cursor-grab active:cursor-grabbing shrink-0"
                            title="ลากเพื่อย้ายบทเรียน"
                          >
                            {KIND_META[node.kind] && React.createElement(KIND_META[node.kind].icon, { className: 'w-4 h-4 text-slate-400 shrink-0' })}
                          </span>
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
                            <button onClick={() => duplicateNode(node)} className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" title="คัดลอกโหนด"><Layers className="w-3.5 h-3.5" /></button>
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
                                {!page.isPublished && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Draft</span>}
                                <button onClick={() => movePage(node.id, page.id, 'up')} disabled={pIdx === 0} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                                <button onClick={() => movePage(node.id, page.id, 'down')} disabled={pIdx === (pagesOf[node.id]?.length ?? 1) - 1} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                                <button onClick={() => duplicatePage(node.id, page.id)} className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" title="คัดลอกหน้า"><Layers className="w-3.5 h-3.5" /></button>
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

      {/* Import format guide modal */}
      {showFormat && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowFormat(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Info className="w-5 h-5 text-sky-600" /> รูปแบบไฟล์ Import JSON
              </h2>
              <button onClick={() => setShowFormat(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <p className="text-sm text-slate-600 mb-3">
              ไฟล์ต้องเป็น JSON ที่มี key <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-bold">units</code> เป็น array — ดาวน์โหลดผ่านปุ่ม <b>Export JSON</b> ก็ได้ไฟล์ตามรูปแบบนี้ แล้วแก้ไขต่อได้เลย
            </p>

            <pre className="bg-slate-900 text-slate-100 text-[11px] leading-relaxed rounded-xl p-4 overflow-x-auto mb-4">{`{
  "units": [
    {
      "title": "Subject-Verb Agreement",     // บังคับ
      "subtitle": "เรียนรู้การผันกริยา",       // ไม่บังคับ
      "colorKey": "green",                    // green | blue | purple | orange
      "orderIndex": 0,                        // ไม่ใส่ = เรียงตามลำดับในไฟล์
      "isPublished": true,
      "nodes": [
        {
          "title": "Node 1: Singular Subject",  // บังคับ
          "kind": "star",                        // star | chest | trophy
          "isPublished": true,
          "pages": [
            {
              "pageType": "explain",              // explain | quiz
              "intro": "จำไว้เลย...",             // ไม่บังคับ
              "sections": [
                {
                  "heading": "หัวข้อ",
                  "body": "คำอธิบาย **ตัวหนา** และ ==ไฮไลต์== ได้",
                  "examples": [
                    { "en": "She works.", "th": "ถูก", "ok": true },
                    { "en": "She work.", "th": "ผิด", "ok": false }
                  ],
                  "table": {                       // ตาราง (ไม่บังคับ)
                    "headers": ["ประธาน", "กริยา"],
                    "rows": [["He", "plays"], ["They", "play"]]
                  },
                  "tap": {                         // Tap & Select (ไม่บังคับ)
                    "title": "แตะเลือกว่าถูกหรือผิด",
                    "items": [
                      {
                        "prompt": "She work at a bank.",
                        "choiceA": "ถูก",
                        "choiceB": "ผิด",
                        "correct": 1               // 0 = A ถูก, 1 = B ถูก
                      }
                    ]
                  }
                }
              ],
              "vocabBank": {                     // คลังศัพท์ (ไม่บังคับ)
                "columns": ["ประธาน", "รูปกริยา", "ตัวอย่าง"],
                "rows": [["He / She / It", "เติม s", "She plays."]]
              },
              "tip": "เคล็ดลับท้ายบท"            // ไม่บังคับ
            },
            {
              "pageType": "quiz",
              "quiz": {
                "sentence": "I ____ two brothers.",
                "options": ["has", "had", "have", "having"],
                "answerIndex": 2,                // index ของคำตอบที่ถูก (เริ่ม 0)
                "explanation": "ประธาน I ใช้ have"
              }
            }
          ]
        }
      ]
    }
  ]
}`}</pre>

            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sm text-slate-600 space-y-1.5">
              <p className="font-bold text-sky-800">ตอนกด Import จะมี 2 โหมด:</p>
              <p><b>ตกลง = แทนที่ทั้งหมด (replace)</b> — ลบข้อมูลปัจจุบันก่อนนำเข้า (ระบบสร้าง Backup อัตโนมัติให้ก่อนลบ)</p>
              <p><b>ยกเลิก = เพิ่มต่อท้าย (merge)</b> — เพิ่มยูนิตใหม่ต่อจากยูนิตที่มีอยู่</p>
              <p className="pt-1 text-xs text-slate-400">ช่องที่เขียนว่า "ไม่บังคับ" ลบทิ้งได้ — ระบบใช้ค่าเริ่มต้นให้เอง</p>
            </div>

            <button
              onClick={() => setShowFormat(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold"
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
