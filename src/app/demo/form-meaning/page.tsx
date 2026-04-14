'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, ChevronRight, CheckCircle, FileText } from 'lucide-react';
import Link from 'next/link';
import FormMeaningArticleCard from '@/components/FormMeaningArticleCard';
import type { FormMeaningQuestion } from '@/types/test';

export default function DemoFormMeaningPage() {
  const [questions, setQuestions] = useState<FormMeaningQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/tests/form-meaning?count=1&demo=true');
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

  const handleSubmit = () => {
    let correctCount = 0;

    // For single question with multiple blanks
    if (questions.length > 0) {
      const question = questions[0];
      if (question.article) {
        question.article.blanks.forEach(blank => {
          if (answers[blank.id] === blank.correctAnswer.toLowerCase()) {
            correctCount++;
          }
        });
      }
    }

    setScore(correctCount);
    setIsSubmitted(true);
  };

  const handleRestart = () => {
    setAnswers({});
    setIsSubmitted(false);
    setScore(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    const question = questions[0];
    const totalBlanks = question?.article?.blanks.length || 0;
    const passed = score >= Math.ceil(totalBlanks * 0.7);

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
            <p className="text-4xl sm:text-5xl font-bold text-slate-900 mb-2">{Math.round((score / totalBlanks) * 100)}%</p>
            <p className="text-slate-500">{score} out of {totalBlanks} correct</p>
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

  if (questions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center text-slate-600">No questions available.</p>
      </div>
    );
  }

  const question = questions[0];
  const hasArticleData = question.article;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/demo" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4">
          <ArrowLeft className="w-5 h-5" />
          Back to Demo Tests
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Form & Meaning (Demo)</h1>
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="w-5 h-5" />
            <span>5 min</span>
          </div>
        </div>
      </div>

      {/* Article Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-purple-600">Fill in the blanks</span>
        </div>

        {hasArticleData && question.article ? (
          <FormMeaningArticleCard
            article={question.article}
            answers={answers}
            isSubmitted={isSubmitted}
            onInputChange={handleInputChange}
            disabled={isSubmitted}
          />
        ) : (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-6">{question.questionText}</h2>
            <input
              type="text"
              className="w-48 px-3 py-2 rounded border-2 border-purple-300 focus:border-purple-500 focus:outline-none text-center"
              placeholder=""
              value={answers[question.id] || ''}
              onChange={(e) => handleInputChange(question.id, e.target.value)}
              disabled={isSubmitted}
            />
          </div>
        )}

        {isSubmitted && (
          <div className={`mt-6 p-4 rounded-xl ${score === (question.article?.blanks.length || 1) ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            <p className="font-medium text-slate-800 mb-1">
              {score === (question.article?.blanks.length || 1) ? '✓ Perfect!' : `Score: ${score}/${question.article?.blanks.length || 1}`}
            </p>
            <p className="text-slate-600">
              {score === (question.article?.blanks.length || 1)
                ? 'Excellent work! All blanks filled correctly.'
                : 'Check the correct answers shown above in green.'}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={Object.keys(answers).length === 0}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Answers
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
