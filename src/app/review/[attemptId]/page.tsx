'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, CheckCircle, XCircle, Trophy, Clock, RotateCcw, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import FocusFormQuestionCard from '@/components/FocusFormQuestionCard';
import FocusMeaningConversationCard from '@/components/FocusMeaningConversationCard';
import FormMeaningArticleCard from '@/components/FormMeaningArticleCard';
import ListeningAudioPlayer from '@/components/ListeningAudioPlayer';
import RelatedArticlesPanel from '@/components/RelatedArticlesPanel';
import type { TestTypeId, Option, ConversationLine, Article, Blank } from '@/types/test';

interface AttemptData {
  id: number;
  testTypeId: TestTypeId;
  testTypeName: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  startedAt: string;
  completedAt: string | null;
}

interface ReviewItem {
  questionId: number;
  question: {
    id: number;
    testTypeId: TestTypeId;
    questionText: string;
    optionA: string | null;
    optionB: string | null;
    optionC: string | null;
    optionD: string | null;
    correctAnswer: string | null;
    explanation: string | null;
    conversation: ConversationLine[] | null;
    audioUrl: string | null;
    transcript: string | null;
    article: Article | null;
    cefrLevel: string;
    difficulty: string | null;
    orderIndex: number;
  } | null;
  userAnswer: string;
  isCorrect: boolean;
}

interface ReviewResponse {
  success: boolean;
  error?: string;
  data?: {
    attempt: AttemptData;
    reviewItems: ReviewItem[];
  };
}

interface ArticleSummary {
  id: number;
  title: string;
  slug: string | null;
  category: string | null;
  cefrLevel: string | null;
  tags: string[] | null;
}

type FilterMode = 'all' | 'correct' | 'incorrect';

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [grammarArticles, setGrammarArticles] = useState<ArticleSummary[]>([]);
  const [vocabularyArticles, setVocabularyArticles] = useState<ArticleSummary[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }
    if (status === 'authenticated' && params.attemptId) {
      fetchReviewData();
      fetchArticles();
    }
  }, [status, params.attemptId]);

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/articles');
      const json = await res.json();
      if (json.success) {
        const all: ArticleSummary[] = json.data;
        setGrammarArticles(all.filter(a => a.category === 'grammar').slice(0, 3));
        setVocabularyArticles(all.filter(a => a.category === 'vocabulary').slice(0, 3));
      }
    } catch { /* non-critical */ }
  };

  const fetchReviewData = async () => {
    try {
      const res = await fetch(`/api/tests/attempts/${params.attemptId}`);
      const data: ReviewResponse = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to load review');
        return;
      }

      setAttempt(data.data!.attempt);
      setReviewItems(data.data!.reviewItems);
    } catch (err) {
      setError('Failed to load review data');
    } finally {
      setLoading(false);
    }
  };

  // ─── Loading Skeleton ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-200 rounded-lg animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-60 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-20 bg-white rounded-xl border border-slate-100 animate-pulse" />
            ))}
          </div>
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3 animate-pulse">
              <div className="h-4 w-3/4 bg-slate-100 rounded" />
              <div className="h-4 w-1/2 bg-slate-100 rounded" />
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[1,2,3,4].map(j => (
                  <div key={j} className="h-12 bg-slate-50 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">{error || 'Review not found'}</p>
          <Link href="/progress" className="text-primary-600 hover:underline mt-2 inline-block">
            Back to Progress
          </Link>
        </div>
      </div>
    );
  }

  const scoreColor = attempt.score >= 70
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : attempt.score >= 50
    ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-red-700 bg-red-50 border-red-200';

  const correctCount = reviewItems.filter(i => i.isCorrect).length;
  const wrongCount = reviewItems.filter(i => !i.isCorrect).length;

  // Time taken
  const timeTaken = attempt.startedAt && attempt.completedAt
    ? Math.round((new Date(attempt.completedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000)
    : null;
  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  // Filter
  const filteredItems = filter === 'all'
    ? reviewItems
    : filter === 'correct'
    ? reviewItems.filter(i => i.isCorrect)
    : reviewItems.filter(i => !i.isCorrect);

  const noOp = () => {};

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA]">
      {/* ── Sticky Header ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#EAEAEA] sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link href="/progress" className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#F0F0F0] transition-colors">
                <ArrowLeft className="w-4 h-4 text-[#111]" />
              </Link>
              <div>
                <h1 className="font-bold text-[#111] text-sm">ดูเฉลยข้อสอบ</h1>
                <div className="flex items-center gap-1.5 text-xs text-[#AAAAAA]">
                  <span>{attempt.testTypeName}</span>
                  <span>·</span>
                  <Clock className="w-3 h-3" />
                  <span>
                    {attempt.completedAt
                      ? new Date(attempt.completedAt).toLocaleDateString('th-TH', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })
                      : '—'}
                  </span>
                  {timeTaken !== null && (
                    <><span>·</span><span>ใช้เวลา {formatDuration(timeTaken)}</span></>
                  )}
                </div>
              </div>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${scoreColor}`}>
              {attempt.score}%
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Score Summary Banner ───────────────────────────────── */}
        <div className={`rounded-3xl p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 ${
          attempt.score >= 70
            ? 'bg-emerald-50 border border-emerald-200'
            : 'bg-[#FFF8F0] border border-amber-200'
        }`}>
          {/* Score circle */}
          <div className={`shrink-0 w-20 h-20 rounded-2xl flex flex-col items-center justify-center font-black ${
            attempt.score >= 70 ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
          }`}>
            <span className="text-2xl leading-none">{attempt.score}%</span>
            <span className="text-xs font-normal opacity-80 mt-0.5">{attempt.score >= 70 ? 'ผ่าน' : 'ไม่ผ่าน'}</span>
          </div>
          <div className="flex-1 min-w-0">
            {attempt.score >= 70 ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-5 h-5 text-emerald-600" />
                  <p className="font-bold text-emerald-800 text-lg">ยอดเยี่ยม! ผ่านเกณฑ์แล้ว 🎉</p>
                </div>
                <p className="text-sm text-emerald-700">คะแนน {attempt.score}% ผ่านเกณฑ์ 70% — รักษามาตรฐานนี้ไว้ครับ</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <RotateCcw className="w-5 h-5 text-amber-600" />
                  <p className="font-bold text-amber-800 text-lg">ยังไม่ผ่านเกณฑ์</p>
                </div>
                <p className="text-sm text-amber-700">ต้องการ 70% ขึ้นไปจึงจะผ่าน — ทบทวนข้อที่ผิด แล้วลองใหม่ได้เลยครับ!</p>
              </>
            )}
            <div className="flex gap-3 mt-4 flex-wrap">
              <Link
                href="/tests"
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#111] text-white rounded-full px-4 py-2 hover:bg-[#333] transition-colors"
              >
                ทำข้อสอบใหม่ <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/progress"
                className="inline-flex items-center gap-1.5 text-xs font-semibold border border-[#EAEAEA] text-[#111] rounded-full px-4 py-2 hover:bg-[#F0F0F0] transition-colors"
              >
                ดูพัฒนาการ
              </Link>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 border border-[#EAEAEA] text-center">
            <div className="text-2xl font-bold text-[#111]">{attempt.totalQuestions}</div>
            <div className="text-xs text-[#AAAAAA] mt-0.5">ข้อทั้งหมด</div>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 text-center">
            <div className="text-2xl font-bold text-emerald-700">{correctCount}</div>
            <div className="text-xs text-emerald-600 mt-0.5">ตอบถูก ✓</div>
          </div>
          <div className="bg-red-50 rounded-2xl p-4 border border-red-200 text-center">
            <div className="text-2xl font-bold text-red-600">{wrongCount}</div>
            <div className="text-xs text-red-500 mt-0.5">ตอบผิด ✗</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-[#EAEAEA] text-center">
            <div className="text-2xl font-bold text-[#111] tabular-nums">{timeTaken !== null ? formatDuration(timeTaken) : '—'}</div>
            <div className="text-xs text-[#AAAAAA] mt-0.5">เวลาที่ใช้</div>
          </div>
        </div>

        {/* ── Filter Tabs ───────────────────────────────────────────── */}
        <div className="flex items-center gap-1 mb-6 bg-white rounded-2xl border border-[#EAEAEA] p-1">
          {([
            { key: 'all', label: `ทั้งหมด (${reviewItems.length})`, activeClass: 'bg-[#111] text-white', inactiveClass: 'text-[#787774] hover:bg-[#F7F6F3]' },
            { key: 'correct', label: `ถูก (${correctCount})`, activeClass: 'bg-emerald-600 text-white', inactiveClass: 'text-emerald-600 hover:bg-emerald-50' },
            { key: 'incorrect', label: `ผิด (${wrongCount})`, activeClass: 'bg-red-500 text-white', inactiveClass: 'text-red-500 hover:bg-red-50' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as FilterMode)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                filter === tab.key ? tab.activeClass : tab.inactiveClass
              }`}
            >
              {tab.key === 'correct' && <CheckCircle className="w-3.5 h-3.5" />}
              {tab.key === 'incorrect' && <XCircle className="w-3.5 h-3.5" />}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Question Review List ──────────────────────────────────── */}
        <div className="space-y-5">
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#EAEAEA] p-10 text-center">
              <p className="text-[#AAAAAA] text-sm">ไม่มีข้อที่ตรงกับตัวกรองนี้</p>
            </div>
          ) : (
            filteredItems.map((item, index) => (
              <div key={item.questionId} className="flex gap-3">
                {/* Numbered badge */}
                <div className="flex flex-col items-center pt-3 shrink-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    item.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className={`w-px flex-1 mt-2 ${
                    item.isCorrect ? 'bg-emerald-100' : 'bg-red-100'
                  }`} />
                </div>

                {/* Question card */}
                <div className="flex-1 min-w-0 pb-2">
                  <ReviewQuestionCard
                    item={item}
                    onAnswerSelect={noOp}
                    grammarArticles={grammarArticles}
                    vocabularyArticles={vocabularyArticles}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Footer CTA ────────────────────────────────────────────── */}
        <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/progress"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-2xl border border-[#EAEAEA] text-[#111] font-semibold text-sm hover:bg-[#F7F6F3] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับหน้าพัฒนาการ
          </Link>
          <Link
            href="/tests"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#111] text-white rounded-2xl font-semibold text-sm hover:bg-[#333] transition-colors"
          >
            ทำข้อสอบใหม่
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Renders the appropriate question card based on test type */
function ReviewQuestionCard({
  item,
  onAnswerSelect,
  grammarArticles,
  vocabularyArticles,
}: {
  item: ReviewItem;
  onAnswerSelect: (answer: string) => void;
  grammarArticles: ArticleSummary[];
  vocabularyArticles: ArticleSummary[];
}) {
  const q = item.question;
  if (!q) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-slate-500">
        Question data unavailable
      </div>
    );
  }

  // Pick related articles based on test type
  const relatedArticles: ArticleSummary[] =
    q.testTypeId === 'focus-form' ? grammarArticles
    : q.testTypeId === 'focus-meaning' ? vocabularyArticles
    : [];

  switch (q.testTypeId) {
    case 'focus-form':
      return (
        <>
          <FocusFormQuestionCard
            questionText={q.questionText}
            options={[
              { key: 'A', value: q.optionA || '' },
              { key: 'B', value: q.optionB || '' },
              { key: 'C', value: q.optionC || '' },
              { key: 'D', value: q.optionD || '' },
            ]}
            selectedAnswer={item.userAnswer}
            correctAnswer={q.correctAnswer}
            explanation={q.explanation}
            conversation={q.conversation ?? null}
            onAnswerSelect={onAnswerSelect}
            disabled
          />
          <RelatedArticlesPanel articles={relatedArticles} isCorrect={item.isCorrect} />
        </>
      );

    case 'focus-meaning': {
      const options = [q.optionA || '', q.optionB || '', q.optionC || '', q.optionD || ''].filter(Boolean);
      const selectedIndex = ['A', 'B', 'C', 'D'].indexOf(item.userAnswer);
      const correctIndex = q.correctAnswer ? ['A', 'B', 'C', 'D'].indexOf(q.correctAnswer) : -1;

      return (
        <>
          <FocusMeaningConversationCard
            conversation={q.conversation || []}
            question={q.questionText}
            options={options}
            selectedAnswer={selectedIndex >= 0 ? selectedIndex : null}
            correctAnswer={correctIndex >= 0 ? correctIndex : null}
            explanation={q.explanation || ''}
            onAnswerSelect={() => {}}
            disabled
          />
          <RelatedArticlesPanel articles={relatedArticles} isCorrect={item.isCorrect} />
        </>
      );
    }

    case 'form-meaning': {
      if (q.article) {
        // form-meaning stores one selectedAnswer per question, but articles have multiple blanks.
        // Show correct answers for all blanks so the student can study them.
        const answers: Record<number, string> = {};
        q.article.blanks.forEach(blank => {
          answers[blank.id] = blank.correctAnswer.toLowerCase();
        });

        return (
          <FormMeaningArticleCard
            article={q.article}
            answers={answers}
            isSubmitted
            onInputChange={() => {}}
            disabled
          />
        );
      }

      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <p className="text-slate-800">{q.questionText}</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-slate-600">Your answer:</span>
            <span className={`font-medium ${item.isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
              {item.userAnswer || '(empty)'}
            </span>
            {!item.isCorrect && q.correctAnswer && (
              <span className="text-sm text-emerald-600">
                Correct: {q.correctAnswer}
              </span>
            )}
          </div>
          {q.explanation && (
            <div className={`mt-4 p-4 rounded-xl ${
              item.isCorrect
                ? 'bg-emerald-50 border border-emerald-200'
                : 'bg-amber-50 border border-amber-200'
            }`}>
              <p className="font-medium text-slate-800 mb-1">
                {item.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
              </p>
              <p className="text-slate-600">{q.explanation}</p>
            </div>
          )}
        </div>
      );
    }

    case 'listening':
      return (
        <ListeningAudioPlayer
          audioUrl={q.audioUrl || undefined}
          transcript={q.transcript || q.questionText}
          questionText={q.questionText}
          options={[
            { key: 'A', value: q.optionA || '' },
            { key: 'B', value: q.optionB || '' },
            { key: 'C', value: q.optionC || '' },
            { key: 'D', value: q.optionD || '' },
          ]}
          selectedAnswer={item.userAnswer}
          correctAnswer={q.correctAnswer}
          explanation={q.explanation}
          onAudioPlayed={() => {}}
          onAnswerSelect={onAnswerSelect}
          disabled
        />
      );

    default:
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-slate-500">
          Unknown question type
        </div>
      );
  }
}
