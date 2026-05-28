'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, ChevronRight, CheckCircle, FileText } from 'lucide-react';
import Link from 'next/link';
import SelectableText from '@/components/SelectableText';
import type { FormMeaningQuestion, Blank } from '@/types/test';

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
          if (answers[blank.id]?.toLowerCase().trim() === blank.correctAnswer.toLowerCase().trim()) {
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

  // Custom inline article renderer
  const renderInlineArticle = (article: { title: string; text: string; blanks: Blank[] }) => {
    let text = article.text;
    const parts: React.ReactNode[] = [];
    let keyIndex = 0;

    article.blanks.forEach((blank) => {
      const placeholder = `{{${blank.id}}}`;
      const splitIndex = text.indexOf(placeholder);

      if (splitIndex !== -1) {
        // Text before blank
        if (splitIndex > 0) {
          parts.push(
            <span key={keyIndex++}>
              <SelectableText
                text={text.substring(0, splitIndex)}
                contextSentence={article.text}
                sourceType="article"
                inline={true}
              />
            </span>
          );
        }

        // Blank input
        const isCorrect = isSubmitted && answers[blank.id]?.toLowerCase() === blank.correctAnswer.toLowerCase();
        const isWrong = isSubmitted && !isCorrect && answers[blank.id];
        const isEmpty = isSubmitted && !answers[blank.id];

        parts.push(
          <span key={keyIndex++} className="inline-flex flex-col items-start mx-1 align-baseline">
            <input
              type="text"
              className={`w-24 sm:w-32 px-2 py-1 rounded border-2 text-center text-sm ${
                isSubmitted
                  ? isCorrect
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : isWrong
                    ? 'border-red-500 bg-red-50 text-red-700 line-through'
                    : isEmpty
                    ? 'border-amber-400 bg-amber-50 text-amber-600'
                    : 'border-slate-300 bg-slate-50'
                  : 'border-purple-300 focus:border-purple-500 focus:outline-none'
              }`}
              placeholder=""
              value={answers[blank.id] || ''}
              onChange={(e) => handleInputChange(blank.id, e.target.value)}
              disabled={isSubmitted}
            />
            {isSubmitted && isWrong && (
              <span className="flex items-center gap-1 mt-1">
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  {blank.correctAnswer}
                </span>
              </span>
            )}
            {isSubmitted && isEmpty && (
              <span className="flex items-center gap-1 mt-1">
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  Answer: {blank.correctAnswer}
                </span>
              </span>
            )}
          </span>
        );

        text = text.substring(splitIndex + placeholder.length);
      }
    });

    // Remaining text
    if (text.length > 0) {
      parts.push(
        <span key={keyIndex}>
          <SelectableText
            text={text}
            contextSentence={article.text}
            sourceType="article"
            inline={true}
          />
        </span>
      );
    }

    return parts;
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
    const question = questions[0];
    const totalBlanks = question?.article?.blanks.length || 0;
    const percentage = totalBlanks > 0 ? Math.round((score / totalBlanks) * 100) : 0;
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
                  : <ChevronRight className="w-8 h-8 text-red-600" />
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
              <p className="text-slate-500 text-sm">{score} of {totalBlanks} correct</p>
            </div>

            {/* Breakdown */}
            <div className="px-8 py-4 border-b border-slate-100">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle className="w-4 h-4" />
                  {score} correct
                </span>
                <span className="flex items-center gap-2 text-red-500">
                  <ChevronRight className="w-4 h-4" />
                  {totalBlanks - score} incorrect
                </span>
              </div>
            </div>

            {/* CTA */}
            <div className="p-6 space-y-3">
              <button onClick={handleRestart} className="w-full btn-primary flex items-center justify-center gap-2">
                <ChevronRight className="w-4 h-4" />
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

  if (questions.length === 0) {
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
          <>
            <h2 className="text-xl font-bold text-slate-800 mb-6">
              {question.article.title}
            </h2>
            <div className="text-lg text-slate-700 leading-relaxed space-y-2">
              {renderInlineArticle(question.article)}
            </div>
          </>
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