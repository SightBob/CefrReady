'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Search, FileText, Sparkles, Pen, BookOpen, Puzzle, Headphones, Loader2 } from 'lucide-react';

type TabId = 'overview' | 'grammar' | 'vocab';

const CEFR_LEVELS_INFO = [
  { range: 'A1 – A2', label: 'Beginner', thai: 'พื้นฐาน', badgeClass: 'bg-emerald-100 text-emerald-700' },
  { range: 'B1 – B2', label: 'Intermediate', thai: 'กลาง', badgeClass: 'bg-indigo-50 text-indigo-700' },
  { range: 'C1 – C2', label: 'Advanced', thai: 'สูง', badgeClass: 'bg-amber-100 text-amber-700' },
];

const EXAM_SECTIONS = [
  { name: 'Focus on Form', thai: 'ไวยากรณ์', icon: Pen },
  { name: 'Focus on Meaning', thai: 'ความเข้าใจเนื้อหา', icon: BookOpen },
  { name: 'Focus on Form & Meaning', thai: 'ผสมทั้งสองอย่าง', icon: Puzzle },
  { name: 'Listening', thai: 'ฟังแล้วตอบ', icon: Headphones },
];

export interface DbArticle {
  id: number;
  title: string;
  slug: string | null;
  category: string | null;
  cefrLevel: string | null;
  tags: string[] | null;
  content: string;
}

interface VocabItem {
  id: number;
  word: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  definition: string;
  example: string | null;
  thaiMeaning: string;
  cefrLevel: string;
  topic: string | null;
}

interface MustKnowClientProps {
  dbArticles: DbArticle[];
  totalVocabularies: number;
}

type CategoryFilter = string;
type CefrRangeFilter = 'all' | 'A1-A2' | 'B1-B2' | 'C1-C2';

const CEFR_BADGE: Record<string, string> = {
  A1: 'bg-emerald-100 text-emerald-700',
  A2: 'bg-emerald-100 text-emerald-700',
  B1: 'bg-indigo-50 text-indigo-700',
  B2: 'bg-indigo-50 text-indigo-700',
  C1: 'bg-amber-100 text-amber-700',
  C2: 'bg-amber-100 text-amber-700',
};

function getCefrBadge(level: string | null | undefined): string {
  if (!level) return 'bg-stone-100 text-stone-500';
  return CEFR_BADGE[level] || 'bg-stone-100 text-stone-500';
}

function inRange(level: string | null | undefined, range: CefrRangeFilter): boolean {
  if (range === 'all' || !level) return true;
  if (range === 'A1-A2') return level === 'A1' || level === 'A2';
  if (range === 'B1-B2') return level === 'B1' || level === 'B2';
  if (range === 'C1-C2') return level === 'C1' || level === 'C2';
  return true;
}

export default function MustKnowClient({ dbArticles, totalVocabularies }: MustKnowClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ทั้งหมด');
  const [cefrRangeFilter, setCefrRangeFilter] = useState<CefrRangeFilter>('all');
  const [grammarSearch, setGrammarSearch] = useState('');
  const [vocabSearch, setVocabSearch] = useState('');
  const [vocabItems, setVocabItems] = useState<VocabItem[]>([]);
  const [vocabTotal, setVocabTotal] = useState(totalVocabularies);
  const [vocabLoading, setVocabLoading] = useState(false);
  const vocabPageRef = useRef(1);
  const VOCAB_PAGE_SIZE = 50;

  const fetchVocab = useCallback(async (page: number, reset: boolean = false) => {
    setVocabLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(VOCAB_PAGE_SIZE),
        ...(cefrRangeFilter !== 'all' && { cefrRange: cefrRangeFilter }),
        ...(vocabSearch && { search: vocabSearch }),
      });
      const res = await fetch(`/api/vocabularies?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      if (reset) {
        setVocabItems(json.data);
        vocabPageRef.current = 1;
      } else {
        setVocabItems(prev => [...prev, ...json.data]);
      }
      setVocabTotal(json.total);
    } catch {
    } finally {
      setVocabLoading(false);
    }
  }, [cefrRangeFilter, vocabSearch]);

  useEffect(() => {
    if (activeTab === 'vocab') {
      fetchVocab(1, true);
    }
  }, [activeTab, cefrRangeFilter, vocabSearch]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    dbArticles.forEach(a => { if (a.category) cats.add(a.category); });
    return ['ทั้งหมด', ...Array.from(cats)];
  }, [dbArticles]);

  const cefrRangeOptions: { value: CefrRangeFilter; label: string }[] = [
    { value: 'all', label: 'ทุกระดับ' },
    { value: 'A1-A2', label: 'A1–A2' },
    { value: 'B1-B2', label: 'B1–B2' },
    { value: 'C1-C2', label: 'C1–C2' },
  ];

  const filteredGrammar = useMemo(() => {
    return dbArticles.filter((item) => {
      const matchesCategory = categoryFilter === 'ทั้งหมด' || item.category === categoryFilter;
      const matchesRange = inRange(item.cefrLevel, cefrRangeFilter);
      const matchesSearch =
        !grammarSearch ||
        item.title.toLowerCase().includes(grammarSearch.toLowerCase()) ||
        (item.content && item.content.toLowerCase().includes(grammarSearch.toLowerCase()));
      return matchesCategory && matchesRange && matchesSearch;
    });
  }, [dbArticles, categoryFilter, cefrRangeFilter, grammarSearch]);

  const hasMoreVocab = vocabItems.length < vocabTotal;

  return (
    <div className="min-h-[100dvh] bg-[#fafaf9] selection:bg-yellow-200 selection:text-stone-900">
      {/* Hero */}
      <div className="max-w-[860px] mx-auto px-6 pt-12 pb-8">
        <p className="text-[11px] font-medium tracking-[2px] uppercase text-indigo-500 mb-3">
          Grammar Library
        </p>
        <h1 className="text-[36px] font-extrabold tracking-tight text-stone-900 leading-[1.15]">
          Must <span className="text-indigo-500">Know</span>
          <br />
          Before the Exam
        </h1>
        <p className="text-[15px] text-stone-400 leading-relaxed mt-2.5">
          รวมบทความสรุปไวยากรณ์และคำศัพท์ภาษาอังกฤษ ครอบคลุม A1–C2
        </p>
      </div>

      {/* Tabs */}
      <div className="max-w-[860px] mx-auto px-6 pb-4">
        <div className="flex border-b border-stone-200/60">
          <button
            onClick={() => setActiveTab('overview')}
            className={`text-[13px] font-semibold px-4 pb-2.5 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'text-indigo-500 border-indigo-500'
                : 'text-stone-400 border-transparent hover:text-stone-500'
            }`}
          >
            ภาพรวม
          </button>
          <button
            onClick={() => setActiveTab('grammar')}
            className={`text-[13px] font-semibold px-4 pb-2.5 border-b-2 transition-colors ${
              activeTab === 'grammar'
                ? 'text-indigo-500 border-indigo-500'
                : 'text-stone-400 border-transparent hover:text-stone-500'
            }`}
          >
            บทความ
          </button>
          <button
            onClick={() => setActiveTab('vocab')}
            className={`text-[13px] font-semibold px-4 pb-2.5 border-b-2 transition-colors ${
              activeTab === 'vocab'
                ? 'text-indigo-500 border-indigo-500'
                : 'text-stone-400 border-transparent hover:text-stone-500'
            }`}
          >
            คำศัพท์
          </button>
        </div>
      </div>

      <div className="h-4" />

      <main className="max-w-[860px] mx-auto px-6 pb-12">
        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === 'overview' && (
          <section key="overview" className="animate-[fadeIn_0.4s_ease-out] space-y-10 pt-2">
            {/* CEFR Levels */}
            <div>
              <p className="text-[11px] font-medium tracking-[2px] uppercase text-indigo-500 mb-3">
                ระดับภาษา CEFR
              </p>
              <div className="space-y-2.5">
                {CEFR_LEVELS_INFO.map(info => (
                  <div
                    key={info.range}
                    className="flex items-center justify-between bg-white border border-stone-200/60 rounded-xl px-5 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`text-[11px] font-medium px-2.5 py-1 rounded font-mono ${info.badgeClass}`}>
                        {info.range}
                      </span>
                      <span className="text-[15px] font-semibold text-stone-800">
                        {info.label}
                        <span className="ml-2 text-stone-400 font-normal">({info.thai})</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Requirement callout */}
            <div>
              <p className="text-[11px] font-medium tracking-[2px] uppercase text-indigo-500 mb-3">
                เงื่อนไขสำคัญ
              </p>
              <div className="rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-orange-50/40 p-5">
                <p className="text-[14px] text-stone-700 leading-relaxed mb-3">
                  นักศึกษาทุกคนต้องมีระดับภาษาอย่างน้อย{' '}
                  <span className="inline-block mx-0.5 px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[12px] font-bold">
                    A2
                  </span>{' '}
                  เพื่อผ่านเงื่อนไขการจบการศึกษา
                </p>
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <div className="flex items-center gap-2 flex-1 px-3 py-2.5 bg-white/70 rounded-lg border border-red-200/60">
                    <span className="text-red-500 font-bold text-[14px]">✕</span>
                    <span className="text-[13px] text-stone-600">
                      ต่ำกว่า A2 <span className="text-stone-400">— ไม่ผ่านเงื่อนไข</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 px-3 py-2.5 bg-white/70 rounded-lg border border-emerald-200/60">
                    <span className="text-emerald-600 font-bold text-[14px]">✓</span>
                    <span className="text-[13px] text-stone-600">
                      A2 ขึ้นไป <span className="text-stone-400">— ผ่านเกณฑ์</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Exam Structure */}
            <div>
              <p className="text-[11px] font-medium tracking-[2px] uppercase text-indigo-500 mb-3">
                โครงสร้างข้อสอบ (4 ส่วน)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {EXAM_SECTIONS.map(section => {
                  const Icon = section.icon;
                  return (
                    <div
                      key={section.name}
                      className="group bg-white border border-stone-200/60 rounded-xl p-4 hover:border-stone-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-indigo-600" />
                        </div>
                        <p className="text-[14px] font-semibold text-stone-800">
                          {section.name}
                        </p>
                      </div>
                      <p className="text-[12px] text-stone-400 pl-11">{section.thai}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setActiveTab('grammar')}
                className="group relative overflow-hidden rounded-xl border border-stone-200/60 bg-white p-5 text-left hover:border-stone-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-indigo-700" />
                  </div>
                  <span className="text-2xl font-bold text-stone-800">{dbArticles.length}</span>
                </div>
                <p className="text-[10px] tracking-[2px] uppercase text-stone-400 font-medium mb-0.5">Grammar</p>
                <p className="text-[15px] font-semibold text-stone-800">บทความไวยากรณ์</p>
              </button>

              <button
                onClick={() => setActiveTab('vocab')}
                className="group relative overflow-hidden rounded-xl border border-stone-200/60 bg-white p-5 text-left hover:border-stone-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-amber-700" />
                  </div>
                  <span className="text-2xl font-bold text-stone-800">{totalVocabularies}</span>
                </div>
                <p className="text-[10px] tracking-[2px] uppercase text-stone-400 font-medium mb-0.5">Vocabulary</p>
                <p className="text-[15px] font-semibold text-stone-800">คำศัพท์ที่ต้องรู้</p>
              </button>
            </div>
          </section>
        )}

        {/* ===== GRAMMAR TAB ===== */}
        {activeTab === 'grammar' && (
          <section key="grammar" className="animate-[fadeIn_0.4s_ease-out]">
            {/* Filter pills */}
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`text-[12px] font-medium px-3.5 py-1.5 rounded-full border transition-colors ${
                    categoryFilter === cat
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-400 border-stone-200/60 hover:border-stone-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
              <span className="w-px bg-stone-200/60 self-stretch mx-1" />
              {cefrRangeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setCefrRangeFilter(opt.value)}
                  className={`text-[12px] font-medium px-3.5 py-1.5 rounded-full border transition-colors ${
                    cefrRangeFilter === opt.value
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-400 border-stone-200/60 hover:border-stone-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="mb-6 relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 group-focus-within:text-stone-400 transition-colors" />
              <input
                type="text"
                placeholder="ค้นหาบทความ..."
                value={grammarSearch}
                onChange={e => setGrammarSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200/60 bg-white text-sm text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-200 focus:border-stone-300 transition-all"
              />
            </div>

            {filteredGrammar.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-8 h-8 text-stone-200 mx-auto mb-3" />
                <p className="text-stone-300 text-sm">ไม่พบบทความที่ตรงตามเงื่อนไข</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredGrammar.map(item => (
                  <Link
                    key={item.id}
                    href={`/must-know/${item.slug || item.id}`}
                    className="group bg-white border border-stone-200/60 rounded-xl p-5 flex flex-col gap-3 hover:border-stone-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-medium tracking-[1.5px] uppercase text-stone-400">
                        {item.category || 'General'}
                      </span>
                      {item.cefrLevel && (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded flex-shrink-0 ${getCefrBadge(item.cefrLevel)}`}>
                          {item.cefrLevel}
                        </span>
                      )}
                    </div>
                    <h2 className="text-[16px] font-bold tracking-tight text-stone-800 leading-snug">
                      {item.title}
                    </h2>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-stone-200/60">
                        {item.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[11px] px-2.5 py-1 bg-stone-100 text-stone-400 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ===== VOCABULARY TAB ===== */}
        {activeTab === 'vocab' && (
          <section key="vocab" className="animate-[fadeIn_0.4s_ease-out]">
            <h2 className="text-lg font-bold tracking-tight text-stone-800 mb-3">
              คำศัพท์ที่ต้องรู้
            </h2>

            {/* Filter pills for CEFR range */}
            <div className="flex flex-wrap gap-2 mb-5">
              {cefrRangeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setCefrRangeFilter(opt.value)}
                  className={`text-[12px] font-medium px-3.5 py-1.5 rounded-full border transition-colors ${
                    cefrRangeFilter === opt.value
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-400 border-stone-200/60 hover:border-stone-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="mb-5 relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 group-focus-within:text-stone-400 transition-colors" />
              <input
                type="text"
                placeholder="ค้นหาคำศัพท์ (อังกฤษ/ไทย)..."
                value={vocabSearch}
                onChange={e => setVocabSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200/60 bg-white text-sm text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-200 focus:border-stone-300 transition-all"
              />
            </div>

            {!vocabLoading && vocabItems.length === 0 ? (
              <div className="text-center py-16">
                <Sparkles className="w-8 h-8 text-stone-200 mx-auto mb-3" />
                <p className="text-stone-300 text-sm">ไม่พบคำศัพท์ที่ตรงตามเงื่อนไข</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {vocabItems.map(item => (
                    <div
                      key={item.id}
                      className="bg-white border border-stone-200/60 rounded-lg px-4 py-3.5"
                    >
                      <p className="text-[15px] font-bold tracking-tight text-stone-800 mb-0.5">
                        {item.word}
                      </p>
                      <p className="text-[12px] text-stone-400 leading-relaxed">
                        {item.thaiMeaning}
                      </p>
                      <span className={`inline-block mt-2 text-[9px] font-medium px-1.5 py-0.5 rounded ${getCefrBadge(item.cefrLevel)}`}>
                        {item.cefrLevel}
                      </span>
                    </div>
                  ))}
                </div>

                {hasMoreVocab && (
                  <div className="text-center pt-8">
                    <button
                      onClick={() => {
                        vocabPageRef.current += 1;
                        fetchVocab(vocabPageRef.current, false);
                      }}
                      disabled={vocabLoading}
                      className="text-[12px] text-stone-400 hover:text-stone-600 border border-stone-200/60 rounded-full px-5 py-2 hover:border-stone-300 hover:shadow-sm transition-all disabled:opacity-50"
                    >
                      {vocabLoading ? 'กำลังโหลด...' : 'แสดงเพิ่มเติม'}
                    </button>
                    <p className="text-[10px] text-stone-300 mt-2.5 tracking-wide">
                      {vocabItems.length} / {vocabTotal} รายการ
                    </p>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
