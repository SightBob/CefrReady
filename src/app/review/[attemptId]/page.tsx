'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, CheckCircle, XCircle, Trophy, Clock, Loader2 } from 'lucide-react';
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

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading review...</p>
        </div>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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

  const noOp = () => {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
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
                  <span className="mx-1">•</span>
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {attempt.completedAt
                      ? new Date(attempt.completedAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${scoreColor}`}>
              {attempt.score}%
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-3 gap-4 mb-8">
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
        </div>

        {/* Question List */}
        <div className="space-y-6">
          {reviewItems.map((item, index) => (
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
          ))}
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
