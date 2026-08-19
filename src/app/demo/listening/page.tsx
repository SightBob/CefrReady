'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Headphones } from 'lucide-react';
import QuizLoadingSkeleton from '@/components/QuizLoadingSkeleton';
import type { ListeningQuestion, Option } from '@/types/test';

const TestLayout = dynamic(() => import('@/components/TestLayout'));
const TestResults = dynamic(() => import('@/components/TestResults'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-white rounded-2xl border border-slate-100 shadow-lg" style={{ minHeight: '400px' }} />,
});
const ListeningAudioPlayer = dynamic(() => import('@/components/ListeningAudioPlayer'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-white rounded-2xl border border-slate-100 p-6 md:p-8" style={{ minHeight: '400px' }} />,
});

export default function DemoListeningPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<ListeningQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [hasPlayedMap, setHasPlayedMap] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/tests/listening?count=5&demo=true');
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
    setHasPlayedMap({});
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
        sectionIcon={Headphones}
        sectionColor="from-orange-500 to-amber-500"
        headerTitle="Listening (Demo)"
        durationMinutes={5}
      />
    );
  }

  const question = questions[currentQuestion];
  if (!question) return <QuizLoadingSkeleton />;

  const options: Option[] = [
    { key: 'A', value: question.optionA },
    { key: 'B', value: question.optionB },
    { key: 'C', value: question.optionC },
    { key: 'D', value: question.optionD },
  ];

  return (
    <TestLayout
      title="Listening (Demo)"
      durationMinutes={5}
      totalQuestions={questions.length}
      currentQuestion={currentQuestion}
      answers={answers}
      onQuestionSelect={handleQuestionSelect}
      onPrevious={handlePrevious}
      onNext={handleNext}
      onSubmit={handleSubmit}
      currentQuestionId={question.id}
      sectionIcon={Headphones}
      sectionColor="from-orange-500 to-amber-500"
      sectionLabel="Listening"
      onExit={() => router.push('/demo')}
    >
      <ListeningAudioPlayer
        key={question.id}
        audioUrl={question.audioUrl || undefined}
        transcript={question.transcript || question.questionText}
        questionText={question.questionText}
        options={options}
        selectedAnswer={selectedAnswer}
        correctAnswer={selectedAnswer !== null ? question.correctAnswer : null}
        explanation={selectedAnswer !== null ? (question.explanation || 'See transcript above.') : null}
        onAudioPlayed={() => setHasPlayedMap(prev => ({ ...prev, [currentQuestion]: true }))}
        onAnswerSelect={handleAnswer}
        disabled={false}
      />
    </TestLayout>
  );
}
