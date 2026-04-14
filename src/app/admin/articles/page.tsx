'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, BookOpen, Edit, Trash2, Eye, EyeOff,
  Loader2, Tag, GraduationCap, Search, Filter
} from 'lucide-react';

interface Article {
  id: number;
  title: string;
  slug: string | null;
  category: string | null;
  cefrLevel: string | null;
  tags: string[] | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  grammar: { label: 'ไวยากรณ์', color: 'bg-blue-100 text-blue-700' },
  vocabulary: { label: 'คำศัพท์', color: 'bg-emerald-100 text-emerald-700' },
};

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => { fetchArticles(); }, []);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/articles');
      const json = await res.json();
      if (json.success) setArticles(json.data);
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async (article: Article) => {
    await fetch(`/api/admin/articles/${article.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...article, isPublished: !article.isPublished }),
    });
    await fetchArticles();
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`ลบบทความ "${title}" ?\n\nการกระทำนี้ไม่สามารถยกเลิกได้`)) return;
    setDeleting(id);
    try {
      await fetch(`/api/admin/articles/${id}`, { method: 'DELETE' });
      setArticles(a => a.filter(x => x.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const filtered = articles.filter(a => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || a.category === filterCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-slate-500 hover:text-primary-600 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2.5 rounded-xl">
                <BookOpen className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">บทความ</h1>
                <p className="text-slate-500 text-sm">จัดการบทความไวยากรณ์และคำศัพท์</p>
              </div>
            </div>
          </div>
          <Link
            href="/admin/articles/new"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            สร้างบทความใหม่
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาบทความ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
            />
          </div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">ทุกหมวด</option>
            <option value="grammar">ไวยากรณ์</option>
            <option value="vocabulary">คำศัพท์</option>
          </select>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-6">
          <span className="text-sm text-slate-500">
            ทั้งหมด <strong className="text-slate-800">{filtered.length}</strong> บทความ
          </span>
          <span className="text-sm text-slate-400">|</span>
          <span className="text-sm text-emerald-600">
            Published: <strong>{filtered.filter(a => a.isPublished).length}</strong>
          </span>
          <span className="text-sm text-slate-400">|</span>
          <span className="text-sm text-amber-600">
            Draft: <strong>{filtered.filter(a => !a.isPublished).length}</strong>
          </span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">ยังไม่มีบทความ</h3>
            <p className="text-slate-400 mb-6 text-sm">เริ่มสร้างบทความใหม่เพื่ออธิบาย Grammar ต่างๆ</p>
            <Link href="/admin/articles/new" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              สร้างบทความแรก
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(article => (
              <div
                key={article.id}
                className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all px-5 py-4"
              >
                <div className="flex items-start gap-4">
                  {/* Status dot */}
                  <div className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${article.isPublished ? 'bg-emerald-500' : 'bg-amber-400'}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-slate-800 hover:text-primary-600 transition-colors">
                          {article.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {article.category && CATEGORY_LABELS[article.category] && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_LABELS[article.category].color}`}>
                              {CATEGORY_LABELS[article.category].label}
                            </span>
                          )}
                          {article.cefrLevel && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" />
                              {article.cefrLevel}
                            </span>
                          )}
                          {article.tags && article.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5" />
                              {tag}
                            </span>
                          ))}
                          {(article.tags?.length ?? 0) > 3 && (
                            <span className="text-xs text-slate-400">+{(article.tags!.length - 3)} อื่นๆ</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => togglePublish(article)}
                          className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 px-2 ${
                            article.isPublished
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-amber-500 hover:bg-amber-50'
                          }`}
                          title={article.isPublished ? 'เผยแพร่แล้ว (คลิกเพื่อซ่อน)' : 'Draft (คลิกเพื่อเผยแพร่)'}
                        >
                          {article.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          <span>{article.isPublished ? 'Published' : 'Draft'}</span>
                        </button>
                        <Link
                          href={`/admin/articles/${article.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="แก้ไข"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(article.id, article.title)}
                          disabled={deleting === article.id}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="ลบ"
                        >
                          {deleting === article.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />
                          }
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 mt-2">
                      อัปเดตล่าสุด: {new Date(article.updatedAt).toLocaleDateString('th-TH', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
