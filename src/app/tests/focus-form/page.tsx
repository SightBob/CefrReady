'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import TestLayout from '@/components/TestLayout';

interface Question {
  id: number;
  testTypeId: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  cefrLevel: string;
  difficulty: string;
  orderIndex: number;
}

interface Answer {
  questionId: number;
  selectedAnswer: string;
}

interface QuestionResult {
  questionId: number;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  explanation: string | null;
}

export default function FocusFormPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [flaggedQuestions, setFlaggedQuestions] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<QuestionResult[]>([]);
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
      const res = await fetch('/api/tests/focus-form?count=10');
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

  const handleSubmit = async () => {
    const unanswered = answers.filter(a => a === null).length;
    if (unanswered > 0) {
      const confirm = window.confirm(`You have ${unanswered} unanswered questions. Are you sure you want to submit?`);
      if (!confirm) return;
    }

    setSubmitting(true);
    try {
      const payload = {
        testTypeId: 'focus-form',
        answers: questions.map((q, i) => ({
          questionId: q.id,
          selectedAnswer: answers[i] || 'A',
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
        setResults(data.data.results);
        setIsFinished(true);
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
    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/tests" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-6">
          ← Back to Tests
        </Link>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center">
          <div className={`inline-flex p-4 rounded-full ${passed ? 'bg-emerald-50' : 'bg-red-50'} mb-6`}>
            {passed ? (
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            ) : (
              <XCircle className="w-12 h-12 text-red-600" />
            )}
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {passed ? 'Congratulations!' : 'Keep Practicing!'}
          </h1>
          <p className="text-slate-600 mb-6">
            {passed ? 'You passed the test!' : 'You need 70% to pass. Try again!'}
          </p>

          <div className="bg-slate-50 rounded-xl p-6 mb-6">
            <p className="text-5xl font-bold text-slate-900 mb-2">{percentage}%</p>
            <p className="text-slate-500">{score} out of {questions.length} correct</p>
          </div>

          <div className="flex gap-4 justify-center">
            <button onClick={handleRestart} className="btn-primary">
              Other Tests
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const options = [
    { key: 'A', value: question?.optionA },
    { key: 'B', value: question?.optionB },
    { key: 'C', value: question?.optionC },
    { key: 'D', value: question?.optionD },
  ];

  return (
    <TestLayout
      title="Focus on Form"
      duration="15 min"
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
      {/* Question Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8">
        <p className="text-lg md:text-xl text-slate-800 mb-6 leading-relaxed">
          {question?.questionText}
        </p>

        <div className="grid grid-cols-1 gap-3">
          {options.map((opt) => {
            const isSelected = selectedAnswer === opt.key;
            const isCorrect = opt.key === results[currentQuestion]?.correctAnswer;

            let buttonClass = 'p-4 rounded-xl border-2 text-left transition-all duration-200 ';

            if (selectedAnswer === null) {
              buttonClass += 'border-slate-200 hover:border-primary-300 hover:bg-primary-50';
            } else if (isCorrect) {
              buttonClass += 'border-emerald-500 bg-emerald-50';
            } else if (isSelected) {
              buttonClass += 'border-red-500 bg-red-50';
            } else {
              buttonClass += 'border-slate-200 opacity-50';
            }

            return (
              <button
                key={opt.key}
                onClick={() => handleAnswer(opt.key)}
                disabled={selectedAnswer !== null || submitting}
                className={buttonClass}
              >
                <span className="font-medium text-slate-800">
                  <span className="inline-block w-6 mr-2">{opt.key}.</span>
                  {opt.value}
                </span>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showExplanation && results[currentQuestion] && (
          <div className={`mt-6 p-4 rounded-xl ${
            results[currentQuestion].isCorrect
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-amber-50 border border-amber-200'
          }`}>
            <p className="font-medium text-slate-800 mb-1">
              {results[currentQuestion].isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </p>
            <p className="text-slate-600">{results[currentQuestion].explanation}</p>
          </div>
        )}
      </div>
    </TestLayout>
  );
}
