'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import TestLayout from '@/components/TestLayout';
import FocusFormQuestionCard from '@/components/FocusFormQuestionCard';
import TestResults from '@/components/TestResults';

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
        setResults(data.data.results);
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
  const options = [
    { key: 'A', value: question?.optionA },
    { key: 'B', value: question?.optionB },
    { key: 'C', value: question?.optionC },
    { key: 'D', value: question?.optionD },
  ];

  const correctAnswer = results[currentQuestion]?.correctAnswer || null;
  const explanation = results[currentQuestion]?.explanation || null;

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
      <FocusFormQuestionCard
        questionText={question?.questionText || ''}
        options={options}
        selectedAnswer={selectedAnswer}
        correctAnswer={correctAnswer}
        explanation={explanation}
        onAnswerSelect={handleAnswer}
        disabled={submitting}
      />
    </TestLayout>
  );
}