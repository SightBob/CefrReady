'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2, Eye, EyeOff, BookOpen, Loader2, AlertTriangle } from 'lucide-react';

interface VocabularyFormData {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  thaiMeaning: string;
  cefrLevel: string;
  topic: string;
  isPublished: boolean;
}

interface DuplicateWarning {
  id: number;
  word: string;
  cefrLevel: string;
}

interface VocabularyEditorProps {
  mode: 'new' | 'edit';
  vocabularyId?: number;
  initial?: Partial<VocabularyFormData>;
}

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const PARTS_OF_SPEECH = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'interjection'];

export default function VocabularyEditor({ mode, vocabularyId, initial }: VocabularyEditorProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [duplicates, setDuplicates] = useState<DuplicateWarning[]>([]);
  const [form, setForm] = useState<VocabularyFormData>({
    word: initial?.word ?? '',
    phonetic: initial?.phonetic ?? '',
    partOfSpeech: initial?.partOfSpeech ?? '',
    definition: initial?.definition ?? '',
    example: initial?.example ?? '',
    thaiMeaning: initial?.thaiMeaning ?? '',
    cefrLevel: initial?.cefrLevel ?? '',
    topic: initial?.topic ?? '',
    isPublished: initial?.isPublished ?? true,
  });

  const set = (field: keyof VocabularyFormData, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.word.trim()) { setError('กรุณากรอกคำศัพท์'); return; }
    if (!form.thaiMeaning.trim()) { setError('กรุณากรอกคำแปลภาษาไทย'); return; }
    if (!form.cefrLevel) { setError('กรุณาเลือกระดับ CEFR'); return; }
    if (!form.definition.trim()) { setError('กรุณากรอกนิยาม'); return; }

    setSaving(true);
    setError('');
    setDuplicates([]);

    try {
      const url = mode === 'new' ? '/api/admin/vocabularies' : `/api/admin/vocabularies/${vocabularyId}`;
      const method = mode === 'new' ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        if (json.warnings?.duplicates?.length) {
          setDuplicates(json.warnings.duplicates);
        } else {
          router.push('/admin/vocabularies');
        }
      } else {
        setError(json.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!vocabularyId) return;
    if (!confirm('ลบคำศัพท์นี้ถาวร?\n\nไม่สามารถกู้คืนได้')) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/vocabularies/${vocabularyId}?hard=true`, { method: 'DELETE' });
      router.push('/admin/vocabularies');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/admin/vocabularies" className="text-slate-500 hover:text-primary-600 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-xl">
                <BookOpen className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {mode === 'new' ? 'เพิ่มคำศัพท์ใหม่' : 'แก้ไขคำศัพท์'}
                </h1>
                <p className="text-sm text-slate-500">คำศัพท์ Must Know</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mode === 'edit' && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 border border-red-200 rounded-xl text-sm font-medium transition-colors"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                ลบ
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary inline-flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {duplicates.length > 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">
                  พบคำว่า &lsquo;{duplicates[0].word}&rsquo; ที่ระดับ {duplicates[0].cefrLevel} แล้ว {duplicates.length} รายการ
                </p>
                <Link
                  href={`/admin/vocabularies?search=${encodeURIComponent(duplicates[0].word)}&cefrLevel=${duplicates[0].cefrLevel}`}
                  className="text-amber-700 underline hover:text-amber-900 text-xs mt-1 inline-block"
                >
                  ดูรายการที่ซ้ำ
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main editor */}
          <div className="lg:col-span-2 space-y-5">
            {/* Word + Phonetic */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    คำศัพท์ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.word}
                    onChange={e => set('word', e.target.value)}
                    placeholder="เช่น achieve"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">การออกเสียง</label>
                  <input
                    type="text"
                    value={form.phonetic}
                    onChange={e => set('phonetic', e.target.value)}
                    placeholder="เช่น /əˈtʃiːv/"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Definition */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                นิยาม (English) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.definition}
                onChange={e => set('definition', e.target.value)}
                placeholder="English definition"
                rows={3}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              />
            </div>

            {/* Example */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">ตัวอย่างประโยค</label>
              <textarea
                value={form.example}
                onChange={e => set('example', e.target.value)}
                placeholder='Example sentence'
                rows={2}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none italic"
              />
            </div>

            {/* Thai Meaning */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                คำแปลภาษาไทย <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.thaiMeaning}
                onChange={e => set('thaiMeaning', e.target.value)}
                placeholder="เช่น บรรลุผลสำเร็จ"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Publish toggle */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">สถานะ</h3>
              <button
                onClick={() => set('isPublished', !form.isPublished)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                  form.isPublished
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}
              >
                <span className="font-medium text-sm">
                  {form.isPublished ? '✓ เผยแพร่แล้ว' : '○ Draft'}
                </span>
                {form.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <p className="text-xs text-slate-400 mt-2">
                {form.isPublished ? 'นักเรียนสามารถเห็นคำศัพท์นี้ได้' : 'คำศัพท์ถูกซ่อนอยู่'}
              </p>
            </div>

            {/* Metadata */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">ข้อมูลคำศัพท์</h3>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  ระดับ CEFR <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.cefrLevel}
                  onChange={e => set('cefrLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                >
                  <option value="">— เลือกระดับ —</option>
                  {CEFR_LEVELS.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ชนิดคำ</label>
                <select
                  value={form.partOfSpeech}
                  onChange={e => set('partOfSpeech', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                >
                  <option value="">— เลือกชนิดคำ —</option>
                  {PARTS_OF_SPEECH.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">หมวดหมู่ (Topic)</label>
                <input
                  type="text"
                  value={form.topic}
                  onChange={e => set('topic', e.target.value)}
                  placeholder="เช่น Family, Academic, Work"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}