'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2, Eye, EyeOff, BookOpen, Loader2 } from 'lucide-react';

interface ArticleFormData {
  title: string;
  content: string;
  category: string;
  cefrLevel: string;
  tags: string;
  isPublished: boolean;
}

interface GrammarArticleEditorProps {
  mode: 'new' | 'edit';
  articleId?: number;
  initial?: Partial<ArticleFormData>;
}

const CEFR_LEVELS = ['', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function GrammarArticleEditor({ mode, articleId, initial }: GrammarArticleEditorProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<ArticleFormData>({
    title: initial?.title ?? '',
    content: initial?.content ?? '',
    category: initial?.category ?? '',
    cefrLevel: initial?.cefrLevel ?? '',
    tags: initial?.tags ?? '',
    isPublished: initial?.isPublished ?? false,
  });

  const set = (field: keyof ArticleFormData, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.title.trim()) { setError('กรุณากรอกชื่อบทความ'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      };
      const url = mode === 'new' ? '/api/admin/articles' : `/api/admin/articles/${articleId}`;
      const method = mode === 'new' ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        router.push('/admin/articles');
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
    if (!articleId) return;
    if (!confirm(`ลบบทความ "${form.title}" ?\n\nไม่สามารถยกเลิกได้`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/articles/${articleId}`, { method: 'DELETE' });
      router.push('/admin/articles');
    } finally {
      setDeleting(false);
    }
  };

  const renderMarkdown = (md: string) => {
    return md
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-slate-800 mt-4 mb-1">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-slate-900 mt-5 mb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-slate-900 mt-6 mb-2">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="italic text-slate-700">$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-slate-100 text-primary-700 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 text-slate-700 list-disc">$1</li>')
      .replace(/\n{2,}/g, '</p><p class="text-slate-700 mb-3">')
      .replace(/^(?!<[hlp])(.+)$/gm, '<p class="text-slate-700 mb-2">$1</p>');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/admin/articles" className="text-slate-500 hover:text-primary-600 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-xl">
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {mode === 'new' ? 'สร้างบทความใหม่' : 'แก้ไขบทความ'}
                </h1>
                <p className="text-sm text-slate-500">บทความไวยากรณ์ / คำศัพท์</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main editor */}
          <div className="lg:col-span-2 space-y-5">
            {/* Title */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                ชื่อบทความ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="เช่น Subject-Verb Agreement — ประธานกับกริยาต้องสอดคล้องกัน"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>

            {/* Content editor */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                <span className="text-sm font-medium text-slate-700">เนื้อหา (Markdown)</span>
                <button
                  onClick={() => setPreview(p => !p)}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-white transition-colors"
                >
                  {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {preview ? 'แก้ไข' : 'Preview'}
                </button>
              </div>

              {preview ? (
                <div
                  className="p-5 min-h-[400px] text-slate-700 leading-relaxed text-sm"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(form.content) || '<p class="text-slate-400 italic">ยังไม่มีเนื้อหา...</p>' }}
                />
              ) : (
                <div className="relative">
                  <textarea
                    value={form.content}
                    onChange={e => set('content', e.target.value)}
                    placeholder={`# หัวข้อหลัก\n\n## หัวข้อรอง\n\n**ตัวหนา**, *ตัวเอียง*, \`code\`\n\n- bullet\n- list`}
                    rows={22}
                    className="w-full p-5 font-mono text-sm border-0 resize-none focus:outline-none focus:ring-0 text-slate-800 leading-relaxed"
                  />
                  <div className="absolute bottom-3 right-4 text-xs text-slate-300">
                    {form.content.length.toLocaleString()} ตัวอักษร
                  </div>
                </div>
              )}
            </div>

            {/* Cheatsheet */}
            {!preview && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-mono text-slate-500 grid grid-cols-3 gap-2">
                {['# H1', '## H2', '### H3', '**ตัวหนา**', '*ตัวเอียง*', '`inline code`', '- bullet', '1. list', '> blockquote'].map(c => (
                  <span key={c} className="text-primary-600 bg-white px-2 py-1 rounded border border-slate-100">{c}</span>
                ))}
              </div>
            )}
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
                {form.isPublished ? 'นักเรียนสามารถเห็นบทความนี้ได้' : 'บทความถูกซ่อนอยู่'}
              </p>
            </div>

            {/* Metadata */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">ข้อมูลบทความ</h3>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">หมวดหมู่</label>
                <select
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                >
                  <option value="">— เลือกหมวด —</option>
                  <option value="grammar">ไวยากรณ์ (Grammar)</option>
                  <option value="vocabulary">คำศัพท์ (Vocabulary)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ระดับ CEFR</label>
                <select
                  value={form.cefrLevel}
                  onChange={e => set('cefrLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                >
                  {CEFR_LEVELS.map(l => (
                    <option key={l} value={l}>{l || '— ไม่ระบุ —'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Tags <span className="text-slate-400 font-normal">(คั่นด้วย comma)</span>
                </label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={e => set('tags', e.target.value)}
                  placeholder="subject-verb, present-tense"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
                {form.tags && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.tags.split(',').filter(t => t.trim()).map((tag, i) => (
                      <span key={i} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-700">
              <p className="font-semibold text-indigo-800 mb-1">💡 เคล็ดลับ</p>
              <p>Tags ที่ตรงกับ keyword ของข้อสอบ จะทำให้ระบบแสดงบทความที่เกี่ยวข้องตอนเฉลยได้อัตโนมัติ</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
