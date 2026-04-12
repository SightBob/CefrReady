'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

import TestLayout from '@/components/TestLayout';
import FocusFormQuestionCard from '@/components/FocusFormQuestionCard';
import FocusMeaningConversationCard from '@/components/FocusMeaningConversationCard';
import ListeningAudioPlayer from '@/components/ListeningAudioPlayer';
import TestResults from '@/components/TestResults';

import type { QuestionResult, Option, Blank } from '@/types/test';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RawQuestion {
  id: number;
  testTypeId: string;
  questionText: string;
  optionA?: string | null;
  optionB?: string | null;
  optionC?: string | null;
  optionD?: string | null;
  correctAnswer?: string | null;
  explanation?: string | null;
  conversation?: { speaker: string; text: string }[] | null;
  audioUrl?: string | null;
  transcript?: string | null;
  article?: { title: string; text: string; blanks: Blank[] } | null;
  cefrLevel: string;
  difficulty?: string | null;
  orderIndex: number;
}

interface SetData {
  id: number;
  sectionId: string;
  name: string;
  description: string | null;
  questions: RawQuestion[];
}

// ─── Loading Spinner ─────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600">Loading questions...</p>
      </div>
    </div>
  );
}

// ─── Form-Meaning inline article renderer ───────────────────────────────────

function FormMeaningQuiz({
  questions,
  sectionId,
  setId,
  setName,
  onFinish,
}: {
  questions: RawQuestion[];
  sectionId: string;
  setId: number;
  setName: string;
  onFinish: (score: number) => void;
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  // Combine all articles into one, re-numbering blanks globally
  const combinedArticle = useMemo(() => {
    const allBlanks: Blank[] = [];
    let combinedText = '';
    let globalBlankId = 1;
    questions.forEach((q, index) => {
      if (q.article) {
        let text = q.article.text;
        q.article.blanks.forEach((blank) => {
          const oldPh = `{{${blank.id}}}`;
          const newPh = `{{${globalBlankId}}}`;
          text = text.replace(oldPh, newPh);
          allBlanks.push({ id: globalBlankId, correctAnswer: blank.correctAnswer, hint: blank.hint });
          globalBlankId++;
        });
        if (index > 0) combinedText += ' ';
        combinedText += text;
      }
    });
    return { title: setName, text: combinedText, blanks: allBlanks };
  }, [questions, setName]);

  const blankToQuestion = useMemo(() => {
    const map = new Map<number, number>();
    let blankId = 1;
    questions.forEach((q) => {
      if (q.article) {
        q.article.blanks.forEach(() => {
          map.set(blankId, q.id);
          blankId++;
        });
      }
    });
    return map;
  }, [questions]);

  const totalBlanks = combinedArticle.blanks.length;
  const answeredCount = Object.keys(answers).filter((k) => answers[parseInt(k)]).length;

  const handleSubmit = async () => {
    const unanswered = totalBlanks - answeredCount;
    if (unanswered > 0) {
      if (!window.confirm(`You have ${unanswered} unanswered blanks. Submit anyway?`)) return;
    }
    setSubmitting(true);
    try {
      const questionAnswers = new Map<number, string>();
      Object.entries(answers).forEach(([blankIdStr, answer]) => {
        const qId = blankToQuestion.get(parseInt(blankIdStr));
        if (qId !== undefined && answer) questionAnswers.set(qId, answer);
      });

      const res = await fetch('/api/tests/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testTypeId: sectionId,
          testSetId: setId,
          answers: questions.map((q) => ({
            questionId: q.id,
            selectedAnswer: questionAnswers.get(q.id) || '',
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsSubmitted(true);
        setCorrectCount(data.data.correctAnswers);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderArticle = () => {
    let text = combinedArticle.text;
    const parts: React.ReactNode[] = [];
    let key = 0;
    combinedArticle.blanks.forEach((blank) => {
      const ph = `{{${blank.id}}}`;
      const idx = text.indexOf(ph);
      if (idx !== -1) {
        parts.push(<span key={key++}>{text.substring(0, idx)}</span>);
        const isCorrect = isSubmitted && answers[blank.id]?.toLowerCase() === blank.correctAnswer.toLowerCase();
        const isWrong = isSubmitted && !isCorrect && answers[blank.id];
        const isEmpty = isSubmitted && !answers[blank.id];
        parts.push(
          <span key={key++} className="inline-flex flex-col items-start mx-1">
            <input
              type="text"
              className={`w-32 px-2 py-1 rounded border-2 text-center ${
                isSubmitted
                  ? isCorrect
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : isWrong
                    ? 'border-red-500 bg-red-50 text-red-700 line-through'
                    : isEmpty
                    ? 'border-amber-400 bg-amber-50 text-amber-600'
                    : 'border-slate-300 bg-slate-50'
                  : 'border-purple-300 focus:border-purple-500 focus:outline-none'
              }`}
              placeholder={blank.hint?.split(' - ')[0] || 'Answer'}
              value={answers[blank.id] || ''}
              onChange={(e) =>
                !isSubmitted && setAnswers((prev) => ({ ...prev, [blank.id]: e.target.value.toLowerCase().trim() }))
              }
              disabled={isSubmitted || submitting}
            />
            {isSubmitted && isWrong && (
              <span className="flex items-center gap-1 mt-1">
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  {blank.correctAnswer}
                </span>
              </span>
            )}
            {isSubmitted && isEmpty && (
              <span className="flex items-center gap-1 mt-1">
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  Answer: {blank.correctAnswer}
                </span>
              </span>
            )}
          </span>
        );
        text = text.substring(idx + ph.length);
      }
    });
    parts.push(<span key={key}>{text}</span>);
    return parts;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href={`/tests/${sectionId}`} className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4">
          <ArrowLeft className="w-5 h-5" /> Back to Sets
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{setName}</h1>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-slate-600 mb-2">
          <span>Blank {answeredCount} of {totalBlanks}</span>
          <span>{totalBlanks > 0 ? Math.round((answeredCount / totalBlanks) * 100) : 0}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
            style={{ width: `${totalBlanks > 0 ? (answeredCount / totalBlanks) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-purple-600">Fill in the blanks</span>
        </div>
        <div className="text-lg text-slate-700 leading-relaxed">{renderArticle()}</div>
      </div>

      {isSubmitted && (
        <div className={`p-4 rounded-xl mb-6 ${
          correctCount === totalBlanks
            ? 'bg-emerald-50 border border-emerald-200'
            : correctCount >= totalBlanks * 0.7
            ? 'bg-amber-50 border border-amber-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          <p className="font-medium text-slate-800 mb-1">
            Score: {correctCount} out of {totalBlanks}
          </p>
          <p className="text-sm text-slate-600">
            {correctCount === totalBlanks
              ? 'Perfect! All blanks filled correctly.'
              : 'Review your answers above — wrong blanks are highlighted in red with the correct answer shown below.'}
          </p>
        </div>
      )}

      {!isSubmitted && (
        <div className="flex justify-end mt-8">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Answers
          </button>
        </div>
      )}

      {isSubmitted && (
        <div className="flex justify-end mt-4">
          <button
            onClick={() => onFinish(correctCount)}
            className="btn-primary inline-flex items-center gap-2"
          >
            View Results
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Quiz Page ──────────────────────────────────────────────────────────

export default function SetQuizPage() {
  const router = useRouter();
  const params = useParams<{ sectionId: string; setId: string }>();
  const { status } = useSession();

  const sectionId = params.sectionId;
  const setId = parseInt(params.setId);

  const [setData, setSetData] = useState<SetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Standard quiz state (MCQ types)
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [flaggedQuestions, setFlaggedQuestions] = useState<number[]>([]);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Listening state: track per-question whether audio has finished playing
  const [audioPlayedMap, setAudioPlayedMap] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/tests');
      return;
    }
    if (status === 'authenticated' && !isNaN(setId)) {
      fetchSet();
    }
  }, [status, setId]);

  const fetchSet = async () => {
    try {
      const res = await fetch(`/api/test-sets/${setId}`);
      const data = await res.json();
      if (data.success) {
        setSetData(data.data);
        setAnswers(Array(data.data.questions.length).fill(null));
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
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
  };

  const handleQuestionSelect = (index: number) => {
    setCurrentQuestion(index);
    setSelectedAnswer(answers[index]);
    if (answers[index] !== null && !audioPlayedMap[index]) {
      setAudioPlayedMap(prev => ({ ...prev, [index]: true }));
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      const prev = currentQuestion - 1;
      setCurrentQuestion(prev);
      setSelectedAnswer(answers[prev]);
      if (answers[prev] !== null && !audioPlayedMap[prev]) {
        setAudioPlayedMap(map => ({ ...map, [prev]: true }));
      }
    }
  };

  const handleNext = () => {
    if (!setData) return;
    if (currentQuestion < setData.questions.length - 1) {
      const next = currentQuestion + 1;
      setCurrentQuestion(next);
      setSelectedAnswer(answers[next]);
      if (answers[next] !== null && !audioPlayedMap[next]) {
        setAudioPlayedMap(prev => ({ ...prev, [next]: true }));
      }
    }
  };

  const handleFlag = () => {
    setFlaggedQuestions((prev) =>
      prev.includes(currentQuestion)
        ? prev.filter((q) => q !== currentQuestion)
        : [...prev, currentQuestion]
    );
  };

  const handleSubmit = async () => {
    if (!setData) return;
    const unanswered = answers.filter((a) => a === null).length;
    if (unanswered > 0) {
      if (!window.confirm(`You have ${unanswered} unanswered questions. Submit anyway?`)) return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/tests/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testTypeId: sectionId,
          testSetId: setId,
          answers: setData.questions.map((q, i) => ({
            questionId: q.id,
            selectedAnswer: answers[i] || '',
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setScore(data.data.correctAnswers);
        setResults(data.data.results ?? []);
        setIsFinished(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render guards ────────────────────────────────────────────────

  if (loading || status === 'loading') return <Spinner />;

  if (notFound || !setData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-500 text-lg font-medium">Test set not found.</p>
        <Link href={`/tests/${sectionId}`} className="mt-4 inline-block text-primary-600 hover:underline">
          ← Back to sets
        </Link>
      </div>
    );
  }

  // form-meaning uses its own special renderer
  if (sectionId === 'form-meaning') {
    if (isFinished) {
      return (
        <TestResults
          score={score}
          totalQuestions={setData.questions.length}
          onRestart={() => router.push(`/tests/${sectionId}`)}
        />
      );
    }
    return (
      <FormMeaningQuiz
        questions={setData.questions}
        sectionId={sectionId}
        setId={setId}
        setName={setData.name}
        onFinish={(s) => { setScore(s); setIsFinished(true); }}
      />
    );
  }

  if (isFinished) {
    return (
      <TestResults
        score={score}
        totalQuestions={setData.questions.length}
        onRestart={() => router.push(`/tests/${sectionId}`)}
      />
    );
  }

  const question = setData.questions[currentQuestion];
  if (!question) return <Spinner />;

  // ─── Listening ───────────────────────────────────────────────────
  if (sectionId === 'listening') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href={`/tests/${sectionId}`} className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4">
            <ArrowLeft className="w-5 h-5" /> Back to Sets
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{setData.name}</h1>
        </div>
        <div className="mb-8">
          <div className="flex justify-between text-sm text-slate-600 mb-2">
            <span>Question {currentQuestion + 1} of {setData.questions.length}</span>
            <span>{Math.round(((currentQuestion + 1) / setData.questions.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / setData.questions.length) * 100}%` }}
            />
          </div>
        </div>

        <ListeningAudioPlayer
          audioUrl={question.audioUrl ?? undefined}
          transcript={question.transcript ?? question.questionText}
          questionText={question.questionText}
          options={[
            { key: 'A', value: question.optionA ?? '' },
            { key: 'B', value: question.optionB ?? '' },
            { key: 'C', value: question.optionC ?? '' },
            { key: 'D', value: question.optionD ?? '' },
          ]}
          selectedAnswer={selectedAnswer}
          correctAnswer={results[currentQuestion]?.correctAnswer ?? null}
          explanation={results[currentQuestion]?.explanation ?? null}
          onAudioPlayed={() => setAudioPlayedMap(prev => ({ ...prev, [currentQuestion]: true }))}
          onAnswerSelect={handleAnswer}
          disabled={submitting}
        />

        <div className="flex justify-between mt-6">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0 || submitting}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={currentQuestion < setData.questions.length - 1 ? handleNext : handleSubmit}
            disabled={selectedAnswer === null || !audioPlayedMap[currentQuestion] || submitting}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentQuestion < setData.questions.length - 1 ? 'Next Question' : 'Finish Test'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Focus Meaning ────────────────────────────────────────────────
  if (sectionId === 'focus-meaning') {
    const optionKeys = ['A', 'B', 'C', 'D'];
    const selectedIndex = selectedAnswer ? optionKeys.indexOf(selectedAnswer) : null;
    const correctIndex = question.correctAnswer ? optionKeys.indexOf(question.correctAnswer) : -1;
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href={`/tests/${sectionId}`} className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4">
            <ArrowLeft className="w-5 h-5" /> Back to Sets
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{setData.name}</h1>
        </div>
        <div className="mb-8">
          <div className="flex justify-between text-sm text-slate-600 mb-2">
            <span>Question {currentQuestion + 1} of {setData.questions.length}</span>
            <span>{Math.round(((currentQuestion + 1) / setData.questions.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / setData.questions.length) * 100}%` }}
            />
          </div>
        </div>

        <FocusMeaningConversationCard
          conversation={question.conversation ?? []}
          question={question.questionText}
          options={[
            question.optionA ?? '',
            question.optionB ?? '',
            question.optionC ?? '',
            question.optionD ?? '',
          ]}
          selectedAnswer={selectedIndex}
          correctAnswer={correctIndex}
          explanation={question.explanation ?? ''}
          onAnswerSelect={(idx) => handleAnswer(optionKeys[idx])}
          disabled={submitting}
        />

        <div className="flex justify-between mt-6">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0 || submitting}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={currentQuestion < setData.questions.length - 1 ? handleNext : handleSubmit}
            disabled={selectedAnswer === null || submitting}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentQuestion < setData.questions.length - 1 ? 'Next Question' : 'Finish Test'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Focus Form (default MCQ) ─────────────────────────────────────
  const options: Option[] = [
    { key: 'A', value: question.optionA ?? '' },
    { key: 'B', value: question.optionB ?? '' },
    { key: 'C', value: question.optionC ?? '' },
    { key: 'D', value: question.optionD ?? '' },
  ];
  const correctAnswer = results[currentQuestion]?.correctAnswer ?? null;
  const explanation = results[currentQuestion]?.explanation ?? null;

  return (
    <TestLayout
      title={setData.name}
      duration="15 min"
      totalQuestions={setData.questions.length}
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
        disabled={submitting}
      />
    </TestLayout>
  );
}
