'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, ChevronRight, Clock, CheckCircle, RotateCcw } from 'lucide-react';
import TestLayout from '@/components/TestLayout';
import type { Blank } from '@/types/test';
import FormMeaningArticleCard from '@/components/FormMeaningArticleCard';

interface RawQuestion {
  id: number;
  testTypeId: string;
  questionText: string;
  article?: { title: string; text: string; blanks: Blank[] } | null;
  cefrLevel: string;
  orderIndex: number;
}

export default function DemoFormMeaningPage() {
  const [questions, setQuestions] = useState<RawQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Combine all articles into one, re-numbering blanks globally
  const combinedArticle = useMemo(() => {
    const allBlanks: Blank[] = [];
    let combinedText = '';
    let globalBlankId = 1;
    questions.forEach((q, index) => {
      if (q.article) {
        let text = q.article.text;
        q.article.blanks.forEach((blank) => {
          const oldPh = `{{${blank.id}}}`;
          const newPh = `{{${globalBlankId}}}`;
          text = text.replace(oldPh, newPh);
          allBlanks.push({ id: globalBlankId, correctAnswer: blank.correctAnswer, hint: blank.hint });
          globalBlankId++;
        });
        if (index > 0) combinedText += ' ';
        combinedText += text;
      }
    });
    return { title: 'Form & Meaning Practice', text: combinedText, blanks: allBlanks };
  }, [questions]);

  const totalBlanks = combinedArticle.blanks.length;
  const answeredCount = Object.keys(answers).filter((k) => answers[parseInt(k)]).length;

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/tests/form-meaning?count=5&demo=true');
      const data = await res.json();
      if (data.success) {
        setQuestions(data.data);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (blankId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [blankId]: value.toLowerCase().trim() }));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // Calculate score client-side: compare each blank answer against correct answer
      const localCorrectCount = combinedArticle.blanks.filter(
        (b) => answers[b.id]?.toLowerCase() === b.correctAnswer.toLowerCase()
      ).length;

      setCorrectCount(localCorrectCount);
      setIsSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setIsSubmitted(false);
    setCorrectCount(0);
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="bg-white rounded-2xl border border-slate-100 p-8 space-y-4">
            <div className="h-5 w-3/4 bg-slate-200 rounded animate-pulse" />
            <div className="h-5 w-1/2 bg-slate-200 rounded animate-pulse" />
            <div className="space-y-3 pt-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    const percentage = Math.round((correctCount / totalBlanks) * 100);
    const passed = percentage >= 70;

    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <Link href="/demo" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors mb-8 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Demo Tests
          </Link>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            {/* Score Header */}
            <div className={`p-8 text-center ${passed ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className={`inline-flex w-16 h-16 rounded-full items-center justify-center mb-4 ${passed ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {passed
                  ? <CheckCircle className="w-8 h-8 text-emerald-600" />
                  : <RotateCcw className="w-8 h-8 text-red-600" />
                }
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">
                {passed ? 'Great Job!' : 'Keep Practicing!'}
              </h1>
              <p className="text-slate-500 text-sm">
                {passed ? 'You passed the demo test.' : 'You need 70% to pass. Try again!'}
              </p>
            </div>

            {/* Score */}
            <div className="p-8 text-center border-b border-slate-100">
              <p className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 mb-1">{percentage}%</p>
              <p className="text-slate-500 text-sm">{correctCount} of {totalBlanks} correct</p>
            </div>

            {/* Breakdown */}
            <div className="px-8 py-4 border-b border-slate-100">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle className="w-4 h-4" />
                  {correctCount} correct
                </span>
                <span className="flex items-center gap-2 text-red-500">
                  <RotateCcw className="w-4 h-4" />
                  {totalBlanks - correctCount} incorrect
                </span>
              </div>
            </div>

            {/* CTA */}
            <div className="p-6 space-y-3">
              <button onClick={handleRestart} className="w-full btn-primary flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
              <Link href="/demo" className="btn-secondary w-full flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Other Demo Tests
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TestLayout
      title="Form & Meaning (Demo)"
      duration="5 min"
      totalQuestions={totalBlanks}
      currentQuestion={answeredCount}
      answers={Object.keys(answers).map(Number)}
      flaggedQuestions={[]}
      onQuestionSelect={() => {}}
      onPrevious={() => {}}
      onNext={() => {}}
      onSubmit={handleSubmit}
      onFlag={() => {}}
    >
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-purple-600">Fill in the blanks</span>
        </div>

        {combinedArticle.blanks.length > 0 && (
          <FormMeaningArticleCard
            article={combinedArticle}
            answers={answers}
            isSubmitted={isSubmitted}
            onInputChange={handleInputChange}
            disabled={isSubmitted || submitting}
          />
        )}

        {!combinedArticle.blanks.length && (
          <div className="text-center text-slate-500 py-8">
            No questions available for this demo.
          </div>
        )}
      </div>

      {/* Submit button after answering */}
      {answeredCount > 0 && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 active:translate-y-[1px] active:shadow-sm transition-all shadow-lg shadow-primary-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Answers
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </TestLayout>
  );
}