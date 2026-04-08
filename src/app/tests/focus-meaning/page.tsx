'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, MessageCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

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
  explanation: string | null;
}

export default function FocusMeaningPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
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

  const handleAnswer = (answer: string) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(answer);
    setShowExplanation(true);

    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answer;
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
          selectedAnswer: answers[i] || 'A',
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

  // Parse conversation from question text if it contains speaker format
  const parseConversation = (text: string) => {
    // For now, we'll just display the question as is
    // In a real implementation, you might want to parse structured conversation data
    return [{ speaker: 'Context', text }];
  };

  const conversation = parseConversation(question?.questionText || '');

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/tests" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4">
          ← Back to Tests
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

      {/* Question Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-600">Context</span>
        </div>

        {/* Conversation Display */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3">
          {conversation.map((line, index) => (
            <div key={index} className="flex gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                line.speaker === 'A'
                  ? 'bg-primary-100 text-primary-700'
                  : line.speaker === 'B'
                  ? 'bg-accent-100 text-accent-700'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {line.speaker.charAt(0)}
              </div>
              <p className="flex-1 text-slate-700 leading-relaxed pt-1">{line.text}</p>
            </div>
          ))}
        </div>

        <p className="text-lg font-medium text-slate-800 mb-6">What does this mean?</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {options.map((option, index) => {
            let buttonClass = 'p-4 rounded-xl border-2 text-left transition-all duration-200 ';

            if (selectedAnswer === null) {
              buttonClass += 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50';
            } else if (selectedAnswer === option.key && showExplanation) {
              // We'll get the correct answer from results later
              buttonClass += 'border-emerald-500 bg-emerald-50';
            } else if (selectedAnswer === option.key) {
              buttonClass += 'border-red-500 bg-red-50';
            } else {
              buttonClass += 'border-slate-200 opacity-50';
            }

            return (
              <button
                key={option.key}
                onClick={() => handleAnswer(option.key)}
                disabled={selectedAnswer !== null || submitting}
                className={buttonClass}
              >
                <span className="font-medium text-slate-800">{option.value}</span>
              </button>
            );
          })}
        </div>

        {showExplanation && question.explanation && (
          <div className={`mt-6 p-4 rounded-xl ${selectedAnswer === answers[currentQuestion] ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            <p className="font-medium text-slate-800 mb-1">
              {selectedAnswer === answers[currentQuestion] ? '✓ Correct!' : '✗ Incorrect'}
            </p>
            <p className="text-slate-600">{question.explanation}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentQuestion === 0 || submitting}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          disabled={selectedAnswer === null || submitting}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Test'}
        </button>
      </div>
    </div>
  );
}