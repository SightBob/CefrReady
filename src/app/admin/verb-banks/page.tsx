'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, BookMarked, Pencil, Trash2, Loader2, Search, X, Save, Download, Upload,
} from 'lucide-react';
import {
  MAX_VERB_FORM_LENGTH,
  VERB_FORM_LABELS,
  validateVerbEntry,
  type VerbEntry,
  type VerbFormKey,
} from '@/lib/verb-bank';
import { parseVerbCsv, verbEntriesToCsv } from '@/lib/verb-bank-io';

import { notifyVerbEntriesChanged } from '@/lib/verb-bank-client';

const EMPTY_DRAFT = { v1: '', v2: '', v3: '' };
type Draft = typeof EMPTY_DRAFT;

export default function AdminVerbBankPage() {
  const [entries, setEntries] = useState<VerbEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  // ฟอร์มเพิ่มใหม่
  const [newDraft, setNewDraft] = useState<Draft>(EMPTY_DRAFT);
  const [creating, setCreating] = useState(false);
  const [newErrors, setNewErrors] = useState<Partial<Record<VerbFormKey, string>>>({});

  // แก้ไขแบบ inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editErrors, setEditErrors] = useState<Partial<Record<VerbFormKey, string>>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // import/export
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readError = async (response: Response, fallback: string) => {
    try {
      const body = await response.json();
      return body?.error || fallback;
    } catch {
      return fallback;
    }
  };

  const load = useCallback(async (keyword: string) => {
    setLoading(true);
    try {
      const url = keyword ? `/api/admin/verb-banks?search=${encodeURIComponent(keyword)}` : '/api/admin/verb-banks';
      const response = await fetch(url);
      if (!response.ok) throw new Error(await readError(response, 'โหลดคลังกริยาไม่สำเร็จ'));
      const body = await response.json();
      setEntries(Array.isArray(body.data) ? body.data : []);
    } catch (err) {
      setEntries([]);
      setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'โหลดคลังกริยาไม่สำเร็จ' });
    } finally {
      setLoading(false);
    }
  }, []);

  // ค้นหาแบบหน่วงเวลาสั้น ๆ ไม่ยิง API ทุกตัวอักษร
  useEffect(() => {
    const timer = setTimeout(() => { void load(search.trim()); }, 300);
    return () => clearTimeout(timer);
  }, [search, load]);

  const handleCreate = async () => {
    const { values, errors } = validateVerbEntry(newDraft);
    setNewErrors(errors);
    if (!values) return;

    setCreating(true);
    setNotice(null);
    try {
      const response = await fetch('/api/admin/verb-banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error(await readError(response, 'เพิ่มกริยาไม่สำเร็จ'));
      notifyVerbEntriesChanged();
      setNewDraft(EMPTY_DRAFT);
      setNotice({ tone: 'ok', text: `เพิ่ม "${values.v1} / ${values.v2} / ${values.v3}" แล้ว` });
      await load(search.trim());
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'เพิ่มกริยาไม่สำเร็จ' });
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (entry: VerbEntry) => {
    setEditingId(entry.id);
    setEditDraft({ v1: entry.v1, v2: entry.v2, v3: entry.v3 });
    setEditErrors({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditErrors({});
  };

  const handleSave = async (id: number) => {
    const { values, errors } = validateVerbEntry(editDraft);
    setEditErrors(errors);
    if (!values) return;

    setSavingId(id);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/verb-banks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error(await readError(response, 'บันทึกไม่สำเร็จ'));
      notifyVerbEntriesChanged();
      cancelEdit();
      setNotice({ tone: 'ok', text: `แก้ไข "${values.v1} / ${values.v2} / ${values.v3}" แล้ว` });
      await load(search.trim());
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ' });
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (entry: VerbEntry) => {
    const confirmed = window.confirm(`ลบ "${entry.v1} / ${entry.v2} / ${entry.v3}" ออกจากคลังใช่ไหม?`);
    if (!confirmed) return;

    setDeletingId(entry.id);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/verb-banks/${entry.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await readError(response, 'ลบไม่สำเร็จ'));
      notifyVerbEntriesChanged();
      if (editingId === entry.id) cancelEdit();
      setNotice({ tone: 'ok', text: `ลบ "${entry.v1}" แล้ว` });
      await load(search.trim());
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'ลบไม่สำเร็จ' });
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass = (invalid?: string) =>
    `w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-primary-500 ${
      invalid ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'
    }`;

  /** ดาวน์โหลดคลังทั้งหมดเป็น CSV (ไม่ยึดตามคำค้นหาปัจจุบัน) */
  const handleExport = async () => {
    setNotice(null);
    try {
      const response = await fetch('/api/admin/verb-banks');
      if (!response.ok) throw new Error(await readError(response, 'ดาวน์โหลดคลังกริยาไม่สำเร็จ'));
      const body = await response.json();
      const all: VerbEntry[] = Array.isArray(body.data) ? body.data : [];
      if (all.length === 0) {
        setNotice({ tone: 'error', text: 'คลังยังว่าง — ไม่มีอะไรให้ส่งออก' });
        return;
      }
      const csv = verbEntriesToCsv(all);
      // \uFEFF (BOM) ให้ Excel เปิดไฟล์ UTF-8 ภาษาไทยได้ถูกต้อง
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      anchor.download = `verb-bank-${stamp}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setNotice({ tone: 'ok', text: `ส่งออก ${all.length} รายการเป็นไฟล์ CSV แล้ว` });
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'ส่งออกไม่สำเร็จ' });
    }
  };

  /** อ่านไฟล์ CSV ที่เลือก ตรวจความถูกต้อง แล้วส่งให้ API นำเข้าแบบ merge */
  const handleImportFile = async (file: File) => {
    setNotice(null);
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parseVerbCsv(text);

      const rowErrors = parsed.rows.map((row) => {
        const { errors } = validateVerbEntry({ v1: row.v1, v2: row.v2, v3: row.v3 });
        const message = errors.v1 ?? errors.v2 ?? errors.v3;
        return message ? { line: row.line, message } : null;
      }).filter((item): item is { line: number; message: string } => item !== null);

      const allErrors = [...parsed.errors, ...rowErrors];
      const validRows = parsed.rows.filter(
        (row) => !allErrors.some((error) => error.line === row.line),
      );

      if (validRows.length === 0) {
        const detail = allErrors
          .slice(0, 5)
          .map((error) => `บรรทัด ${error.line}: ${error.message}`)
          .join(' · ');
        setNotice({
          tone: 'error',
          text: allErrors.length > 0
            ? `ไม่มีแถวไหนนำเข้าได้ — ${detail}${allErrors.length > 5 ? ' …' : ''}`
            : 'ไฟล์ไม่มีข้อมูลให้นำเข้า',
        });
        return;
      }

      const response = await fetch('/api/admin/verb-banks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows }),
      });
      if (!response.ok) throw new Error(await readError(response, 'นำเข้าไม่สำเร็จ'));
      const body = await response.json();
      const summary = body?.summary;
      const invalidCount = summary?.invalid?.length ?? 0;
      notifyVerbEntriesChanged();
      setNotice({
        tone: invalidCount > 0 ? 'error' : 'ok',
        text: `นำเข้าสำเร็จ ${summary?.inserted ?? 0} รายการ`
          + (summary?.duplicates ? ` · ข้ามที่ซ้ำ ${summary.duplicates}` : '')
          + (invalidCount > 0 ? ` · แถวที่ผิด ${invalidCount} (เช่น บรรทัด ${summary.invalid[0].line}: ${summary.invalid[0].message})` : ''),
      });
      await load(search.trim());
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'นำเข้าไม่สำเร็จ' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const renderCells = (
    draft: Draft,
    setDraft: (next: Draft) => void,
    errors: Partial<Record<VerbFormKey, string>>,
    disabled: boolean,
  ) =>
    (['v1', 'v2', 'v3'] as VerbFormKey[]).map((key) => (
      <td key={key} className="px-3 py-2 align-middle">
        <input
          type="text"
          value={draft[key]}
          disabled={disabled}
          maxLength={MAX_VERB_FORM_LENGTH}
          onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
          aria-label={VERB_FORM_LABELS[key]}
          className={inputClass(errors[key])}
        />
        {errors[key] && <p className="mt-1 text-xs text-red-600">{errors[key]}</p>}
      </td>
    ));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1049px] mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-slate-500 hover:text-primary-600 transition-colors" aria-label="กลับหน้า admin">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2.5 rounded-xl">
              <BookMarked className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">คลังกริยา 3 ช่อง</h1>
              <p className="text-slate-500 text-sm">
                แสดงใน sidebar หน้าสอบ · ตอนนี้มี {entries.length} รายการ
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleExport()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              ส่งออก CSV
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {importing ? 'กำลังนำเข้า…' : 'นำเข้า CSV'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleImportFile(file);
              }}
            />
          </div>
        </div>

        {notice && (
          <div
            role="status"
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              notice.tone === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {notice.text}
          </div>
        )}

        {/* เพิ่มใหม่ */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            <Plus className="mr-1 inline h-4 w-4" />
            เพิ่มกริยาใหม่
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {(['v1', 'v2', 'v3'] as VerbFormKey[]).map((key) => (
              <label key={key} className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">{VERB_FORM_LABELS[key]}</span>
                <input
                  type="text"
                  value={newDraft[key]}
                  maxLength={MAX_VERB_FORM_LENGTH}
                  onChange={(event) => setNewDraft({ ...newDraft, [key]: event.target.value })}
                  onKeyDown={(event) => { if (event.key === 'Enter') void handleCreate(); }}
                  placeholder={key === 'v1' ? 'go' : key === 'v2' ? 'went' : 'gone'}
                  className={inputClass(newErrors[key])}
                />
                {newErrors[key] && <p className="mt-1 text-xs text-red-600">{newErrors[key]}</p>}
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating}
            className="btn-primary mt-4 inline-flex items-center gap-2 disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {creating ? 'กำลังบันทึก…' : 'เพิ่มลงคลัง'}
          </button>
        </section>

        {/* ค้นหา */}
        <div className="relative mb-4 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาจาก V.1 / V.2 / V.3"
            aria-label="ค้นหากริยา"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary-500"
          />
        </div>

        {/* ตาราง */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="w-12 px-3 py-3 font-medium text-slate-500">#</th>
                <th className="px-3 py-3 font-medium text-slate-500">V.1</th>
                <th className="px-3 py-3 font-medium text-slate-500">V.2</th>
                <th className="px-3 py-3 font-medium text-slate-500">V.3</th>
                <th className="w-28 px-3 py-3 text-right font-medium text-slate-500">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-slate-400">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    กำลังโหลดคลังกริยา…
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-slate-500">
                    {search ? `ไม่พบกริยาที่ค้นหา "${search}"` : 'ยังไม่มีกริยาในคลัง — เพิ่มจากฟอร์มด้านบน'}
                  </td>
                </tr>
              ) : (
                entries.map((entry, index) => {
                  const isEditing = editingId === entry.id;
                  return (
                    <tr key={entry.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2 align-middle text-slate-400">{index + 1}</td>
                      {isEditing
                        ? renderCells(editDraft, setEditDraft, editErrors, savingId === entry.id)
                        : (
                          <>
                            <td className="px-3 py-2 align-middle font-medium text-slate-800">{entry.v1}</td>
                            <td className="px-3 py-2 align-middle text-slate-700">{entry.v2}</td>
                            <td className="px-3 py-2 align-middle text-slate-700">{entry.v3}</td>
                          </>
                        )}
                      <td className="px-3 py-2 text-right align-middle">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => void handleSave(entry.id)}
                              disabled={savingId === entry.id}
                              aria-label={`บันทึก ${entry.v1}`}
                              className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                            >
                              {savingId === entry.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Save className="h-4 w-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              aria-label={`ยกเลิกการแก้ไข ${entry.v1}`}
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(entry)}
                              aria-label={`แก้ไข ${entry.v1}`}
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(entry)}
                              disabled={deletingId === entry.id}
                              aria-label={`ลบ ${entry.v1}`}
                              className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
                            >
                              {deletingId === entry.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Trash2 className="h-4 w-4" />}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}