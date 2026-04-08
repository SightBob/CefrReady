'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TestLayout from '@/components/TestLayout';
import FocusFormQuestionCard from '@/components/FocusFormQuestionCard';
import type { FocusFormQuestion, QuestionResult, Option } from '@/types/test';

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

    // Find the question and check if correct
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
    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/demo" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-6">
          ← Back to Demo Tests
        </Link>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center">
          <div className={`inline-flex p-4 rounded-full ${passed ? 'bg-emerald-50' : 'bg-red-50'} mb-6`}>
            {passed ? '✓' : '✗'}
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {passed ? 'Great Job!' : 'Keep Practicing!'}
          </h1>
          <p className="text-slate-600 mb-6">
            {passed ? 'You passed the demo test!' : 'You need 70% to pass. Try again!'}
          </p>

          <div className="bg-slate-50 rounded-xl p-6 mb-6">
            <p className="text-5xl font-bold text-slate-900 mb-2">{percentage}%</p>
            <p className="text-slate-500">{score} out of {questions.length} correct</p>
          </div>

          <div className="bg-primary-50 rounded-xl p-4 mb-6">
            <p className="text-primary-700 font-medium">Want more questions and progress tracking?</p>
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

  const question = questions[currentQuestion];
  const options: Option[] = [
    { key: 'A', value: question.optionA },
    { key: 'B', value: question.optionB },
    { key: 'C', value: question.optionC },
    { key: 'D', value: question.optionD },
  ];

  // For demo mode, we have the correct answer from the API
  const correctAnswer = question.correctAnswer;
  const explanation = question.explanation;

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
        onAnswerSelect={handleAnswer}
        disabled={false}
      />
    </TestLayout>
  );
}
