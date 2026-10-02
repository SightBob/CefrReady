'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  CheckCircle,
  Circle,
  X,
  ChevronDown,
  PenTool,
  LogOut,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import VerbBankPanel from './VerbBankPanel';

/** ตัวอย่างคลังกริยา 3 ช่อง (Figma node 2654:1249) — จะแทนที่ด้วยข้อมูลจริงภายหลัง */
const VERB_BANK = [
  { v1: 'go', v2: 'went', v3: 'gone' },
  { v1: 'eat', v2: 'ate', v3: 'eaten' },
  { v1: 'see', v2: 'saw', v3: 'seen' },
];

interface Section {
  id: string;
  name: string;
  startQuestion: number;
  endQuestion: number;
}

interface AvailableSet {
  id: number;
  name: string;
  description?: string | null;
}

interface TestLayoutProps {
  title?: string;
  durationMinutes?: number;
  totalQuestions?: number;
  currentQuestion?: number;
  answers?: Array<string | number | null>;
  onTimeUp?: () => void;
  sections?: Section[];
  onQuestionSelect?: (index: number) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  children: React.ReactNode;
  isSubmitted?: boolean;
  currentQuestionId?: number;
  availableSets?: AvailableSet[];
  currentSetId?: number;
  onSetSelect?: (setId: number) => void;
  sectionIcon?: React.ElementType;
  sectionColor?: string;
  sectionLabel?: string;
  onResetAnswer?: (index: number) => void;
  onExit?: () => void;
  showQuestionNav?: boolean;
  timerSeconds?: number;
  sequentialNav?: boolean;
  /** Review Round: badge shown in the header when in the review phase. */
  phaseLabel?: string;
  /** Review Round: question indices >= this render with review styling. */
  reviewSegmentStart?: number;
  /** Open the current question's linked explain content. */
  reviewAction?: { label: string; onClick: () => void };
}

const QUESTIONS_PER_PAGE = 10;
const DEFAULT_DURATION_MINUTES = 20;

export default function TestLayout({
  title = '',
  durationMinutes,
  totalQuestions = 0,
  currentQuestion = 0,
  answers = [],
  sections,
  onQuestionSelect = () => { },
  onPrevious = () => { },
  onNext = () => { },
  onSubmit = () => { },
  onTimeUp,
  children,
  isSubmitted = false,
  currentQuestionId,
  availableSets,
  currentSetId,
  onSetSelect,
  sectionIcon: SectionIcon = PenTool,
  sectionColor = 'from-blue-500 to-cyan-500',
  sectionLabel = 'Conversation',
  onExit,
  showQuestionNav = true,
  timerSeconds,
  sequentialNav = false,
  phaseLabel,
  reviewSegmentStart,
  reviewAction,
}: TestLayoutProps) {
  const router = useRouter();
  const [showNavPanel, setShowNavPanel] = useState(true);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [jumpToQuestion, setJumpToQuestion] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSetMenuOpen, setIsSetMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'unanswered'>('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close sets modal on Escape + lock body scroll while open
  useEffect(() => {
    if (!isSetMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSetMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isSetMenuOpen]);

  const currentSetIndex = availableSets?.findIndex(s => s.id === currentSetId) ?? -1;
  const currentSetLabel = `set - ${currentSetIndex >= 0 ? currentSetIndex + 1 : 1}`;

  const totalPages = Math.ceil(totalQuestions / QUESTIONS_PER_PAGE);

  const answeredCount = answers.filter(a => a !== null).length;
  const unansweredCount = totalQuestions - answeredCount;

  // Get questions for current page
  const pageQuestions = useMemo(() => {
    const start = currentPage * QUESTIONS_PER_PAGE;
    const end = Math.min(start + QUESTIONS_PER_PAGE, totalQuestions);

    let questions = Array.from({ length: totalQuestions }, (_, i) => i);

    // Apply section filter
    if (activeSection && sections) {
      const section = sections.find(s => s.id === activeSection);
      if (section) {
        questions = questions.filter(i => i >= section.startQuestion - 1 && i <= section.endQuestion - 1);
      }
    }

    // Apply status filter
    if (filterMode === 'unanswered') {
      questions = questions.filter(i => answers[i] === null);
    }

    // Apply pagination
    return questions.slice(start, end);
  }, [currentPage, totalQuestions, activeSection, filterMode, answers, sections]);

  // Get current page based on current question
  const questionPage = Math.floor(currentQuestion / QUESTIONS_PER_PAGE);

  // Keep nav panel pagination in sync with the current question
  useEffect(() => {
    setCurrentPage(questionPage);
  }, [questionPage]);

  const getQuestionStatus = (index: number) => {
    if (isSubmitted) return 'answered';
    if (answers[index] !== null) return 'answered';
    return 'unanswered';
  };

  const getQuestionButtonClass = (index: number) => {
    const status = getQuestionStatus(index);
    const isActive = index === currentQuestion;

    // Figma spec: boxes 38x41 (w-[2.375rem] h-[2.5625rem]), radius 8px, gap 14px.
    let baseClass = 'w-[2.375rem] h-[2.5625rem] rounded-lg font-semibold text-[0.8125rem] flex items-center justify-center transition-all duration-200 ';

    const isReviewItem = reviewSegmentStart !== undefined && index >= reviewSegmentStart;

    // Figma: current question = #719CC0 bg + white text
    if (isActive) {
      return baseClass + 'bg-[#719CC0] text-white hover:bg-[#5F8BAC]';
    }

    switch (status) {
      case 'answered':
        // Figma answered: light blue #DCEFFF with dark blue text #2A4246
        return isReviewItem
          ? baseClass + 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          : baseClass + 'bg-[#DCEFFF] text-[#2A4246] hover:bg-[#C7E5FB]';
      default:
        // Figma unanswered: #F8F8F8 with gray text #585E5F
        return isReviewItem
          ? baseClass + 'bg-amber-500 text-white'
          : baseClass + 'bg-[#F8F8F8] text-[#585E5F] hover:bg-[#ECECEC]';
    }
  };

  const handleJumpToQuestion = () => {
    const questionNum = parseInt(jumpToQuestion);
    if (questionNum >= 1 && questionNum <= totalQuestions) {
      onQuestionSelect(questionNum - 1);
      setCurrentPage(Math.floor((questionNum - 1) / QUESTIONS_PER_PAGE));
      setJumpToQuestion('');
    }
  };  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Select first question of new page (sequential exams are view-only)
    const firstQuestion = page * QUESTIONS_PER_PAGE;
    if (!sequentialNav && firstQuestion < totalQuestions) {
      onQuestionSelect(firstQuestion);
    }
  };

  return (
    <div className="flex flex-col bg-[#F7F7F7] min-h-svh relative">
      {/* Mobile Dot Map - below header (scrolls away with it) */}
      {showQuestionNav && (
      <div className="md:hidden bg-white border-b border-slate-200 shadow-sm">
        <div className="overflow-x-auto dot-map-scroll" style={{ scrollbarWidth: 'none' }}>
          <div className="flex items-center gap-2 px-3 py-4 min-w-max">
            {Array.from({ length: totalQuestions }, (_, i) => {
              const status = getQuestionStatus(i);
              const isActive = i === currentQuestion;
              let dotClass = 'w-7 h-7 rounded-full text-[10px] font-semibold flex items-center justify-center transition-all duration-200 shrink-0 ';
              if (isActive) {
                dotClass += 'ring-2 ring-primary-500 ring-offset-1 scale-110 ';
              }
              const isReviewDot = reviewSegmentStart !== undefined && i >= reviewSegmentStart;
              switch (status) {
                case 'answered':
                  dotClass += isReviewDot ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white';
                  break;
                default:
                  dotClass += isReviewDot ? 'bg-amber-200 text-amber-700' : 'bg-slate-200 text-slate-500';
                  break;
              }
              return (
                <button
                  key={i}
                  onClick={() => onQuestionSelect(i)}
                  disabled={sequentialNav}
                  className={`${dotClass}${sequentialNav ? ' cursor-default' : ''}`}
                  aria-label={`ข้อ ${i + 1}: ${status === 'answered' ? 'ตอบแล้ว' : 'ยังไม่ได้ตอบ'}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* Mobile Navigation Panel */}
      {showMobileNav && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setShowMobileNav(false)}>
          <div
            className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200">
              <h2 className="font-bold text-slate-900">Navigation</h2>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-emerald-600">{answeredCount} answered</span>
                <span className="text-slate-500">{unansweredCount} left</span>
              </div>
            </div>

            {/* Quick Jump */}
            <div className="p-4 border-b border-slate-200">
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={totalQuestions}
                  value={jumpToQuestion}
                  onChange={(e) => setJumpToQuestion(e.target.value)}
                  placeholder="Jump to #"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
                <button
                  onClick={handleJumpToQuestion}
                  className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm"
                >
                  Go
                </button>
              </div>
            </div>

            {/* Section Tabs */}
            {sections && (
              <div className="p-4 border-b border-slate-200">
                <p className="text-xs font-medium text-slate-500 mb-2">SECTIONS</p>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setActiveSection(null)}
                    className={`px-2 py-1 rounded text-xs ${!activeSection ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'}`}
                  >
                    All
                  </button>
                  {sections.map(section => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`px-2 py-1 rounded text-xs ${activeSection === section.id ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {section.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            
            <div className="p-4 grid grid-cols-6 gap-1 mb-20">
              {Array.from({ length: totalQuestions }, (_, i) => (
                <button
                  key={i}
                  onClick={() => { onQuestionSelect(i); setShowMobileNav(false); }}
                  className={getQuestionButtonClass(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {/* Mobile Nav Submit Button */}
            {!isSubmitted && (
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200">
                <button
                  onClick={() => { setShowMobileNav(false); onSubmit(); }}
                  disabled={unansweredCount > 0}
                  className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {unansweredCount > 0 ? `ส่งข้อสอบ (เหลือ ${unansweredCount})` : 'ส่งข้อสอบ'}
                </button>
              </div>
            )}
          </div>

          
        </div>
        
      )}

      {/* Sets modal (opened from the header) */}
      {isSetMenuOpen && mounted && createPortal(
                  <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 animate-fade-in"
                    onClick={() => setIsSetMenuOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="เลือกชุดข้อสอบ"
                  >
                    <div
                      className="bg-white rounded-2xl shadow-xl w-full max-w-[1330px] max-h-[85vh] flex flex-col animate-slide-up"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-4 p-6 border-b border-slate-100">
                        <div className={`bg-gradient-to-br ${sectionColor} p-3 rounded-2xl shrink-0`}>
                          <SectionIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="text-[1.125rem] font-semibold text-[#525252]">ชุดข้อสอบ</h2>
                          <p className="text-sm font-medium mt-0.5 text-[#525252]">{title}</p>
                        </div>
                        <button
                          onClick={() => setIsSetMenuOpen(false)}
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          aria-label="ปิด"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="overflow-y-auto p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {availableSets!.map((s, i) => (
                            <button
                              key={s.id}
                              type="button"
                              data-current={s.id === currentSetId || undefined}
                              onClick={() => {
                                setIsSetMenuOpen(false);
                                if (s.id !== currentSetId) onSetSelect?.(s.id);
                              }}
                              className={`group block w-full bg-white rounded-2xl border p-5 text-left ${
                                s.id === currentSetId
                                  ? 'border-[#3B82F6]'
                                  : 'border-[#BFDFEB]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-bold text-slate-800 text-[1rem] leading-snug">ข้อสอบ - {i + 1}</h3>
                                    {s.id === currentSetId && (
                                      <span className="text-xs font-semibold text-[#3B82F6] shrink-0">ชุดปัจจุบัน</span>
                                    )}
                                  </div>
                                  {s.description && (
                                    <p className="text-sm text-slate-500 line-clamp-1 mt-3">{s.description}</p>
                                  )}
                                </div>
                                <div className="p-2 rounded-full flex items-center justify-center bg-[#E2E8FF]">
                                  <ArrowRight className="w-5 h-5 text-[#7372DF] shrink-0" />
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>,
                  document.body
                )}      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 w-full mt-[30px] pb-44">
        {/* Quiz controls row — set dropdown (left) + progress pill + exit ✕ (right) */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-[15px] min-w-0 flex-1">
            <button
              type="button"
              onClick={() => availableSets?.length ? setIsSetMenuOpen(v => !v) : undefined}
              className="shrink-0 w-full max-w-[18.4375rem] h-[2.8125rem] bg-white border border-[#EAEAEA] shadow-[3px_3px_0_0_#D5D3D3] rounded-xl px-4 flex items-center justify-between gap-2 disabled:opacity-70"
              aria-expanded={isSetMenuOpen}
              aria-label="เลือกชุดข้อสอบ"
              disabled={!availableSets?.length}
            >
              <span className="truncate text-[1rem] font-bold text-[#6387A5]">{currentSetLabel}</span>
              {availableSets?.length ? (
                <ChevronDown className="w-3.5 h-3.5 shrink-0 text-[#6387A5]" />
              ) : null}
            </button>


            {/* Progress pill — Figma: white card h45 radius 13, bar h14 #E3E2E2, fill #58CC02, label 11px Bold #3F4A36 */}
            <div className="hidden sm:flex flex-1 max-w-full items-center gap-3 bg-white rounded-[13px] px-5 h-[2.8125rem]">
              <div className="flex-1 h-[0.875rem] bg-[#E3E2E2] rounded-full shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.05)] overflow-hidden">
                <div
                  className="relative h-full bg-[#58CC02] rounded-full transition-all duration-500"
                  style={{ width: totalQuestions > 0 ? `${(answeredCount / totalQuestions) * 100}%` : '0%' }}
                >
                  <div className="absolute inset-x-0 top-0 h-1 rounded-full bg-white/40" />
                </div>
              </div>
              <span className="shrink-0 text-[0.6875rem] font-bold tracking-[0.06em] text-[#3F4A36]">
                ทั้งหมด {totalQuestions} ข้อ
              </span>
            </div>
          </div>


          <button
            onClick={() => setShowExitConfirm(true)}
            className="shrink-0 bg-white border-b-2 border-r-2 border-[#C0BFB7] rounded-lg shadow-[0_0_0.6px_0_rgba(0,0,0,0.25)] w-[2.7rem] h-[2.4rem] grid place-items-center hover:bg-slate-50 transition-colors"
            aria-label="จบการสอบ"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        <div className="flex gap-6 mt-[1.1875rem] flex-start">
          {/* Desktop Navigation Panel */}
          {showNavPanel && showQuestionNav && (
            <div className="hidden md:flex w-[18.4375rem] flex-col gap-[0.9375rem]">
              <div className="rounded-2xl shadow-sm sticky h-fit overflow-hidden w-full bg-white">

                {/* Question Grid/List */}
                <div className="h-auto overflow-y-auto p-[1.625rem] py-[1.1875rem]">
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-5 gap-[19px]">
                      {pageQuestions.map(i => (
                        <button
                          key={i}
                          onClick={() => onQuestionSelect(i)}
                          disabled={sequentialNav}
                          className={`${getQuestionButtonClass(i)}${sequentialNav ? ' cursor-default' : ''}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {pageQuestions.map(i => {
                        const status = getQuestionStatus(i);
                        return (
                          <button
                            key={i}
                            onClick={() => onQuestionSelect(i)}
                            disabled={sequentialNav}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm ${i === currentQuestion ? 'bg-primary-50 ring-1 ring-primary-500' : 'hover:bg-slate-50'
                              }${sequentialNav ? ' cursor-default' : ''}`}
                          >
                            <span className="w-6 text-slate-500 font-medium">{i + 1}</span>
                            {status === 'answered' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                            {status === 'unanswered' && <Circle className="w-4 h-4 text-slate-300" />}
                            <span className="text-slate-600 truncate">
                              {status === 'answered' ? 'Answered' : 'Not answered'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                  
              </div>

              {/* Verb bank — คลังกริยา 3 ช่อง (Figma node 2654:1249) — กล่องแยกใต้กล่อง navigation */}
              <VerbBankPanel verbs={VERB_BANK} />
            </div>
            
          )}

          {/* Toggle Nav Button */}
          {!showNavPanel && showQuestionNav && (
            <button onClick={() => setShowNavPanel(true)} aria-label="�Դἧ��ùӷҧ">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Question Content */}
            <div className="mb-6">
              {children}
            </div>
          </div>
        </div>
        
      </div>


      {/* Old Mobile Bottom Bar — replaced by universal bottom bar below */}

      {!isSubmitted && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity ${showExitConfirm ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setShowExitConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 mb-2">ออกจากข้อสอบ?</h3>
            <p className="text-sm text-slate-600 mb-1">
              คุณตอบไปแล้ว <span className="font-semibold text-emerald-600">{answeredCount}</span> จาก {totalQuestions} ข้อ
            </p>
            <p className="text-sm text-amber-600 mb-5">
              {unansweredCount > 0 && `คำตอบของคุณจะไม่ถูกบันทึก — ยังเหลืออีก ${unansweredCount} ข้อ`}
              {unansweredCount === 0 && 'คำตอบของคุณจะไม่ถูกบันทึกจนกว่าจะกดส่ง'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                ทำต่อ
              </button>
              <button
                onClick={() => { if (onExit) onExit(); else router.push('/tests'); }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
              >
                ออกจากข้อสอบ
              </button>
            </div>
          </div>
        </div>
      )}

     {/* Universal Bottom Bar — Figma: white bar, yellow action button right */}
<div className="fixed bottom-0 left-0 w-full bg-white z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_0_6.6px_0_rgba(172,172,172,0.25)]">
  <div className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-3 md:min-h-[6rem] flex items-center justify-end gap-2 sm:gap-3 w-full">

    {/* Next / Submit / Retry */}
    {!isSubmitted && (
      (() => { const isLastQuestion = currentQuestion >= totalQuestions - 1;
               const isAnswered = answers[currentQuestion] != null && answers[currentQuestion] !== ''; return (
      <div className="w-full flex items-center gap-2 md:gap-3 md:w-auto justify-center">
        {reviewAction && (
          <button
            type="button"
            onClick={reviewAction.onClick}
            className="flex-1 md:flex-none md:w-[13.875rem] h-14 md:h-[3.375rem] rounded-[7px] flex items-center justify-center gap-2 border-2 text-[1rem] font-semibold text-[#524924] shadow-[3px_3px_0_0_#D5D3D3] hover:bg-blue-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-sm md:text-base text-center font-bold whitespace-nowrap">{reviewAction.label}</span>
          </button>
        )}
        {currentQuestion < totalQuestions - 1 ? (
          <button
            onClick={onNext}
            className={`flex-1 md:flex-none md:w-[13.5rem] h-14 md:h-[3.0625rem] rounded-[14px] flex items-center justify-center space-x-1 text-[1rem] text-[#524924] transition-colors ${
              isAnswered ? 'bg-[#FFF0AE] border-b-[3px] border-r-[4px] border-[#FFDB40] hover:bg-[#FFEA8F]' : 'bg-[#FFF0AE]/60 border-b-[3px] border-r-[4px] border-[#FFDB40]/50 hover:bg-[#FFF0AE]'
            }`}
          >
            <span className='text-base md:text-[1rem] text-center font-semibold whitespace-nowrap'>ข้อถัดไป</span>
            <ArrowRight className='size-[1.125rem] shrink-0' />
          </button>
        ) : (
          <button
            onClick={onSubmit}
            className="flex-1 md:flex-none md:w-[13.5rem] h-14 md:h-[3.0625rem] bg-[#FFF0AE] border-b-[3px] border-r-[4px] border-[#FFDB40] hover:bg-[#FFEA8F] rounded-[14px] flex items-center space-x-1 justify-center text-[#524924] transition-colors"
          >
            <span className='text-base md:text-[1rem] text-center font-semibold whitespace-nowrap'>ตรวจคำตอบ</span>
            <CheckCircle className='size-[1.125rem] shrink-0' />
          </button>
        )}
      </div>
      ); })()
    )}

    {/* After submit: next set */}
    {isSubmitted && currentSetIndex >= 0 && availableSets && currentSetIndex < availableSets.length - 1 && onSetSelect && (
      <button
        onClick={() => onSetSelect(availableSets[currentSetIndex + 1].id)}
        className="w-full md:max-w-[13.875rem] h-14 md:h-[3.375rem] bg-[#6D89EF] hover:bg-[#5A75E0] rounded-full flex items-center space-x-1 justify-center text-white transition-colors"
      >
        <span className='text-base md:text-[1.125rem] text-center font-bold'>ทำชุด {currentSetIndex + 2}</span>
        <ArrowRight className='size-[1.125rem]' />
      </button>
    )}
  </div>
</div>
    </div>
  );
}
