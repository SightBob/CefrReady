'use client';

import { useState } from 'react';
import { ArrowLeft, Clock, ChevronRight, CheckCircle, FileText } from 'lucide-react';
import Link from 'next/link';

interface Blank {
  id: number;
  correctAnswer: string;
  hint?: string;
}

interface Article {
  id: number;
  title: string;
  text: string;
  blanks: Blank[];
}

const demoArticle: Article = {
  id: 1,
  title: 'The Importance of Learning Languages',
  text: 'Learning a new language is a {{1}} journey that opens many doors. It requires {{2}} and dedication. When you {{3}} a new language, you also learn about different cultures. Many people find that being {{4}} in multiple languages helps them in their careers. The {{5}} of being bilingual cannot be overstated.',
  blanks: [
    { id: 1, correctAnswer: 'rewarding', hint: 'adjective - giving satisfaction' },
    { id: 2, correctAnswer: 'patience', hint: 'noun - ability to wait calmly' },
    { id: 3, correctAnswer: 'master', hint: 'verb - learn thoroughly' },
    { id: 4, correctAnswer: 'fluent', hint: 'adjective - speaking easily and naturally' },
    { id: 5, correctAnswer: 'benefits', hint: 'noun - advantages' },
  ],
};

export default function DemoFormMeaningPage() {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const handleInputChange = (blankId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [blankId]: value.toLowerCase().trim() }));
  };

  const handleSubmit = () => {
    let correctCount = 0;
    demoArticle.blanks.forEach(blank => {
      if (answers[blank.id] === blank.correctAnswer.toLowerCase()) {
        correctCount++;
      }
    });
    setScore(correctCount);
    setIsSubmitted(true);
  };

  const handleRestart = () => {
    setAnswers({});
    setIsSubmitted(false);
    setScore(0);
  };

  const renderArticle = () => {
    let text = demoArticle.text;
    const parts: React.ReactNode[] = [];
    let keyIndex = 0;
    
    demoArticle.blanks.forEach((blank) => {
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
              placeholder={`(${blank.hint?.split(' - ')[0]})`}
              value={answers[blank.id] || ''}
              onChange={(e) => handleInputChange(blank.id, e.target.value)}
              disabled={isSubmitted}
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

  if (isSubmitted) {
    const passed = score >= Math.ceil(demoArticle.blanks.length * 0.7);

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/demo" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-6">
          <ArrowLeft className="w-5 h-5" />
          Back to Demo Tests
        </Link>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center">
          <div className={`inline-flex p-4 rounded-full ${passed ? 'bg-emerald-50' : 'bg-red-50'} mb-6`}>
            <CheckCircle className={`w-12 h-12 ${passed ? 'text-emerald-600' : 'text-red-600'}`} />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {passed ? 'Great Job!' : 'Keep Practicing!'}
          </h1>
          <p className="text-slate-600 mb-6">
            {passed ? 'You passed the demo test!' : 'You need 70% to pass. Try again!'}
          </p>

          <div className="bg-slate-50 rounded-xl p-6 mb-6">
            <p className="text-5xl font-bold text-slate-900 mb-2">{Math.round((score / demoArticle.blanks.length) * 100)}%</p>
            <p className="text-slate-500">{score} out of {demoArticle.blanks.length} correct</p>
          </div>

          <div className="bg-primary-50 rounded-xl p-4 mb-6">
            <p className="text-primary-700 font-medium">Want more articles and progress tracking?</p>
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/demo" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4">
          <ArrowLeft className="w-5 h-5" />
          Back to Demo Tests
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Form & Meaning (Demo)</h1>
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="w-5 h-5" />
            <span>5 min</span>
          </div>
        </div>
      </div>

      {/* Article Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-purple-600">Fill in the blanks</span>
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-6">{demoArticle.title}</h2>

        <div className="text-lg text-slate-700 leading-relaxed space-y-2">
          {renderArticle()}
        </div>

        {isSubmitted && (
          <div className={`mt-6 p-4 rounded-xl ${score === demoArticle.blanks.length ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            <p className="font-medium text-slate-800 mb-1">
              {score === demoArticle.blanks.length ? '✓ Perfect!' : `Score: ${score}/${demoArticle.blanks.length}`}
            </p>
            <p className="text-slate-600">
              {score === demoArticle.blanks.length 
                ? 'Excellent work! All blanks filled correctly.' 
                : 'Check the correct answers shown above in green.'}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < demoArticle.blanks.length}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Answers
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
