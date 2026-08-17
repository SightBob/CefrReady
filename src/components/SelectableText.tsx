'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Volume2, BookOpen, Languages } from 'lucide-react';

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
  rect: DOMRect;
}

interface SelectionState {
  text: string;
  rect: DOMRect;
}

interface SelectableTextProps {
  text: string;
  contextSentence?: string;
  className?: string;
  inline?: boolean;
}

function getPopupPosition(rect: DOMRect, maxHeight: number, width: number) {
  const gap = 8;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768;

  let left = rect.left;
  if (left + width > viewportWidth - 16) left = viewportWidth - width - 16;
  if (left < 8) left = 8;

  const spaceBelow = viewportHeight - rect.bottom - gap;
  const spaceAbove = rect.top - gap;
  const fitsBelow = spaceBelow >= Math.min(maxHeight, 250);

  if (fitsBelow) {
    return {
      left: `${left}px`,
      top: `${rect.bottom + gap}px`,
      maxHeight: `${Math.min(spaceBelow - 8, maxHeight)}px`,
    };
  }
  return {
    left: `${left}px`,
    bottom: `${viewportHeight - rect.top + gap}px`,
    maxHeight: `${Math.min(spaceAbove - 8, maxHeight)}px`,
  };
}

function getBadgePosition(rect: DOMRect, badgeWidth: number, badgeHeight: number) {
  const gap = 8;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768;

  const spaceAbove = rect.top - gap;
  const fitsAbove = spaceAbove >= badgeHeight + 4;

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  let left = rect.left + rect.width / 2 - badgeWidth / 2;
  if (left + badgeWidth > viewportWidth - 8) left = viewportWidth - badgeWidth - 8;
  if (left < 8) left = 8;

  if (fitsAbove) {
    return { left: `${left}px`, top: `${rect.top - badgeHeight - gap}px` };
  }
  return { left: `${left}px`, top: `${rect.bottom + gap}px` };
}

export default function SelectableText({
  text,
  contextSentence,
  className = '',
  inline = false,
}: SelectableTextProps) {
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [dictData, setDictData] = useState<DictData | null>(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [selectionState, setSelectionState] = useState<SelectionState | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSelectionRef = useRef<SelectionState | null>(null);

  const tokens = text.split(/(\s+|(?=[.,!?;:'"""()[\]—–-])|(?<=[.,!?;:'"""()[\]—–-]))/);

  const fetchDictionary = useCallback(async (word: string) => {
    const cleanWord = word.replace(/[^a-zA-Z'\s-]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
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

  const openWordPopup = useCallback((word: string, rect: DOMRect) => {
    setSelectionState(null);
    window.getSelection()?.removeAllRanges();
    setPopup({ word, rect });
    fetchDictionary(word);
  }, [fetchDictionary]);

  const handleWordClick = useCallback((word: string, e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const cleanWord = word.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
    if (!cleanWord || cleanWord.length < 2) return;
    const spanRect = (e.target as HTMLElement).getBoundingClientRect();
    openWordPopup(cleanWord, spanRect);
  }, [openWordPopup]);

  const handleTranslateSelection = useCallback(() => {
    if (!selectionState) return;
    openWordPopup(selectionState.text, selectionState.rect);
  }, [selectionState, openWordPopup]);

  const handleSpeak = (word: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        lastSelectionRef.current = null;
        return;
      }
      const text = sel.toString().trim();
      if (!text || text.length < 2 || !containerRef.current?.contains(sel.anchorNode)) {
        lastSelectionRef.current = null;
        return;
      }
      const range = sel.getRangeAt(0);
      lastSelectionRef.current = { text, rect: range.getBoundingClientRect() };
    };

    const handleRelease = () => {
      if (lastSelectionRef.current) {
        setSelectionState(lastSelectionRef.current);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mouseup', handleRelease);
    document.addEventListener('touchend', handleRelease);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleRelease);
      document.removeEventListener('touchend', handleRelease);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopup(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const popupPos = popup ? getPopupPosition(popup.rect, 420, 300) : null;
  const badgePos = selectionState ? getBadgePosition(selectionState.rect, 80, 32) : null;

  const Container = inline ? 'span' : 'div';
  const TextWrapper = inline ? 'span' : 'p';

  return (
    <>
      {/* Selection highlight color */}
      <style>{`
        .selectable-text ::selection {
          background: #fbbf24;
          color: #1e1b4b;
        }
        .selectable-text ::-moz-selection {
          background: #fbbf24;
          color: #1e1b4b;
        }
      `}</style>

      <Container ref={containerRef} className={`selectable-text relative ${className}`}>
        <TextWrapper className={inline ? '' : 'leading-relaxed '}>
          {tokens.map((token, i) => {
            const isWord = /[a-zA-Z]/.test(token);
            if (!isWord) return <span key={i}>{token}</span>;
            return (
              <span
                key={i}
                onClick={(e) => handleWordClick(token, e)}
                className="cursor-pointer rounded pe-1 transition-colors duration-150 hover:bg-amber-100 hover:text-amber-900 active:bg-amber-200"
                title="คลิกเพื่อดูคำแปล | ลากเลือกวลี"
              >
                {token}
              </span>
            );
          })}
        </TextWrapper>

        {/* Selection translate badge */}
        {selectionState && badgePos && createPortal(
          <button
            type="button"
            onClick={handleTranslateSelection}
            style={{
              position: 'fixed',
              left: badgePos.left,
              top: badgePos.top,
              zIndex: 1000,
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-semibold rounded-full shadow-lg animate-in fade-in zoom-in-75 duration-150 hover:from-indigo-700 hover:to-violet-700 active:scale-95"
          >
            <Languages className="w-3.5 h-3.5" />
            แปล
          </button>,
          document.body
        )}

        {/* Dictionary popup */}
        {popup && popupPos && createPortal(
          <div
            ref={popupRef}
            style={{
              position: 'fixed',
              left: popupPos.left,
              top: popupPos.top,
              bottom: popupPos.bottom,
              width: '300px',
              maxHeight: popupPos.maxHeight,
              zIndex: 9999,
            }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col animate-in fade-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-t-2xl shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-white font-bold text-lg truncate">{popup.word}</span>
                <button
                  type="button"
                  onClick={() => handleSpeak(popup.word)}
                  className="p-1 rounded-full hover:bg-white/20 transition-colors shrink-0"
                >
                  <Volume2 className="w-4 h-4 text-white/80" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setPopup(null)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors shrink-0"
              >
                <X className="w-4 h-4 text-white/80" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-slate-100 shrink-0 bg-white">
              {!dictLoading && dictData?.translation_th && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2.5">
                  <p className="text-indigo-700 font-medium text-sm">
                    แปลว่า: <span className="text-indigo-900 text-base">{dictData.translation_th}</span>
                  </p>
                </div>
              )}
              {dictLoading && (
                <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังค้นหา...</span>
                </div>
              )}
            </div>

            <div className="overflow-y-auto overscroll-contain flex-1 min-h-0">
              <div className="px-4 py-3">
            {!dictLoading && (!dictData?.meanings?.length || (dictData?.notFound && !dictData?.translation_th)) && (
              <p className="text-slate-400 text-sm italic py-1">ไม่พบในพจนานุกรม</p>
            )}

            {!dictLoading && dictData && !dictData.notFound && !!dictData.meanings?.length && (
              <div className="space-y-2">
                    {dictData.phonetic && (
                      <p className="text-slate-500 text-sm font-mono">{dictData.phonetic}</p>
                    )}
                    {(dictData.meanings ?? []).slice(0, 2).map((m, i) => (
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

                <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="flex items-center gap-1 mb-1">
                    <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700">บริบท</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed line-clamp-2">
                    {contextSentence || text}
                  </p>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </Container>
    </>
  );
}
