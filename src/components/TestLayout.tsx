'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle,
  Circle,
  Menu,
  X,
  Search,
  ChevronDown,
  List,
  Grid3X3,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

interface Section {
  id: string;
  name: string;
  startQuestion: number;
  endQuestion: number;
}

interface TestLayoutProps {
  title?: string;
  duration?: string;
  totalQuestions?: number;
  currentQuestion?: number;
  answers?: (number | null)[];
  flaggedQuestions?: number[];
  sections?: Section[];
  onQuestionSelect?: (index: number) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  onFlag?: () => void;
  children: React.ReactNode;
  isSubmitted?: boolean;
}

const QUESTIONS_PER_PAGE = 20;

export default function TestLayout({
  title = '',
  duration = '',
  totalQuestions = 0,
  currentQuestion = 0,
  answers = [],
  flaggedQuestions = [],
  sections,
  onQuestionSelect = () => { },
  onPrevious = () => { },
  onNext = () => { },
  onSubmit = () => { },
  onFlag = () => { },
  children,
  isSubmitted = false,
}: TestLayoutProps) {
  const [showNavPanel, setShowNavPanel] = useState(true);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [jumpToQuestion, setJumpToQuestion] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'unanswered' | 'flagged'>('all');

  // Timer state (20 minutes = 1200 seconds)
  const EXAM_DURATION = 20 * 60;
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION);
  const isTimeWarning = timeLeft <= 120; // warn when <= 2 min

  useEffect(() => {
    if (isSubmitted) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isSubmitted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const totalPages = Math.ceil(totalQuestions / QUESTIONS_PER_PAGE);

  const answeredCount = answers.filter(a => a !== null).length;
  const unansweredCount = totalQuestions - answeredCount;
  const flaggedCount = flaggedQuestions.length;

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
    } else if (filterMode === 'flagged') {
      questions = questions.filter(i => flaggedQuestions.includes(i));
    }

    // Apply pagination
    return questions.slice(start, end);
  }, [currentPage, totalQuestions, activeSection, filterMode, answers, flaggedQuestions, sections]);

  // Get current page based on current question
  const questionPage = Math.floor(currentQuestion / QUESTIONS_PER_PAGE);

  const getQuestionStatus = (index: number) => {
    if (isSubmitted) return 'answered';
    if (answers[index] !== null) return 'answered';
    if (flaggedQuestions.includes(index)) return 'flagged';
    return 'unanswered';
  };

  const getQuestionButtonClass = (index: number) => {
    const status = getQuestionStatus(index);
    const isActive = index === currentQuestion;

    let baseClass = 'w-9 h-9 rounded-lg font-medium text-xs flex items-center justify-center transition-all duration-200 ';

    if (isActive) {
      baseClass += 'ring-2 ring-primary-500 ring-offset-1 ';
    }

    switch (status) {
      case 'answered':
        return baseClass + 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200';
      case 'flagged':
        return baseClass + 'bg-amber-100 text-amber-700 hover:bg-amber-200';
      default:
        return baseClass + 'bg-slate-100 text-slate-600 hover:bg-slate-200';
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
    // Select first question of new page
    const firstQuestion = page * QUESTIONS_PER_PAGE;
    if (firstQuestion < totalQuestions) {
      onQuestionSelect(firstQuestion);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-slate-200">
        <div
          className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-300"
          style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Link href="/tests" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <div>
                <h1 className="font-bold text-slate-900">{title}</h1>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span>{duration}</span>
                  <span className="mx-1">•</span>
                  <span>{totalQuestions} questions</span>
                </div>
              </div>
            </div>

            {/* Desktop Stats */}
            <div className="hidden md:flex items-center gap-4">
              {/* Timer */}
              {!isSubmitted && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-mono font-bold transition-colors ${isTimeWarning
                  ? 'bg-red-100 text-red-700 animate-pulse'
                  : 'bg-slate-100 text-slate-700'
                  }`}>
                  <Clock className="w-4 h-4" />
                  {formatTime(timeLeft)}
                </div>
              )}
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-slate-600">{answeredCount}/{totalQuestions}</span>
              </div>
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-slate-600">{flaggedCount}</span>
              </div>
              {currentQuestion < totalQuestions - 1 ? (
                <button
                  onClick={onNext}
                  className="btn-primary text-sm py-2 px-4 flex items-center gap-1"
                >
                  ข้อต่อไป <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={onSubmit}
                  disabled={unansweredCount > 0}
                  className="btn-primary text-sm py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {unansweredCount > 0
                    ? `ส่งข้อสอบ (เหลือ ${unansweredCount})`
                    : 'ส่งข้อสอบ'}
                </button>
              )}
            </div>

            {/* Mobile: timer + toggle */}
            <div className="flex items-center gap-2 md:hidden">
              {!isSubmitted && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono font-bold ${isTimeWarning ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-700'
                  }`}>
                  <Clock className="w-3 h-3" />
                  {formatTime(timeLeft)}
                </div>
              )}
              <button
                className="p-2 hover:bg-slate-100 rounded-lg"
                onClick={() => setShowMobileNav(!showMobileNav)}
              >
                {showMobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 pb-24 md:pb-6">
        <div className="flex gap-6">
          {/* Desktop Navigation Panel */}
          {showNavPanel && (
            <div className="hidden md:block w-72 shrink-0">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 sticky top-36 overflow-hidden" data-tour="test-nav-panel">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-slate-900">Questions</h2>
                    <button
                      onClick={() => setShowNavPanel(false)}
                      className="p-1 hover:bg-slate-200 rounded"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>

                  {/* Progress Ring */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12">
                      <svg className="w-12 h-12 transform -rotate-90">
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          stroke="#e2e8f0"
                          strokeWidth="4"
                          fill="none"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          stroke="#10b981"
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray={`${(answeredCount / totalQuestions) * 125.6} 125.6`}
                          className="transition-all duration-500"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
                        {Math.round((answeredCount / totalQuestions) * 100)}%
                      </span>
                    </div>
                    <div className="text-sm">
                      <p className="text-slate-900 font-medium">{answeredCount} answered</p>
                      <p className="text-slate-500">{unansweredCount} remaining</p>
                    </div>
                  </div>
                </div>

                {/* Quick Jump */}
                <div className="p-3 border-b border-slate-100">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="number"
                        min={1}
                        max={totalQuestions}
                        value={jumpToQuestion}
                        onChange={(e) => setJumpToQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleJumpToQuestion()}
                        placeholder="Jump to question..."
                        className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleJumpToQuestion}
                      className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
                    >
                      Go
                    </button>
                  </div>
                </div>

                {/* Section Tabs */}
                {sections && (
                  <div className="p-3 border-b border-slate-100">
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => { setActiveSection(null); setCurrentPage(0); }}
                        className={`px-2 py-1 rounded text-xs font-medium ${!activeSection ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        All
                      </button>
                      {sections.map(section => {
                        const sectionAnswered = answers.filter((a, i) =>
                          a !== null && i >= section.startQuestion - 1 && i <= section.endQuestion - 1
                        ).length;
                        const sectionTotal = section.endQuestion - section.startQuestion + 1;

                        return (
                          <button
                            key={section.id}
                            onClick={() => { setActiveSection(section.id); setCurrentPage(0); }}
                            className={`px-2 py-1 rounded text-xs font-medium ${activeSection === section.id ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >
                            {section.name} ({sectionAnswered}/{sectionTotal})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Filter Tabs */}
                <div className="p-3 border-b border-slate-100">
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setFilterMode('all'); setCurrentPage(0); }}
                      className={`flex-1 px-2 py-1.5 rounded text-xs font-medium ${filterMode === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => { setFilterMode('unanswered'); setCurrentPage(0); }}
                      className={`flex-1 px-2 py-1.5 rounded text-xs font-medium ${filterMode === 'unanswered' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      <Circle className="w-3 h-3 inline mr-1" />
                      {unansweredCount}
                    </button>
                    <button
                      onClick={() => { setFilterMode('flagged'); setCurrentPage(0); }}
                      className={`flex-1 px-2 py-1.5 rounded text-xs font-medium ${filterMode === 'flagged' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      <Flag className="w-3 h-3 inline mr-1" />
                      {flaggedCount}
                    </button>
                  </div>
                </div>

                {/* View Toggle */}
                <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
                    >
                      <Grid3X3 className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
                    >
                      <List className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                  <span className="text-xs text-slate-500">
                    Page {currentPage + 1}/{totalPages}
                  </span>
                </div>

                {/* Question Grid/List */}
                <div className="p-3 max-h-64 overflow-y-auto">
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-6 gap-1">
                      {pageQuestions.map(i => (
                        <button
                          key={i}
                          onClick={() => onQuestionSelect(i)}
                          className={getQuestionButtonClass(i)}
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
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm ${i === currentQuestion ? 'bg-primary-50 ring-1 ring-primary-500' : 'hover:bg-slate-50'
                              }`}
                          >
                            <span className="w-6 text-slate-500 font-medium">{i + 1}</span>
                            {status === 'answered' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                            {status === 'flagged' && <Flag className="w-4 h-4 text-amber-500" />}
                            {status === 'unanswered' && <Circle className="w-4 h-4 text-slate-300" />}
                            <span className="text-slate-600 truncate">
                              {status === 'answered' ? 'Answered' : status === 'flagged' ? 'Flagged' : 'Not answered'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Pagination */}
                <div className="p-3 border-t border-slate-100 flex items-center justify-center gap-1">
                  <button
                    onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

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
                        className={`w-7 h-7 rounded text-xs font-medium ${currentPage === pageNum
                          ? 'bg-primary-600 text-white'
                          : 'hover:bg-slate-100 text-slate-600'
                          }`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage === totalPages - 1}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Submit / Next Button */}
                {!isSubmitted && (
                  <div className="p-3 border-t border-slate-100">
                    {unansweredCount > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg mb-3">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="text-xs text-amber-700">
                          {unansweredCount} questions unanswered
                        </span>
                      </div>
                    )}
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
                        data-tour="test-submit-btn"
                        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed py-3"
                      >
                        {unansweredCount > 0
                          ? `ส่งข้อสอบ (เหลือ ${unansweredCount} ข้อ)`
                          : 'ส่งข้อสอบ'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Toggle Nav Button */}
          {!showNavPanel && (
            <button
              onClick={() => setShowNavPanel(true)}
              className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-lg border border-slate-200 hover:bg-slate-50 z-30"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Question Info Bar */}
            <div className="bg-white rounded-xl px-3 py-3 md:p-4 mb-4 md:mb-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-4">
                  <span className="text-lg md:text-2xl font-bold text-primary-600">
                    Q{currentQuestion + 1}
                  </span>
                  <div className="text-xs md:text-sm text-slate-500">
                    / {totalQuestions}
                  </div>
                </div>

                <div className="flex items-center gap-1 md:gap-3">
                  {!isSubmitted && (
                    <button
                      onClick={onFlag}
                      data-tour="test-flag-btn"
                      className={`flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-3 rounded-lg text-xs md:text-sm transition-colors ${flaggedQuestions.includes(currentQuestion)
                        ? 'bg-amber-100 text-amber-700'
                        : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                        }`}
                    >
                      <Flag className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="hidden sm:inline">{flaggedQuestions.includes(currentQuestion) ? 'Flagged' : 'Flag'}</span>
                    </button>
                  )}

                  <div className="flex items-center gap-0.5 md:gap-1">
                    <button
                      onClick={onPrevious}
                      disabled={currentQuestion === 0}
                      className="p-1.5 md:p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
                    </button>
                    <button
                      onClick={onNext}
                      disabled={currentQuestion === totalQuestions - 1}
                      className="p-1.5 md:p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Question Content */}
            <div className="mb-6" data-tour="test-question-text">
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Submit Bar */}
      {!isSubmitted && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="font-medium">{answeredCount}/{totalQuestions}</span>
          </div>
          {flaggedCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-slate-600">
              <Flag className="w-4 h-4 text-amber-500" />
              <span>{flaggedCount}</span>
            </div>
          )}
          {currentQuestion < totalQuestions - 1 ? (
            <button
              onClick={onNext}
              className="ml-auto btn-primary text-[1rem] py-3 px-5 flex items-center gap-1"
            >
              Next Question <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={unansweredCount > 0}
              className="ml-auto btn-primary text-sm py-2 px-5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {unansweredCount > 0 ? `ส่งข้อสอบ (เหลือ ${unansweredCount})` : 'ส่งข้อสอบ'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
