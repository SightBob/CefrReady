'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { BookOpen } from 'lucide-react';
import FocusFormQuestionCard from '@/components/FocusFormQuestionCard';
import QuizLoadingSkeleton from '@/components/QuizLoadingSkeleton';
import type { FocusMeaningQuestion, Option } from '@/types/test';

const TestLayout = dynamic(() => import('@/components/TestLayout'));
const TestResults = dynamic(() => import('@/components/TestResults'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-white rounded-2xl border border-slate-100 shadow-lg" style={{ minHeight: '400px' }} />,
});

export default function DemoFocusMeaningPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<FocusMeaningQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [answers, setAnswers] = useState<(string | null)[]>([]);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/tests/focus-meaning?count=10&demo=true');
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

    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answer;
    setAnswers(newAnswers);

    const question = questions[currentQuestion];
    if (answer === question.correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const handleQuestionSelect = (index: number) => {
    setCurrentQuestion(index);
    setSelectedAnswer(answers[index]);
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      handleQuestionSelect(currentQuestion - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      handleQuestionSelect(currentQuestion + 1);
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

  if (loading) {
    return <QuizLoadingSkeleton />;
  }

  if (isFinished) {
    return (
      <TestResults
        score={score}
        totalQuestions={questions.length}
        isDemo
        onRestart={handleRestart}
        sectionIcon={BookOpen}
        sectionColor="from-emerald-500 to-teal-500"
        headerTitle="Focus on Meaning (Demo)"
        durationMinutes={5}
      />
    );
  }

  const question = questions[currentQuestion];
  if (!question) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-lg font-semibold text-slate-700">Demo coming soon</p>
          <p className="text-sm text-slate-500 mt-2">No demo questions are available yet. Please check back later.</p>
          <button
            onClick={() => router.push('/demo')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Back to demos
          </button>
        </div>
      </div>
    );
  }

  const options: Option[] = [
    { key: 'A', value: question.optionA || '' },
    { key: 'B', value: question.optionB || '' },
    { key: 'C', value: question.optionC || '' },
    { key: 'D', value: question.optionD || '' },
  ];

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
      currentQuestionId={question.id}
      sectionIcon={BookOpen}
      sectionColor="from-emerald-500 to-teal-500"
      onExit={() => router.push('/demo')}
    >
      <FocusFormQuestionCard
        key={question.id}
        questionText={question.questionText}
        options={options}
        selectedAnswer={selectedAnswer}
        correctAnswer={question.correctAnswer ?? null}
        explanation={question.explanation ?? null}
        conversation={question.conversation ?? null}
        onAnswerSelect={handleAnswer}
        disabled={false}
        accent="emerald"
        headerIcon={BookOpen}
        headerLabel="Conversation"
      />
    </TestLayout>
  );
}
