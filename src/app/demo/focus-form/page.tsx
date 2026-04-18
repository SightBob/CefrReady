'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Trophy, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import TestLayout from '@/components/TestLayout';
import FocusFormQuestionCard from '@/components/FocusFormQuestionCard';
import type { FocusFormQuestion, Option } from '@/types/test';

export default function DemoFocusFormPage() {
  const [questions, setQuestions] = useState<FocusFormQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [flaggedQuestions, setFlaggedQuestions] = useState<number[]>([]);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/tests/focus-form?count=5&demo=true');
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

  const handleAnswer = (answer: string) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(answer);
    setShowExplanation(true);

    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answer;
    setAnswers(newAnswers);

    const question = questions[currentQuestion];
    if (answer === question.correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleQuestionSelect = (index: number) => {
    setCurrentQuestion(index);
    setSelectedAnswer(answers[index]);
    setShowExplanation(answers[index] !== null);
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
    }
  };

  const handleFlag = () => {
    if (flaggedQuestions.includes(currentQuestion)) {
      setFlaggedQuestions(flaggedQuestions.filter(q => q !== currentQuestion));
    } else {
      setFlaggedQuestions([...flaggedQuestions, currentQuestion]);
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
    setShowExplanation(false);
    setScore(0);
    setIsFinished(false);
    setAnswers(Array(questions.length).fill(null));
    setFlaggedQuestions([]);
  };

  // ─── Loading Skeleton ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="bg-white rounded-2xl border border-slate-100 p-8 space-y-4">
            <div className="h-5 w-3/4 bg-slate-200 rounded animate-pulse" />
            <div className="h-5 w-1/2 bg-slate-200 rounded animate-pulse" />
            <div className="grid grid-cols-2 gap-3 pt-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
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
      <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <Link href="/demo" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors mb-8 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Demo Tests
          </Link>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            {/* Score Header */}
            <div className={`p-8 text-center ${passed ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className={`inline-flex w-16 h-16 rounded-full items-center justify-center mb-4 ${passed ? 'bg-emerald-100' : 'bg-red-100'
                }`}>
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
  const options: Option[] = [
    { key: 'A', value: question.optionA },
    { key: 'B', value: question.optionB },
    { key: 'C', value: question.optionC },
    { key: 'D', value: question.optionD },
  ];

  const correctAnswer = question.correctAnswer;
  const explanation = question.explanation;
  const isLastQuestion = currentQuestion === questions.length - 1;

  return (
    <TestLayout
      title="Focus on Form (Demo)"
      duration="5 min"
      totalQuestions={questions.length}
      currentQuestion={currentQuestion}
      answers={answers.map((a, i) => a !== null ? i : null as unknown as number)}
      flaggedQuestions={flaggedQuestions}
      onQuestionSelect={handleQuestionSelect}
      onPrevious={handlePrevious}
      onNext={handleNext}
      onSubmit={handleSubmit}
      onFlag={handleFlag}
    >
      <FocusFormQuestionCard
        questionText={question.questionText}
        options={options}
        selectedAnswer={selectedAnswer}
        correctAnswer={correctAnswer}
        explanation={explanation}
        conversation={question.conversation ?? null}
        onAnswerSelect={handleAnswer}
        disabled={false}
      />

      {/* Prominent Next / Finish button after answering */}
      {/* {selectedAnswer !== null && (
        <div className="mt-6 flex justify-end">
          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 active:translate-y-[1px] active:shadow-sm transition-all shadow-lg shadow-primary-600/20"
            >
              Finish Test
              <Trophy className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 active:translate-y-[1px] active:shadow-sm transition-all shadow-lg shadow-primary-600/20"
            >
              Next Question
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )} */}
    </TestLayout>
  );
}
