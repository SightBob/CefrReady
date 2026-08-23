'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Layers } from 'lucide-react';
import QuizLoadingSkeleton from '@/components/QuizLoadingSkeleton';
import type { FormMeaningQuestion } from '@/types/test';

const FormMeaningQuiz = dynamic(() => import('@/components/FormMeaningQuiz'));
const TestResults = dynamic(() => import('@/components/TestResults'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-white rounded-2xl border border-slate-100 shadow-lg" style={{ minHeight: '400px' }} />,
});

export default function DemoFormMeaningPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<FormMeaningQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [totalBlanks, setTotalBlanks] = useState(0);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/tests/form-meaning?count=10&demo=true');
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

  const handleRestart = () => {
    setScore(0);
    setTotalBlanks(0);
    setIsFinished(false);
    fetchQuestions();
  };

  if (loading) {
    return <QuizLoadingSkeleton />;
  }

  if (isFinished) {
    return (
      <TestResults
        score={score}
        totalQuestions={totalBlanks}
        isDemo
        onRestart={handleRestart}
        sectionIcon={Layers}
        sectionColor="from-purple-500 to-pink-500"
        headerTitle="Form & Meaning (Demo)"
        durationMinutes={5}
      />
    );
  }

  if (questions.length === 0) {
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

  return (
    <FormMeaningQuiz
      questions={questions}
      sectionId="form-meaning"
      setId={0}
      setName="Form & Meaning (Demo)"
      onFinish={(s, total) => { setScore(s); setTotalBlanks(total); setIsFinished(true); }}
      demo
      durationMinutes={5}
      onExit={() => router.push('/demo')}
    />
  );
}
