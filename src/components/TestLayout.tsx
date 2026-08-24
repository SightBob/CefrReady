'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Circle,
  Menu,
  X,
  Search,
  ChevronDown,
  List,
  Grid3X3,
  AlertTriangle,
  PenTool,
  LogOut,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import ReportModal from '@/components/ReportModal';
import TestTimer from '@/components/TestTimer';

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
}

const QUESTIONS_PER_PAGE = 20;
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
}: TestLayoutProps) {
  const router = useRouter();
  const [showNavPanel, setShowNavPanel] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportedQuestions, setReportedQuestions] = useState<Set<number>>(new Set());
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

  const effectiveMinutes = durationMinutes && durationMinutes > 0 ? durationMinutes : DEFAULT_DURATION_MINUTES;
  const EXAM_DURATION = effectiveMinutes * 60;
  const durationLabel = `${effectiveMinutes} นาที`;
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

    let baseClass = 'w-9 h-9 rounded-lg font-medium text-xs flex items-center justify-center transition-all duration-200 ';

    if (isActive) {
      baseClass += 'ring-2 ring-primary-500 ring-offset-1 ';
    }

    const isReviewItem = reviewSegmentStart !== undefined && index >= reviewSegmentStart;

    switch (status) {
      case 'answered':
        return isReviewItem
          ? baseClass + 'bg-amber-500 text-white hover:bg-amber-600'
          : baseClass + 'bg-[#6D89EF] text-white hover:bg-[#5A75E0]';
      default:
        return isReviewItem
          ? baseClass + 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          : baseClass + 'bg-[#EDEDED] text-slate-600 hover:bg-slate-200';
    }
  };

  const handleJumpToQuestion = () => {
    const questionNum = parseInt(jumpToQuestion);
    if (questionNum >= 1 && questionNum <= totalQuestions) {
      onQuestionSelect(questionNum - 1);
      setCurrentPage(Math.floor((questionNum - 1) / QUESTIONS_PER_PAGE));
      setJumpToQuestion('');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Select first question of new page (sequential exams are view-only)
    const firstQuestion = page * QUESTIONS_PER_PAGE;
    if (!sequentialNav && firstQuestion < totalQuestions) {
      onQuestionSelect(firstQuestion);
    }
  };

  return (
    <div className="flex flex-col bg-white min-h-svh relative">
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-slate-200">
        <div
          className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-300"
          style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
        />
      </div>

            {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-[0_1px_6.4px_0_rgba(221,221,221,0.25)] shrink-0 z-40 pt-1 sticky top-0">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 md:py-0 md:h-[6.6875rem] h-[90px]">
            <div className="flex items-center gap-2 md:gap-4">

              <div className={`bg-gradient-to-br ${sectionColor} w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0`}>
                <SectionIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>

              <div>
                <h1 className="font-bold text-base sm:text-[1.375rem] line-clamp-1 flex items-center gap-2">
                  {title}
                  {phaseLabel && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-amber-700 shrink-0">
                      <RotateCcw className="w-3 h-3" />
                      {phaseLabel}
                    </span>
                  )}
                </h1>
                <div className="flex items-center gap-2 text-xs sm:text-[1rem] text-[#5A6387] font-medium">
                  <span>set 1 - {totalQuestions} ข้อ</span>
                  <span>|</span>
                  <span>{durationLabel}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowExitConfirm(true)}
              className="text-[#616161] text-sm sm:text-[1.125rem] rounded-lg font-semibold flex items-center shrink-0"
              aria-label="จบการสอบ"
            >
              <span className="hidden sm:inline">จบการสอบ</span>
              <LogOut className="w-5 h-5 text-slate-600 sm:ms-2" />
            </button>

          </div>
        </div>
      </div>

      {/* Mobile Dot Map - sticky below header */}
      {showQuestionNav && (
      <div className="md:hidden sticky top-[95px] z-30 bg-white border-b border-slate-200 shadow-sm">
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

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 w-full mt-[30px] pb-44">

        <div className="w-full flex items-center justify-between">
          
            <div className="w-72 bg-[#F9F9F9] py-1 flex items-center space-x-3 rounded-full ps-4">
              <SectionIcon className='size-[1rem]' />
              <p className='text-[0.9375rem] font-medium'>{sectionLabel}</p>
            </div>

            {/* Desktop Stats */}
            <div className="hidden md:flex items-center gap-4">
              {/* Timer */}
              <TestTimer initialSeconds={timerSeconds ?? EXAM_DURATION} isSubmitted={isSubmitted} onTimeUp={onTimeUp} />

               {!isSubmitted && (
                    <>
                      {currentQuestionId && (
                        <button className='flex items-center space-x-1 text-[#917B21] text-[0.8125rem] bg-[#FFF2BE] py-1.5 px-3 rounded-full font-medium' onClick={() => setShowReportModal(true)} aria-label="��§ҹ��ͼԴ��Ҵ">
                          {reportedQuestions.has(currentQuestionId)
                            ? <><CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4" /><span className="hidden sm:inline">แจ้งข้อสอบผิดแล้ว</span></>
                            : <><AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4" /><span className="hidden sm:inline">แจ้งข้อสอบผิด</span></>}
                        </button>
                      )}
                    </>
                  )}
            </div>
        </div>

        <div className="flex gap-6 mt-[1.1875rem] ">
          {/* Desktop Navigation Panel */}
          {showNavPanel && showQuestionNav && (
            <div className="hidden md:block w-72 shrink-0 ">
              <div className=" rounded-2xl shadow-sm border border-slate-100 sticky top-36 overflow-hidden p-[1.1875rem] bg-slate-50">


                <div className="relative">
                  <button
                    type="button"
                    onClick={() => availableSets?.length ? setIsSetMenuOpen(v => !v) : undefined}
                    className="w-full bg-[linear-gradient(78deg,#3B82F6_0%,#06B6D4_100%)] min-h-[2.75rem] rounded-xl px-4 flex items-center justify-between text-white font-semibold disabled:opacity-70"
                    aria-expanded={isSetMenuOpen}
                    disabled={!availableSets?.length}
                  >
                    <span className="truncate">{currentSetLabel}</span>
                    {availableSets?.length ? (
                      <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isSetMenuOpen ? 'rotate-180' : ''}`} />
                    ) : null}
                  </button>

                  {/* Sets modal */}
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
                  )}
                </div>

                {/* Question Grid/List */}
                <div className="px-3 max-h-76 overflow-y-auto py-[1.1875rem]">
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-4 gap-5">
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

                {/* Pagination */}
                <div className="p-3 border-t border-slate-100 flex items-center justify-between gap-1">
                  <button
                    onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i;
                    } else if (currentPage < 3) {
                      pageNum = i;
                    } else if (currentPage > totalPages - 3) {
                      pageNum = totalPages - 5 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`size-[1.75rem] rounded-full text-[0.75rem] font-medium ${currentPage === pageNum
                          ? 'bg-[#4A4A4A] text-white'
                          : 'hover:bg-slate-100 text-slate-600'
                          }`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                  </div>

                  <button
                    onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage === totalPages - 1}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Submit / Next Button */}
                {/* {!isSubmitted && (
                  <div className="p-3 border-t border-slate-100">
                    {currentQuestion < totalQuestions - 1 ? (
                      <button
                        onClick={onNext}
                        className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                      >
                        Next Question <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={onSubmit}
                        disabled={unansweredCount > 0}
                        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed py-3"
                      >
                        {unansweredCount > 0
                          ? `ส่งข้อสอบ (เหลือ ${unansweredCount} ข้อ)`
                          : 'ส่งข้อสอบ'}
                      </button>
                    )}
                  </div>
                )} */}
              </div>
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

      {/* Report Modal */}
      {showReportModal && currentQuestionId && (
        <ReportModal
          questionId={currentQuestionId}
          questionNumber={currentQuestion + 1}
          onClose={() => setShowReportModal(false)}
          onSuccess={() =>
            setReportedQuestions(prev => new Set(prev).add(currentQuestionId!))
          }
        />
      )}

      {/* Exit Confirm Modal */}
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

     {/* Universal Bottom Bar */}
<div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_0_31px_-1px_rgba(172,172,172,0.25)]">
  <div className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-8 py-3 md:py-0 md:min-h-[8rem] flex flex-col md:flex-row items-center justify-between gap-3 w-full">
    {/* Progress Ring */}
    <div className="w-full md:w-auto p-2 md:p-0 rounded-xl">
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 scale-90 md:scale-100 origin-center shrink-0">
          <svg className="w-12 h-12 transform -rotate-90">
            <circle cx="24" cy="24" r="20" stroke="#e2e8f0" strokeWidth="4" fill="none" />
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="#10b981"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${totalQuestions > 0 ? (answeredCount / totalQuestions) * 125.6 : 0} 125.6`}
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
            {totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0}%
          </span>
        </div>
        <div className="text-sm hidden sm:block">
          <p className="text-slate-900 font-medium">{answeredCount} answered</p>
          <p className="text-slate-500">{unansweredCount} remaining</p>
        </div>
        <p className="text-sm font-medium text-slate-900 sm:hidden">
          {answeredCount}/{totalQuestions}
        </p>
      </div>
    </div>

    {/* Next / Submit / Retry */}
    {!isSubmitted && (
      (() => { const isLastQuestion = currentQuestion >= totalQuestions - 1;
               const isAnswered = answers[currentQuestion] != null && answers[currentQuestion] !== ''; return (
      <div className="w-full flex items-center gap-2 md:gap-3 md:w-auto justify-center">
        {currentQuestion < totalQuestions - 1 ? (
          <button
            onClick={onNext}
            className={`flex-1 md:flex-none md:w-[13.875rem] h-14 md:h-[3.375rem] rounded-full flex items-center space-x-1 justify-center text-white transition-colors ${
              isAnswered ? 'bg-[#6D89EF] hover:bg-[#5A75E0]' : 'bg-[#BABABA] hover:bg-[#a5a5a5]'
            }`}
          >
            <span className='text-base md:text-[1.125rem] text-center font-bold whitespace-nowrap'>ข้อถัดไป</span>
            <ArrowRight className='size-[1.125rem] shrink-0' />
          </button>
        ) : (
          <button
            onClick={onSubmit}
            className="flex-1 md:flex-none md:w-[13.875rem] h-14 md:h-[3.375rem] bg-[#6D89EF] hover:bg-[#5A75E0] rounded-full flex items-center space-x-1 justify-center text-white transition-colors"
          >
            <span className='text-base md:text-[1.125rem] text-center font-bold whitespace-nowrap'>ส่งข้อสอบ</span>
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
