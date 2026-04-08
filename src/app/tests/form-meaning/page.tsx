'use client';

import { useState, useEffect, useMemo } from 'react';
import { FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import TestResults from '@/components/TestResults';
import type { FormMeaningQuestion, Blank } from '@/types/test';

export default function FormMeaningPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [questions, setQuestions] = useState<FormMeaningQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Combine all articles into one long article
  const combinedArticle = useMemo(() => {
    if (questions.length === 0) return null;

    const allBlanks: Blank[] = [];
    let combinedText = '';
    let globalBlankId = 1;

    questions.forEach((q, index) => {
      if (q.article) {
        // Renumber blanks to be globally unique
        let text = q.article.text;
        q.article.blanks.forEach((blank) => {
          const oldPlaceholder = `{{${blank.id}}}`;
          const newPlaceholder = `{{${globalBlankId}}}`;
          text = text.replace(oldPlaceholder, newPlaceholder);
          allBlanks.push({
            id: globalBlankId,
            correctAnswer: blank.correctAnswer,
            hint: blank.hint,
          });
          globalBlankId++;
        });

        // Add paragraph break between articles (except first)
        if (index > 0) {
          combinedText += ' ';
        }
        combinedText += text;
      }
    });

    return {
      title: 'Reading Comprehension',
      text: combinedText,
      blanks: allBlanks,
    };
  }, [questions]);

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

  // Map blank ID back to question ID for submission
  const blankToQuestionMap = useMemo(() => {
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

  const handleInputChange = (blankId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [blankId]: value.toLowerCase().trim() }));
  };

  const handleSubmit = async () => {
    const totalBlanks = combinedArticle?.blanks.length || 0;
    const answeredBlanks = Object.keys(answers).filter(k => answers[parseInt(k)]).length;

    if (answeredBlanks < totalBlanks) {
      const confirm = window.confirm(`You have ${totalBlanks - answeredBlanks} unanswered blanks. Are you sure you want to submit?`);
      if (!confirm) return;
    }

    setSubmitting(true);
    try {
      // Map blank answers back to question answers
      const questionAnswers = new Map<number, string>();
      Object.entries(answers).forEach(([blankIdStr, answer]) => {
        const blankId = parseInt(blankIdStr);
        const questionId = blankToQuestionMap.get(blankId);
        if (questionId !== undefined && answer) {
          questionAnswers.set(questionId, answer);
        }
      });

      const payload = {
        testTypeId: 'form-meaning',
        answers: questions.map((q) => ({
          questionId: q.id,
          selectedAnswer: questionAnswers.get(q.id) || '',
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
    return (
      <TestResults
        score={score}
        totalQuestions={questions.length}
        onRestart={handleRestart}
      />
    );
  }

  // Render article with inline blanks
  const renderArticleWithBlanks = () => {
    if (!combinedArticle) return null;

    let text = combinedArticle.text;
    const parts: React.ReactNode[] = [];
    let keyIndex = 0;

    combinedArticle.blanks.forEach((blank) => {
      const placeholder = `{{${blank.id}}}`;
      const splitIndex = text.indexOf(placeholder);

      if (splitIndex !== -1) {
        parts.push(<span key={keyIndex++}>{text.substring(0, splitIndex)}</span>);

        const isCorrect = isSubmitted && answers[blank.id] === blank.correctAnswer.toLowerCase();
        const isWrong = isSubmitted && answers[blank.id] !== blank.correctAnswer.toLowerCase() && answers[blank.id];

        parts.push(
          <span key={keyIndex++} className="inline-flex flex-col items-start mx-1">
            <input
              type="text"
              className={`w-32 px-2 py-1 rounded border-2 text-center ${
                isSubmitted
                  ? isCorrect
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : isWrong
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-slate-300 bg-slate-50'
                  : 'border-purple-300 focus:border-purple-500 focus:outline-none'
              }`}
              placeholder={blank.hint?.split(' - ')[0] || 'Answer'}
              value={answers[blank.id] || ''}
              onChange={(e) => handleInputChange(blank.id, e.target.value)}
              disabled={isSubmitted || submitting}
            />
            {isSubmitted && isWrong && (
              <span className="text-xs text-emerald-600 mt-1">Correct: {blank.correctAnswer}</span>
            )}
          </span>
        );

        text = text.substring(splitIndex + placeholder.length);
      }
    });

    parts.push(<span key={keyIndex}>{text}</span>);
    return parts;
  };

  const totalBlanks = combinedArticle?.blanks.length || 0;
  const answeredCount = Object.keys(answers).filter(k => answers[parseInt(k)]).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/tests" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4">
          ← Back to Tests
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Form & Meaning</h1>
          <div className="flex items-center gap-2 text-slate-500">
            <span>25 min</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
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

      {/* Combined Article */}
      {combinedArticle && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-600">Fill in the blanks</span>
          </div>

          <h2 className="text-xl font-bold text-slate-800 mb-6">{combinedArticle.title}</h2>

          <div className="text-lg text-slate-700 leading-relaxed">
            {renderArticleWithBlanks()}
          </div>
        </div>
      )}

      {!isSubmitted && (
        <div className="flex justify-end mt-8">
          <button
            onClick={handleSubmit}
            disabled={answeredCount < totalBlanks || submitting}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Answers
          </button>
        </div>
      )}
    </div>
  );
}
