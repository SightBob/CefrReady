'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, BookOpen, Plus, ChevronDown, ChevronRight,
  Pencil, Trash2, CheckCircle, XCircle, Loader2, LayoutList, X, Check
} from 'lucide-react';

interface TestSet {
  id: number;
  sectionId: string;
  name: string;
  description: string | null;
  orderIndex: number;
  isActive: boolean;
  questionCount: number;
}

interface Section {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  testSets: TestSet[];
}

const SECTION_COLORS: Record<string, string> = {
  'focus-form': 'from-blue-500 to-cyan-500',
  'focus-meaning': 'from-emerald-500 to-teal-500',
  'form-meaning': 'from-purple-500 to-pink-500',
  'listening': 'from-orange-500 to-amber-500',
};

export default function AdminTestSetsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [createTarget, setCreateTarget] = useState<string | null>(null); // sectionId
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [editSet, setEditSet] = useState<TestSet | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TestSet | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/test-sets');
      const json = await res.json();
      if (json.success) {
        setSections(json.data);
        // auto-expand all sections
        const exp: Record<string, boolean> = {};
        json.data.forEach((s: Section) => { exp[s.id] = true; });
        setExpanded(exp);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createTarget || !createName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/test-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: createTarget, name: createName.trim(), description: createDesc.trim() || null }),
      });
      if (res.ok) {
        setCreateTarget(null);
        setCreateName('');
        setCreateDesc('');
        await fetchData();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async () => {
    if (!editSet) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/test-sets/${editSet.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() || null }),
      });
      if (res.ok) {
        setEditSet(null);
        await fetchData();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (set: TestSet) => {
    await fetch(`/api/admin/test-sets/${set.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !set.isActive }),
    });
    await fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/test-sets/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      await fetchData();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" /> กลับ Admin
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-xl">
              <LayoutList className="w-7 h-7 text-indigo-600" />
            </div>
            จัดการ Test Sets
          </h1>
          <p className="text-slate-500 mt-1">สร้างและจัดการชุดข้อสอบแต่ละ Section</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            {sections.map((section) => (
              <div key={section.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

                {/* Section header */}
                <button
                  onClick={() => setExpanded((e) => ({ ...e, [section.id]: !e[section.id] }))}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-10 rounded-full bg-gradient-to-b ${SECTION_COLORS[section.id] ?? 'from-slate-400 to-slate-500'}`} />
                    <div className="text-left">
                      <h2 className="text-lg font-bold text-slate-900">{section.name}</h2>
                      <p className="text-sm text-slate-500">{section.testSets.length} test sets</p>
                    </div>
                  </div>
                  {expanded[section.id]
                    ? <ChevronDown className="w-5 h-5 text-slate-400" />
                    : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </button>

                {/* Test sets list */}
                {expanded[section.id] && (
                  <div className="border-t border-slate-100">
                    {section.testSets.length === 0 ? (
                      <p className="px-6 py-4 text-sm text-slate-400">ยังไม่มี test set — สร้างใหม่ด้านล่าง</p>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {section.testSets.map((ts) => (
                          <div key={ts.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/70 transition-colors">
                            <BookOpen className={`w-5 h-5 flex-shrink-0 ${ts.isActive ? 'text-slate-400' : 'text-slate-200'}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold ${ts.isActive ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{ts.name}</p>
                              {ts.description && <p className="text-xs text-slate-400 truncate">{ts.description}</p>}
                              <p className="text-xs text-slate-400 mt-0.5">{ts.questionCount} คำถาม</p>
                            </div>

                            {/* Question count badge */}
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              ts.questionCount >= 20 ? 'bg-emerald-100 text-emerald-700' :
                              ts.questionCount > 0 ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {ts.questionCount}/20
                            </span>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                              <Link
                                href={`/admin/test-sets/${ts.id}`}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title="จัดการข้อสอบในชุด"
                              >
                                <BookOpen className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => { setEditSet(ts); setEditName(ts.name); setEditDesc(ts.description ?? ''); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="แก้ไขชื่อ"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleActive(ts)}
                                className={`p-1.5 rounded-lg transition-colors ${ts.isActive ? 'text-emerald-500 hover:bg-red-50 hover:text-red-500' : 'text-slate-300 hover:bg-emerald-50 hover:text-emerald-500'}`}
                                title={ts.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                              >
                                {ts.isActive ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => setDeleteTarget(ts)}
                                className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="ลบ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Create new set form */}
                    {createTarget === section.id ? (
                      <div className="px-6 py-4 bg-indigo-50 border-t border-indigo-100">
                        <p className="text-sm font-medium text-indigo-700 mb-3">สร้าง Test Set ใหม่ใน {section.name}</p>
                        <input
                          type="text"
                          placeholder="ชื่อชุด เช่น ชุดที่ 1 — A1 Basics"
                          value={createName}
                          onChange={(e) => setCreateName(e.target.value)}
                          className="w-full mb-2 px-3 py-2 rounded-lg border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                          autoFocus
                        />
                        <input
                          type="text"
                          placeholder="คำอธิบาย (ไม่จำเป็น)"
                          value={createDesc}
                          onChange={(e) => setCreateDesc(e.target.value)}
                          className="w-full mb-3 px-3 py-2 rounded-lg border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleCreate}
                            disabled={creating || !createName.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            สร้าง
                          </button>
                          <button onClick={() => { setCreateTarget(null); setCreateName(''); setCreateDesc(''); }} className="px-4 py-2 text-sm text-slate-600 hover:bg-white rounded-lg transition-colors">
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setCreateTarget(section.id); setCreateName(''); setCreateDesc(''); }}
                        className="w-full flex items-center gap-2 px-6 py-3.5 text-sm text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border-t border-slate-50"
                      >
                        <Plus className="w-4 h-4" />
                        สร้าง Test Set ใหม่
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editSet && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-7">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-slate-900">แก้ไข Test Set</h2>
              <button onClick={() => setEditSet(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full mb-3 px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
            />
            <label className="block text-sm font-medium text-slate-700 mb-1">คำอธิบาย</label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={2}
              className="w-full mb-5 px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => setEditSet(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors">ยกเลิก</button>
              <button onClick={handleEdit} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-7">
            <h2 className="text-xl font-bold text-slate-900 mb-3">ลบ Test Set?</h2>
            <p className="text-slate-600 mb-1">จะลบ <span className="font-semibold">{deleteTarget.name}</span> และการ assign ข้อสอบทุกข้อออกจาก set นี้</p>
            <p className="text-sm text-slate-400 mb-6">คำถามใน database จะ <strong>ไม่ถูกลบ</strong></p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors">ยกเลิก</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium flex items-center justify-center gap-2 transition-colors">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
