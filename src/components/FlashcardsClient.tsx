'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BookmarkPlus,
  Brain,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trash2,
  Edit3,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Layers,
  BookOpen,
  Loader2,
  Filter,
} from 'lucide-react';
import Link from 'next/link';

interface DictMeaning {
  partOfSpeech: string;
  definitions: { definition: string; example?: string | null }[];
}

interface Flashcard {
  id: number;
  term: string;
  contextSentence: string | null;
  userMeaning: string | null;
  dictData: { word: string; phonetic?: string | null; translation_th?: string | null; meanings: DictMeaning[] } | null;
  status: string;
  reviewCount: number;
  lastReviewedAt: string | null;
  createdAt: string;
}

type FilterStatus = 'all' | 'new' | 'learning' | 'mastered';
type ViewMode = 'grid' | 'review';

export default function FlashcardsClient() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [reviewIndex, setReviewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editMeaning, setEditMeaning] = useState('');

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterStatus === 'all'
        ? '/api/flashcards'
        : `/api/flashcards?status=${filterStatus}`;
      const res = await fetch(url);
      const data = await res.json();
      setCards(data.flashcards || []);
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  const handleSpeak = (word: string) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(word);
      u.lang = 'en-US';
      window.speechSynthesis.speak(u);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('ลบ flashcard นี้ออก?')) return;
    await fetch(`/api/flashcards/${id}`, { method: 'DELETE' });
    setCards(prev => prev.filter(c => c.id !== id));
  };

  const handleStatusChange = async (id: number, status: string) => {
    await fetch(`/api/flashcards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewCount: (cards.find(c => c.id === id)?.reviewCount ?? 0) + 1, lastReviewedAt: new Date().toISOString() }),
    });
    setCards(prev => prev.map(c => c.id === id ? { ...c, status, reviewCount: c.reviewCount + 1 } : c));
  };

  const handleSaveMeaning = async (id: number) => {
    await fetch(`/api/flashcards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMeaning: editMeaning }),
    });
    setCards(prev => prev.map(c => c.id === id ? { ...c, userMeaning: editMeaning } : c));
    setEditingId(null);
  };

  const reviewCards = cards;
  const currentCard = reviewCards[reviewIndex];

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    learning: 'bg-amber-100 text-amber-700',
    mastered: 'bg-emerald-100 text-emerald-700',
  };

  const stats = {
    all: cards.length,
    new: cards.filter(c => c.status === 'new').length,
    learning: cards.filter(c => c.status === 'learning').length,
    mastered: cards.filter(c => c.status === 'mastered').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  Flashcards ของฉัน
                </h1>
                <p className="text-sm text-slate-500">{stats.all} คำศัพท์ทั้งหมด</p>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <BookOpen className="w-4 h-4 inline mr-1" />
                  คลัง
                </button>
                <button
                  onClick={() => { setViewMode('review'); setReviewIndex(0); setFlipped(false); }}
                  disabled={cards.length === 0}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40 ${viewMode === 'review' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Brain className="w-4 h-4 inline mr-1" />
                  ทบทวน
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {(['all', 'new', 'learning', 'mastered'] as FilterStatus[]).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`p-3 rounded-2xl text-center border-2 transition-all ${filterStatus === s ? 'border-indigo-500 bg-indigo-50' : 'border-transparent bg-white hover:border-slate-200'}`}
            >
              <div className="text-2xl font-bold text-slate-900">{stats[s]}</div>
              <div className="text-xs text-slate-500 mt-0.5 capitalize">
                {s === 'all' ? 'ทั้งหมด' : s === 'new' ? 'ใหม่' : s === 'learning' ? 'กำลังเรียน' : 'จำได้แล้ว'}
              </div>
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && cards.length === 0 && (
          <div className="text-center py-20">
            <BookmarkPlus className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-700 mb-2">ยังไม่มี Flashcard</h2>
            <p className="text-slate-500 mb-6">
              คลิกที่คำศัพท์ในข้อสอบหรือบทความเพื่อเพิ่มลงในคลัง
            </p>
            <Link
              href="/tests"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              ไปทำข้อสอบ
            </Link>
          </div>
        )}

        {/* ===== GRID VIEW ===== */}
        {!loading && viewMode === 'grid' && cards.length > 0 && (
          <>
            {/* Filter */}
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-500">กรอง:</span>
              {(['all', 'new', 'learning', 'mastered'] as FilterStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {s === 'all' ? 'ทั้งหมด' : s === 'new' ? 'ใหม่' : s === 'learning' ? 'กำลังเรียน' : 'จำได้แล้ว'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map(card => (
                <div key={card.id} className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-all group">
                  {/* Term */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-slate-900">{card.term}</span>
                        <button
                          onClick={() => handleSpeak(card.term)}
                          className="p-1 rounded-full hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      </div>
                      {card.dictData?.phonetic && (
                        <span className="text-xs text-indigo-500 font-mono">{card.dictData.phonetic}</span>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[card.status] || 'bg-slate-100 text-slate-600'}`}>
                      {card.status === 'new' ? 'ใหม่' : card.status === 'learning' ? 'เรียนอยู่' : 'จำได้แล้ว'}
                    </span>
                  </div>

                  {/* Thai Translation */}
                  {card.dictData?.translation_th && (
                    <div className="mb-3 bg-indigo-50 border border-indigo-100 rounded-lg p-2.5">
                      <p className="text-indigo-700 font-medium text-sm">
                        แปลว่า: <span className="text-indigo-900 text-base">{card.dictData.translation_th}</span>
                      </p>
                    </div>
                  )}

                  {/* Dict Definition */}
                  {card.dictData?.meanings?.[0] && (
                    <div className="mb-3">
                      <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                        {card.dictData.meanings[0].partOfSpeech}
                      </span>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed line-clamp-2">
                        {card.dictData.meanings[0].definitions[0]?.definition}
                      </p>
                    </div>
                  )}

                  {/* User Meaning */}
                  {editingId === card.id ? (
                    <div className="mb-3">
                      <input
                        type="text"
                        value={editMeaning}
                        onChange={e => setEditMeaning(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveMeaning(card.id)}
                        className="w-full px-2 py-1.5 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        placeholder="ความหมายของคุณ..."
                        autoFocus
                      />
                      <div className="flex gap-2 mt-1.5">
                        <button
                          onClick={() => handleSaveMeaning(card.id)}
                          className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-lg"
                        >
                          บันทึก
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs px-3 py-1 bg-slate-100 text-slate-600 rounded-lg"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 mb-3 cursor-pointer hover:bg-emerald-100 transition-colors flex items-center gap-2 group/edit"
                      onClick={() => { setEditingId(card.id); setEditMeaning(card.userMeaning || ''); }}
                    >
                      <span className="flex-1">{card.userMeaning || <span className="text-slate-400 italic">+ เพิ่มความหมายของคุณ</span>}</span>
                      <Edit3 className="w-3.5 h-3.5 text-emerald-500 opacity-0 group-hover/edit:opacity-100" />
                    </div>
                  )}

                  {/* Context */}
                  {card.contextSentence && (
                    <p className="text-xs text-slate-400 italic line-clamp-2 mb-3 border-l-2 border-slate-200 pl-2">
                      {card.contextSentence}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex gap-1">
                      {(['new', 'learning', 'mastered'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(card.id, s)}
                          className={`text-xs px-2 py-1 rounded-lg font-medium transition-all ${card.status === s ? statusColors[s] + ' font-bold' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        >
                          {s === 'new' ? 'ใหม่' : s === 'learning' ? 'เรียนอยู่' : 'จำได้แล้ว ✓'}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handleDelete(card.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ===== REVIEW MODE ===== */}
        {!loading && viewMode === 'review' && cards.length > 0 && currentCard && (
          <div className="max-w-lg mx-auto">
            {/* Progress */}
            <div className="flex items-center justify-between mb-4 text-sm text-slate-500">
              <span>การ์ด {reviewIndex + 1} / {reviewCards.length}</span>
              <div className="flex-1 mx-4 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                  style={{ width: `${((reviewIndex + 1) / reviewCards.length) * 100}%` }}
                />
              </div>
              <span>{Math.round(((reviewIndex + 1) / reviewCards.length) * 100)}%</span>
            </div>

            {/* Flashcard */}
            <div
              className="relative cursor-pointer select-none"
              style={{ perspective: '1200px' }}
              onClick={() => setFlipped(f => !f)}
            >
              <div
                className="relative transition-all duration-500 ease-in-out"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  minHeight: '280px',
                }}
              >
                {/* Front */}
                <div
                  className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 flex flex-col items-center justify-center shadow-2xl"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="text-4xl font-bold text-white mb-2">{currentCard.term}</span>
                  {currentCard.dictData?.phonetic && (
                    <span className="text-indigo-200 font-mono text-lg">{currentCard.dictData.phonetic}</span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); handleSpeak(currentCard.term); }}
                    className="mt-4 p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <Volume2 className="w-5 h-5 text-white" />
                  </button>
                  <p className="text-indigo-200 text-sm mt-6">แตะเพื่อดูความหมาย</p>
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0 bg-white rounded-3xl p-8 flex flex-col justify-center shadow-2xl"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <span className="text-2xl font-bold text-slate-900 mb-1">{currentCard.term}</span>

                  {/* Thai Translation */}
                  {currentCard.dictData?.translation_th && (
                    <div className="mb-3 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                      <p className="text-indigo-700 font-medium text-sm mb-0.5">แปลว่า</p>
                      <p className="text-indigo-900 font-bold text-lg">{currentCard.dictData.translation_th}</p>
                    </div>
                  )}

                  {currentCard.userMeaning && (
                    <div className="mb-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <p className="text-sm font-semibold text-emerald-600 mb-0.5">ความหมายของคุณ</p>
                      <p className="text-slate-800 font-medium">{currentCard.userMeaning}</p>
                    </div>
                  )}

                  {currentCard.dictData?.meanings?.[0] && (
                    <div className="mb-3">
                      <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                        {currentCard.dictData.meanings[0].partOfSpeech}
                      </span>
                      <p className="text-slate-700 text-sm mt-2 leading-relaxed">
                        {currentCard.dictData.meanings[0].definitions[0]?.definition}
                      </p>
                      {currentCard.dictData.meanings[0].definitions[0]?.example && (
                        <p className="text-slate-400 text-xs mt-1 italic">
                          &ldquo;{currentCard.dictData.meanings[0].definitions[0].example}&rdquo;
                        </p>
                      )}
                    </div>
                  )}

                  {currentCard.contextSentence && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-xs font-semibold text-amber-700 mb-1">บริบทที่เจอ</p>
                      <p className="text-xs text-amber-800 leading-relaxed">{currentCard.contextSentence}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Review Buttons */}
            {flipped && (
              <div className="grid grid-cols-3 gap-3 mt-14 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <button
                  onClick={() => { handleStatusChange(currentCard.id, 'new'); setFlipped(false); setReviewIndex(i => Math.min(i + 1, reviewCards.length - 1)); }}
                  className="flex flex-col items-center gap-1 py-3 bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl font-medium text-sm hover:bg-red-100 transition-all active:scale-95"
                >
                  <XCircle className="w-5 h-5" />
                  ยังจำไม่ได้
                </button>
                <button
                  onClick={() => { handleStatusChange(currentCard.id, 'learning'); setFlipped(false); setReviewIndex(i => Math.min(i + 1, reviewCards.length - 1)); }}
                  className="flex flex-col items-center gap-1 py-3 bg-amber-50 border-2 border-amber-200 text-amber-700 rounded-2xl font-medium text-sm hover:bg-amber-100 transition-all active:scale-95"
                >
                  <RotateCcw className="w-5 h-5" />
                  กำลังจำ
                </button>
                <button
                  onClick={() => { handleStatusChange(currentCard.id, 'mastered'); setFlipped(false); setReviewIndex(i => Math.min(i + 1, reviewCards.length - 1)); }}
                  className="flex flex-col items-center gap-1 py-3 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 rounded-2xl font-medium text-sm hover:bg-emerald-100 transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  จำได้แล้ว!
                </button>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => { setReviewIndex(i => Math.max(0, i - 1)); setFlipped(false); }}
                disabled={reviewIndex === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                ก่อนหน้า
              </button>

              {reviewIndex === reviewCards.length - 1 ? (
                <button
                  onClick={() => { setReviewIndex(0); setFlipped(false); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  ทบทวนใหม่
                </button>
              ) : (
                <button
                  onClick={() => { setReviewIndex(i => Math.min(i + 1, reviewCards.length - 1)); setFlipped(false); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-all"
                >
                  ถัดไป
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
