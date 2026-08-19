'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import TestLayout from '@/components/TestLayout';
import FocusMeaningConversationCard from '@/components/FocusMeaningConversationCard';
import type { FocusMeaningQuestion } from '@/types/test';

export default function DemoFocusMeaningPage() {
  const [questions, setQuestions] = useState<FocusMeaningQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [answers, setAnswers] = useState<(string | null)[]>([]);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/tests/focus-meaning?count=5&demo=true');
      const data = await res.json();
      if (data.success) {
        setQuestions(data.data);
        setAnswers(Array(data.data.length).fill(null));
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answerIndex: number) => {
    if (selectedAnswer !== null) return;

    const letter = ['A', 'B', 'C', 'D'][answerIndex];
    setSelectedAnswer(answerIndex);

    const newAnswers = [...answers];
    newAnswers[currentQuestion] = letter;
    setAnswers(newAnswers);

    const question = questions[currentQuestion];
    if (letter === question.correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const handleQuestionSelect = (index: number) => {
    setCurrentQuestion(index);
    const letter = answers[index];
    setSelectedAnswer(letter ? ['A', 'B', 'C', 'D'].indexOf(letter) : null);
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      const prev = currentQuestion - 1;
      setCurrentQuestion(prev);
      const letter = answers[prev];
      setSelectedAnswer(letter ? ['A', 'B', 'C', 'D'].indexOf(letter) : null);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      const next = currentQuestion + 1;
      setCurrentQuestion(next);
      const letter = answers[next];
      setSelectedAnswer(letter ? ['A', 'B', 'C', 'D'].indexOf(letter) : null);
    }
  };

  const handleSubmit = () => {
    const unanswered = answers.filter(a => a === null).length;
    if (unanswered > 0) {
      const confirm = window.confirm(`You have ${unanswered} unanswered questions. Are you sure you want to submit?`);
      if (!confirm) return;
    }
    setIsFinished(true);
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setScore(0);
    setIsFinished(false);
    setAnswers(Array(questions.length).fill(null));
  };

  // ─── Loading Skeleton ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-white">
        <div className="bg-white border-b border-slate-200 h-14" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 animate-pulse" style={{ minHeight: '500px' }}>
            <div className="h-5 w-3/4 bg-slate-200 rounded mb-4" />
            <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-4 w-2/3 bg-slate-100 rounded" />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Results Screen ─────────────────────────────────────────────
  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div className="min-h-[100dvh] bg-white flex items-center justify-center p-4">
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
                  ? <Trophy className="w-8 h-8 text-emerald-600" />
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
              <p className="text-slate-500 text-sm">{score} of {questions.length} correct</p>
            </div>

            {/* Breakdown */}
            <div className="px-8 py-4 border-b border-slate-100">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle className="w-4 h-4" />
                  {score} correct
                </span>
                <span className="flex items-center gap-2 text-red-500">
                  <XCircle className="w-4 h-4" />
                  {questions.length - score} incorrect
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

  // ─── Quiz ───────────────────────────────────────────────────────
  const question = questions[currentQuestion];
  const correctIndex = question.correctAnswer === 'A' ? 0 : question.correctAnswer === 'B' ? 1 : question.correctAnswer === 'C' ? 2 : 3;

  return (
    <TestLayout
      title="Focus on Meaning (Demo)"
      durationMinutes={5}
      totalQuestions={questions.length}
      currentQuestion={currentQuestion}
      answers={answers}
      onQuestionSelect={handleQuestionSelect}
      onPrevious={handlePrevious}
      onNext={handleNext}
      onSubmit={handleSubmit}
    >
      <FocusMeaningConversationCard
        conversation={question.conversation || []}
        question={question.questionText}
        options={[
          question.optionA || '',
          question.optionB || '',
          question.optionC || '',
          question.optionD || ''
        ]}
        selectedAnswer={selectedAnswer}
        correctAnswer={selectedAnswer !== null ? correctIndex : null}
        explanation={selectedAnswer !== null ? (question.explanation || '') : ''}
        onAnswerSelect={handleAnswer}
        disabled={false}
      />
    </TestLayout>
  );
}
