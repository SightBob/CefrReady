'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, FileText, Clock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Blank {
  id: number;
  correctAnswer: string;
  hint?: string;
}

interface Question {
  id: number;
  testTypeId: string;
  questionText: string;
  cefrLevel: string;
  difficulty: string;
  correctAnswer: string;
  explanation: string;
  orderIndex: number;
}

export default function FormMeaningPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
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
      const res = await fetch('/api/tests/form-meaning?count=10');
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

  const handleInputChange = (questionId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value.toLowerCase().trim() }));
  };

  const handleSubmit = async () => {
    const unanswered = questions.filter(q => !answers[q.id]).length;
    if (unanswered > 0) {
      const confirm = window.confirm(`You have ${unanswered} unanswered questions. Are you sure you want to submit?`);
      if (!confirm) return;
    }

    setSubmitting(true);
    try {
      const payload = {
        testTypeId: 'form-meaning',
        answers: questions.map((q) => ({
          questionId: q.id,
          selectedAnswer: answers[q.id] || '',
        })),
      };

      console.log('Submitting test:', payload);

      const res = await fetch('/api/tests/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);

      if (data.success) {
        setScore(data.data.correctAnswers);
        setIsSubmitted(true);
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
    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/tests" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-6">
          ← Back to Tests
        </Link>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center">
          <div className={`inline-flex p-4 rounded-full ${passed ? 'bg-emerald-50' : 'bg-red-50'} mb-6`}>
            <CheckCircle className={`w-12 h-12 ${passed ? 'text-emerald-600' : 'text-red-600'}`} />
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/tests" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4">
          ← Back to Tests
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Form & Meaning</h1>
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="w-5 h-5" />
            <span>25 min</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-slate-600 mb-2">
          <span>Question {Object.keys(answers).length} of {questions.length}</span>
          <span>{Math.round(((Object.keys(answers).length) / questions.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
            style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((question, index) => {
          const isCorrect = isSubmitted && answers[question.id] === question.correctAnswer.toLowerCase();
          const isWrong = isSubmitted && answers[question.id] !== question.correctAnswer.toLowerCase() && answers[question.id];

          return (
            <div key={question.id} className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">Question {index + 1}</span>
              </div>

              <h2 className="text-lg font-medium text-slate-800 mb-4">{question.questionText}</h2>

              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  className={`w-48 px-3 py-2 rounded border-2 text-center ${
                    isSubmitted
                      ? isCorrect
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : isWrong
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-slate-300 bg-slate-50'
                      : 'border-purple-300 focus:border-purple-500 focus:outline-none'
                  }`}
                  placeholder={`(${question.difficulty})`}
                  value={answers[question.id] || ''}
                  onChange={(e) => handleInputChange(question.id, e.target.value)}
                  disabled={isSubmitted || submitting}
                />
                {isSubmitted && isWrong && (
                  <span className="text-sm text-emerald-600 font-medium">
                    Correct: {question.correctAnswer}
                  </span>
                )}
              </div>

              {isSubmitted && question.explanation && (
                <div className={`mt-4 p-4 rounded-xl ${
                  isCorrect
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  <p className="font-medium text-slate-800 mb-1">
                    {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                  </p>
                  <p className="text-slate-600">{question.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isSubmitted && (
        <div className="flex justify-end mt-8">
          <button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length < questions.length || submitting}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Answers
          </button>
        </div>
      )}
    </div>
  );
}
