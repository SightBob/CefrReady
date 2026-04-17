'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { BookmarkPlus, Check, Loader2, X, Volume2, BookOpen } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface DictMeaning {
  partOfSpeech: string;
  definitions: { definition: string; example?: string | null }[];
}

interface DictData {
  word: string;
  phonetic?: string | null;
  translation_th?: string | null;
  meanings: DictMeaning[];
  notFound?: boolean;
}

interface PopupState {
  word: string;
  x: number;
  y: number;
  rect: DOMRect;
}

interface SelectableTextProps {
  text: string;
  contextSentence?: string; // ถ้าไม่ส่งมา จะใช้ประโยคจาก text เอง
  sourceType?: 'question' | 'article' | 'manual';
  sourceId?: number;
  className?: string;
}

export default function SelectableText({
  text,
  contextSentence,
  sourceType = 'manual',
  sourceId,
  className = '',
}: SelectableTextProps) {
  const { data: session } = useSession();
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [dictData, setDictData] = useState<DictData | null>(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [userMeaning, setUserMeaning] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // แยกข้อความเป็นคำๆ (รองรับ punctuation)
  const tokens = text.split(/(\s+|(?=[.,!?;:'"""()[\]—–-])|(?<=[.,!?;:'"""()[\]—–-]))/);

  const fetchDictionary = useCallback(async (word: string) => {
    // ลบ punctuation ออกก่อนค้นหา
    const cleanWord = word.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
    if (!cleanWord || cleanWord.length < 2) return;

    setDictLoading(true);
    setDictData(null);
    try {
      const res = await fetch(`/api/dictionary?word=${encodeURIComponent(cleanWord)}`);
      const data = await res.json();
      setDictData(data);
    } catch {
      setDictData(null);
    } finally {
      setDictLoading(false);
    }
  }, []);

  const handleWordClick = useCallback((word: string, e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const cleanWord = word.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
    if (!cleanWord || cleanWord.length < 2) return;

    const spanRect = (e.target as HTMLElement).getBoundingClientRect();
    setPopup({ word: cleanWord, x: spanRect.left, y: spanRect.bottom, rect: spanRect });
    setUserMeaning('');
    setSaved(false);
    setAlreadyExists(false);
    fetchDictionary(cleanWord);
  }, [fetchDictionary]);

  const handleSave = async () => {
    if (!session?.user || !popup) return;
    setSaving(true);

    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term: popup.word,
          contextSentence: contextSentence || text,
          sourceType,
          sourceId,
          userMeaning: userMeaning.trim() || null,
          dictData: dictData && !dictData.notFound ? dictData : null,
        }),
      });

      if (res.status === 409) {
        setAlreadyExists(true);
      } else if (res.ok) {
        setSaved(true);
        setTimeout(() => setPopup(null), 1200);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleSpeak = (word: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  // ปิด popup เมื่อคลิกนอก
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopup(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // คำนวณตำแหน่ง popup ให้ไม่เกินหน้าจอ
  const getPopupStyle = (): React.CSSProperties => {
    if (!popup) return {};
    const popupWidth = 300;
    const viewportWidth = window.innerWidth;
    const scrollY = window.scrollY;

    let left = popup.rect.left;
    if (left + popupWidth > viewportWidth - 16) {
      left = viewportWidth - popupWidth - 16;
    }
    if (left < 8) left = 8;

    return {
      position: 'fixed',
      left: `${left}px`,
      top: `${popup.rect.bottom + 8}px`,
      width: `${popupWidth}px`,
      zIndex: 9999,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  };
  void getPopupStyle; // suppress unused warning — used in JSX below

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* ข้อความที่คลิกได้ */}
      <p className="leading-relaxed">
        {tokens.map((token, i) => {
          const isWord = /[a-zA-Z]/.test(token);
          if (!isWord) return <span key={i}>{token}</span>;
          return (
            <span
              key={i}
              onClick={(e) => handleWordClick(token, e)}
              className="cursor-pointer rounded px-0.5 transition-colors duration-150 hover:bg-amber-100 hover:text-amber-900 active:bg-amber-200"
              title="คลิกเพื่อเพิ่มใน Flashcard"
            >
              {token}
            </span>
          );
        })}
      </p>

      {/* Popup */}
      {popup && (
        <div
          ref={popupRef}
          style={getPopupStyle()}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-lg">{popup.word}</span>
              <button
                onClick={() => handleSpeak(popup.word)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <Volume2 className="w-4 h-4 text-white/80" />
              </button>
            </div>
            <button
              onClick={() => setPopup(null)}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4 text-white/80" />
            </button>
          </div>

          {/* Dictionary Result */}
          <div className="px-4 py-3">
            {dictLoading && (
              <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังค้นหา...</span>
              </div>
            )}

            {!dictLoading && dictData?.notFound && !dictData?.translation_th && (
              <p className="text-slate-400 text-sm italic py-1">ไม่พบในพจนานุกรม</p>
            )}

            {!dictLoading && dictData && (
              <div className="space-y-3">
                {/* Thai Translation */}
                {dictData.translation_th && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2.5">
                    <p className="text-indigo-700 font-medium text-sm">
                      แปลว่า: <span className="text-indigo-900 text-base">{dictData.translation_th}</span>
                    </p>
                  </div>
                )}
                
                {/* Phonetic & English Meanings */}
                {(!dictData.notFound) && (
                  <div className="space-y-2">
                    {dictData.phonetic && (
                      <p className="text-slate-500 text-sm font-mono">{dictData.phonetic}</p>
                    )}
                {dictData.meanings.slice(0, 2).map((m, i) => (
                  <div key={i}>
                    <span className="inline-block text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full mb-1">
                      {m.partOfSpeech}
                    </span>
                    <p className="text-slate-700 text-sm leading-relaxed">
                      {m.definitions[0]?.definition}
                    </p>
                    {m.definitions[0]?.example && (
                      <p className="text-slate-400 text-xs mt-0.5 italic">
                        &ldquo;{m.definitions[0].example}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
                  </div>
                )}
              </div>
            )}

            {/* Context Sentence */}
            <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-100">
              <div className="flex items-center gap-1 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs font-medium text-amber-700">บริบท</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed line-clamp-2">
                {contextSentence || text}
              </p>
            </div>

            {/* User Meaning Input */}
            <div className="mt-3">
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                ความหมายของคุณ <span className="text-slate-400">(ไม่บังคับ)</span>
              </label>
              <input
                type="text"
                value={userMeaning}
                onChange={(e) => setUserMeaning(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="พิมพ์ความหมายภาษาไทย..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                disabled={!session?.user}
              />
            </div>

            {/* Save Button */}
            <div className="mt-3">
              {!session?.user ? (
                <p className="text-xs text-slate-400 text-center">เข้าสู่ระบบเพื่อบันทึก Flashcard</p>
              ) : alreadyExists ? (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-amber-600">
                  <Check className="w-4 h-4" />
                  <span>มีในคลัง Flashcard แล้ว</span>
                </div>
              ) : saved ? (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-emerald-600">
                  <Check className="w-4 h-4" />
                  <span>บันทึกแล้ว! ✨</span>
                </div>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all duration-200 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <BookmarkPlus className="w-4 h-4" />
                  )}
                  {saving ? 'กำลังบันทึก...' : 'เพิ่มใน Flashcard'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
