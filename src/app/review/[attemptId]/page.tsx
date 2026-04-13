'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, CheckCircle, XCircle, Trophy, Clock, Loader2, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import FocusFormQuestionCard from '@/components/FocusFormQuestionCard';
import FocusMeaningConversationCard from '@/components/FocusMeaningConversationCard';
import FormMeaningArticleCard from '@/components/FormMeaningArticleCard';
import ListeningAudioPlayer from '@/components/ListeningAudioPlayer';
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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }
    if (status === 'authenticated' && params.attemptId) {
      fetchReviewData();
    }
  }, [status, params.attemptId]);

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
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Link href="/progress" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <div>
                <h1 className="font-bold text-slate-900">Test Review</h1>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>{attempt.testTypeName}</span>
                  <span className="mx-1">|</span>
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {attempt.completedAt
                      ? new Date(attempt.completedAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : 'N/A'}
                  </span>
                  {timeTaken !== null && (
                    <>
                      <span className="mx-1">|</span>
                      <span>Time: {formatDuration(timeTaken)}</span>
                    </>
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

      {/* Summary */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Pass/Fail Banner */}
        {attempt.score >= 70 ? (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
            <Trophy className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-800">Passed!</p>
              <p className="text-sm text-emerald-600">You scored {attempt.score}% — keep up the great work.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <RotateCcw className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800">Not quite there yet</p>
              <p className="text-sm text-amber-600">You need 70% to pass. Review the incorrect answers below.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
            <div className="text-2xl font-bold text-slate-900">{attempt.totalQuestions}</div>
            <div className="text-sm text-slate-500">Total</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 shadow-sm border border-emerald-200 text-center">
            <div className="text-2xl font-bold text-emerald-700">{correctCount}</div>
            <div className="text-sm text-emerald-600">Correct</div>
          </div>
          <div className="bg-red-50 rounded-xl p-4 shadow-sm border border-red-200 text-center">
            <div className="text-2xl font-bold text-red-700">{wrongCount}</div>
            <div className="text-sm text-red-600">Incorrect</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 shadow-sm border border-slate-200 text-center">
            <div className="text-2xl font-bold text-slate-900">{timeTaken !== null ? formatDuration(timeTaken) : '-'}</div>
            <div className="text-sm text-slate-500">Time</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-white rounded-xl border border-slate-100 p-1">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            All ({reviewItems.length})
          </button>
          <button
            onClick={() => setFilter('correct')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'correct' ? 'bg-emerald-600 text-white' : 'text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Correct ({correctCount})
          </button>
          <button
            onClick={() => setFilter('incorrect')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'incorrect' ? 'bg-red-600 text-white' : 'text-red-600 hover:bg-red-50'
            }`}
          >
            <XCircle className="w-4 h-4" />
            Incorrect ({wrongCount})
          </button>
        </div>

        {/* Question List */}
        <div className="space-y-6">
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-slate-500">
              No questions match this filter.
            </div>
          ) : (
            filteredItems.map((item, index) => (
              <div key={item.questionId} className="flex gap-4">
                {/* Question number badge */}
                <div className="flex flex-col items-center pt-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    item.isCorrect
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {index + 1}
                  </div>
                  {item.isCorrect
                    ? <CheckCircle className="w-4 h-4 text-emerald-500 mt-1" />
                    : <XCircle className="w-4 h-4 text-red-500 mt-1" />
                  }
                </div>

                {/* Question content */}
                <div className="flex-1 min-w-0">
                  <ReviewQuestionCard
                    item={item}
                    onAnswerSelect={noOp}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Back to Progress */}
        <div className="mt-8 text-center">
          <Link
            href="/progress"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Progress
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
}: {
  item: ReviewItem;
  onAnswerSelect: (answer: string) => void;
}) {
  const q = item.question;
  if (!q) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-slate-500">
        Question data unavailable
      </div>
    );
  }

  switch (q.testTypeId) {
    case 'focus-form':
      return (
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
      );

    case 'focus-meaning': {
      const options = [q.optionA || '', q.optionB || '', q.optionC || '', q.optionD || ''].filter(Boolean);
      const selectedIndex = ['A', 'B', 'C', 'D'].indexOf(item.userAnswer);
      const correctIndex = q.correctAnswer ? ['A', 'B', 'C', 'D'].indexOf(q.correctAnswer) : -1;

      return (
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
