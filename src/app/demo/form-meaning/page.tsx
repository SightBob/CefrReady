'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Clock, CheckCircle, RotateCcw } from 'lucide-react';
import FormMeaningArticleCard from '@/components/FormMeaningArticleCard';
import type { Blank } from '@/types/test';
import ConfirmModal from '@/components/ConfirmModal';

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
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

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

  const executeSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setShowSubmitConfirm(false);

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

  const handleSubmit = () => {
    if (submitting) return;
    const unanswered = totalBlanks - answeredCount;

    if (unanswered > 0) {
      setShowSubmitConfirm(true);
    } else {
      executeSubmit();
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setIsSubmitted(false);
    setCorrectCount(0);
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    const percentage = Math.round((correctCount / totalBlanks) * 100);
    const passed = percentage >= 70;

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/demo" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-6">
          <ArrowLeft className="w-5 h-5" />
          Back to Demo Tests
        </Link>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center">
          <div className={`inline-flex p-4 rounded-full ${passed ? 'bg-emerald-50' : 'bg-red-50'} mb-6`}>
            <CheckCircle className={`w-12 h-12 ${passed ? 'text-emerald-600' : 'text-red-600'}`} />
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {passed ? 'Great Job!' : 'Keep Practicing!'}
          </h1>
          <p className="text-slate-600 mb-6">
            {passed ? 'You passed the demo test!' : 'You need 70% to pass. Try again!'}
          </p>

          <div className="bg-slate-50 rounded-xl p-6 mb-6">
            <p className="text-4xl sm:text-5xl font-bold text-slate-900 mb-2">{percentage}%</p>
            <p className="text-slate-500">{correctCount} out of {totalBlanks} correct</p>
          </div>

          <div className="bg-primary-50 rounded-xl p-4 mb-6">
            <p className="text-primary-700 font-medium">Want more articles and progress tracking?</p>
            <Link href="/tests" className="text-primary-600 hover:text-primary-700 underline font-medium">
              Login for Full Tests →
            </Link>
          </div>

          <div className="flex gap-4 justify-center">
            <button onClick={handleRestart} className="btn-primary">
              Try Again
            </button>
            <Link href="/demo" className="btn-secondary">
              Other Demo Tests
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0 || totalBlanks === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/demo" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-6">
          <ArrowLeft className="w-5 h-5" />
          Back to Demo Tests
        </Link>
        <p className="text-center text-slate-600">No questions available.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-slate-200">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
          style={{ width: `${totalBlanks > 0 ? (answeredCount / totalBlanks) * 100 : 0}%` }}
        />
      </div>

      {/* Header */}
      <div className="bg-white border-b border-slate-200 shrink-0 z-40 pt-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Link href="/demo" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <div>
                <h1 className="font-bold text-slate-900">Form & Meaning (Demo)</h1>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span>5 min</span>
                  <span className="mx-1">•</span>
                  <span>{totalBlanks} blanks</span>
                </div>
              </div>
            </div>

            {/* Desktop: Submit Button */}
            <div className="hidden md:flex items-center gap-4">
              {!isSubmitted && (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary text-sm py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Answers
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-slate-600 mb-2">
            <span>Blank {answeredCount} of {totalBlanks}</span>
            <span>{totalBlanks > 0 ? Math.round((answeredCount / totalBlanks) * 100) : 0}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${totalBlanks > 0 ? (answeredCount / totalBlanks) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-600">Fill in the blanks</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-6">
            {combinedArticle.title}
          </h2>
          <FormMeaningArticleCard
            article={combinedArticle}
            answers={answers}
            isSubmitted={isSubmitted}
            onInputChange={handleInputChange}
            disabled={isSubmitted || submitting}
          />
        </div>

        {/* Desktop: Submit Button (above mobile bar) */}
        {!isSubmitted && (
          <div className="hidden md:flex justify-end mt-8">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Answers
            </button>
          </div>
        )}
      </div>

      {/* Mobile Bottom Submit Bar */}
      {!isSubmitted && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-4 py-3">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Answers
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={showSubmitConfirm}
        onCancel={() => setShowSubmitConfirm(false)}
        onConfirm={executeSubmit}
        title="ยืนยันการส่งคำตอบ"
        description="คุณยังมีคำถามที่ยังไม่ได้ตอบ คุณแน่ใจหรือไม่ว่าต้องการส่งคำตอบ?"
        confirmLabel="ส่งคำตอบ"
      />
    </div>
  );
}