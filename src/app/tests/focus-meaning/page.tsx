'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import TestResults from '@/components/TestResults';
import FocusMeaningConversationCard from '@/components/FocusMeaningConversationCard';
import type { FocusMeaningQuestion, QuestionResult } from '@/types/test';

export default function FocusMeaningPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [questions, setQuestions] = useState<FocusMeaningQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }
    if (status === 'authenticated') {
      fetchQuestions();
    }
  }, [status]);

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/tests/focus-meaning?count=10');
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

    setSelectedAnswer(answerIndex);
    setShowExplanation(true);

    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answerIndex;
    setAnswers(newAnswers);
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(answers[currentQuestion - 1]);
      setShowExplanation(answers[currentQuestion - 1] !== null);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(answers[currentQuestion + 1]);
      setShowExplanation(answers[currentQuestion + 1] !== null);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    const unanswered = answers.filter(a => a === null).length;
    if (unanswered > 0) {
      const confirm = window.confirm(`You have ${unanswered} unanswered questions. Are you sure you want to submit?`);
      if (!confirm) return;
    }

    setSubmitting(true);
    try {
      const payload = {
        testTypeId: 'focus-meaning',
        answers: questions.map((q, i) => ({
          questionId: q.id,
          selectedAnswer: ['A', 'B', 'C', 'D'][answers[i] || 0],
        })),
      };

      const res = await fetch('/api/tests/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setScore(data.data.correctAnswers);
        setIsFinished(true);
      } else {
        console.error('Submit failed:', data.error);
      }
    } catch (error) {
      console.error('Error submitting test:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestart = () => {
    router.push('/tests');
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

  if (isFinished) {
    return (
      <TestResults
        score={score}
        totalQuestions={questions.length}
        onRestart={handleRestart}
      />
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/tests" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4">
          <ArrowLeft className="w-5 h-5" />
          Back to Tests
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Focus on Meaning</h1>
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="w-5 h-5" />
            <span>20 min</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-slate-600 mb-2">
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Use the shared component instead of inline markup */}
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
        correctAnswer={0} // Will be updated after submission
        explanation={question.explanation || ''}
        onAnswerSelect={handleAnswer}
        disabled={submitting}
      />

      <div className="flex justify-end">
        <button
          onClick={handleNext}
          disabled={selectedAnswer === null || submitting}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Test'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
