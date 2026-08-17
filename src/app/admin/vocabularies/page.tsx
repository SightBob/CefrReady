'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, BookOpen, Edit, Trash2, Eye, EyeOff,
  Loader2, Search, ChevronLeft, ChevronRight,
} from 'lucide-react';

interface Vocabulary {
  id: number;
  word: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  definition: string;
  example: string | null;
  thaiMeaning: string;
  cefrLevel: string;
  topic: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  totalPages: number;
}

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function AdminVocabulariesPage() {
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({ total: 0, page: 1, totalPages: 1 });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('search')) setSearch(params.get('search')!);
    if (params.get('cefrLevel')) setFilterLevel(params.get('cefrLevel')!);
  }, []);

  useEffect(() => { fetchVocabularies(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchVocabularies = async (page: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterLevel) params.set('cefrLevel', filterLevel);
      if (filterTopic) params.set('topic', filterTopic);
      params.set('page', String(page));
      params.set('limit', '50');

      const res = await fetch(`/api/admin/vocabularies?${params}`);
      const json = await res.json();
      if (json.success) {
        setVocabularies(json.data);
        setPagination({ total: json.total, page: json.page, totalPages: json.totalPages });
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async (item: Vocabulary) => {
    await fetch(`/api/admin/vocabularies/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, isPublished: !item.isPublished }),
    });
    await fetchVocabularies(pagination.page);
  };

  const handleDelete = async (id: number, word: string) => {
    if (!confirm(`ลบคำศัพท์ "${word}" ถาวร?\n\nไม่สามารถกู้คืนได้`)) return;
    setDeleting(id);
    try {
      await fetch(`/api/admin/vocabularies/${id}?hard=true`, { method: 'DELETE' });
      setVocabularies(v => v.filter(x => x.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const handleSearch = () => fetchVocabularies(1);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-slate-500 hover:text-primary-600 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-2.5 rounded-xl">
                <BookOpen className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">คำศัพท์</h1>
                <p className="text-slate-500 text-sm">จัดการคำศัพท์ Must Know</p>
              </div>
            </div>
          </div>
          <Link href="/admin/vocabularies/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            เพิ่มคำศัพท์ใหม่
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาคำศัพท์..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
            />
          </div>
          <select
            value={filterLevel}
            onChange={e => { setFilterLevel(e.target.value); }}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">ทุกระดับ CEFR</option>
            {CEFR_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <input
            type="text"
            placeholder="Topic"
            value={filterTopic}
            onChange={e => setFilterTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 w-32"
          />
          <button onClick={handleSearch} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-700 transition-colors">
            ค้นหา
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-6">
          <span className="text-sm text-slate-500">
            ทั้งหมด <strong className="text-slate-800">{pagination.total}</strong> คำ
          </span>
          <span className="text-sm text-slate-400">|</span>
          <span className="text-sm text-emerald-600">
            Published: <strong>{vocabularies.filter(v => v.isPublished).length}</strong>
          </span>
          <span className="text-sm text-slate-400">|</span>
          <span className="text-sm text-amber-600">
            Draft: <strong>{vocabularies.filter(v => !v.isPublished).length}</strong>
          </span>
          {pagination.totalPages > 1 && (
            <>
              <span className="text-sm text-slate-400">|</span>
              <span className="text-sm text-slate-500">
                หน้า {pagination.page}/{pagination.totalPages}
              </span>
            </>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : vocabularies.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">ยังไม่มีคำศัพท์</h3>
            <p className="text-slate-400 mb-6 text-sm">เริ่มเพิ่มคำศัพท์สำหรับหน้า Must Know</p>
            <Link href="/admin/vocabularies/new" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              เพิ่มคำศัพท์แรก
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {vocabularies.map(item => (
              <div key={item.id} className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all px-5 py-4">
                <div className="flex items-start gap-4">
                  <div className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${item.isPublished ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-slate-800">
                          {item.word}
                          {item.phonetic && <span className="ml-2 text-sm text-slate-400 font-mono">{item.phonetic}</span>}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {item.partOfSpeech && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              {item.partOfSpeech}
                            </span>
                          )}
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-900 text-white font-bold uppercase tracking-wider">
                            {item.cefrLevel}
                          </span>
                          {item.topic && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              {item.topic}
                            </span>
                          )}
                          <span className="text-xs text-slate-400 truncate max-w-xs">
                            {item.thaiMeaning}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => togglePublish(item)}
                          className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 px-2 ${
                            item.isPublished
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-amber-500 hover:bg-amber-50'
                          }`}
                        >
                          {item.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          <span>{item.isPublished ? 'Published' : 'Draft'}</span>
                        </button>
                        <Link
                          href={`/admin/vocabularies/${item.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(item.id, item.word)}
                          disabled={deleting === item.id}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          {deleting === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => fetchVocabularies(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  ก่อนหน้า
                </button>
                <span className="text-sm text-slate-500">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchVocabularies(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ถัดไป
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
