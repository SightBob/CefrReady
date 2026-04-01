'use client';

import { useState } from 'react';
import { ArrowLeft, Clock, ChevronRight, CheckCircle, XCircle, FileText } from 'lucide-react';
import Link from 'next/link';

interface Blank {
  id: number;
  correctAnswer: string;
  hint?: string;
}

interface Article {
  id: number;
  title: string;
  text: string; // Use {{1}}, {{2}}, etc. as blank placeholders
  blanks: Blank[];
}

const sampleArticles: Article[] = [
  {
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
  },
  {
    id: 2,
    title: 'Climate Change and Our Planet',
    text: 'Climate change is one of the most {{1}} issues facing our planet today. Scientists have {{2}} that global temperatures are rising. The {{3}} of this warming can be seen in melting ice caps and rising sea levels. We must take {{4}} action to reduce our carbon footprint. Every {{5}} effort counts towards a greener future.',
    blanks: [
      { id: 1, correctAnswer: 'serious', hint: 'adjective - important, not joking' },
      { id: 2, correctAnswer: 'observed', hint: 'verb - noticed, watched' },
      { id: 3, correctAnswer: 'effects', hint: 'noun - results, consequences' },
      { id: 4, correctAnswer: 'immediate', hint: 'adjective - happening now, urgent' },
      { id: 5, correctAnswer: 'individual', hint: 'adjective - personal, single person' },
    ],
  },
  {
    id: 3,
    title: 'The Digital Revolution',
    text: 'The digital revolution has {{1}} transformed how we live and work. Many traditional jobs have been {{2}} by automation. However, new opportunities have {{3}} in the technology sector. Companies are looking for {{4}} individuals who can adapt quickly. The {{5}} to learn new skills is essential in today\'s world.',
    blanks: [
      { id: 1, correctAnswer: 'fundamentally', hint: 'adverb - in a basic, essential way' },
      { id: 2, correctAnswer: 'replaced', hint: 'verb - substituted, taken the place of' },
      { id: 3, correctAnswer: 'emerged', hint: 'verb - appeared, come out' },
      { id: 4, correctAnswer: 'skilled', hint: 'adjective - having abilities, trained' },
      { id: 5, correctAnswer: 'ability', hint: 'noun - capability, skill' },
    ],
  },
];

export default function FormMeaningPage() {
  const [currentArticle, setCurrentArticle] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const article = sampleArticles[currentArticle];

  const handleInputChange = (blankId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [blankId]: value.toLowerCase().trim() }));
  };

  const handleSubmit = () => {
    let correctCount = 0;
    article.blanks.forEach(blank => {
      if (answers[blank.id] === blank.correctAnswer.toLowerCase()) {
        correctCount++;
      }
    });
    setScore(correctCount);
    setIsSubmitted(true);
  };

  const handleNext = () => {
    if (currentArticle < sampleArticles.length - 1) {
      setCurrentArticle(currentArticle + 1);
      setAnswers({});
      setIsSubmitted(false);
      setScore(0);
    } else {
      setIsFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentArticle(0);
    setAnswers({});
    setIsSubmitted(false);
    setScore(0);
    setIsFinished(false);
  };

  const renderArticle = () => {
    let text = article.text;
    const parts: React.ReactNode[] = [];
    let keyIndex = 0;
    
    article.blanks.forEach((blank, index) => {
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

  if (isFinished) {
    const totalBlanks = sampleArticles.reduce((sum, a) => sum + a.blanks.length, 0);
    const totalCorrect = score; // This would need proper tracking across articles

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/tests" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-6">
          <ArrowLeft className="w-5 h-5" />
          Back to Tests
        </Link>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center">
          <div className="inline-flex p-4 rounded-full bg-purple-50 mb-6">
            <CheckCircle className="w-12 h-12 text-purple-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Test Complete!</h1>
          <p className="text-slate-600 mb-6">Great effort on completing all articles!</p>

          <div className="flex gap-4 justify-center">
            <button onClick={handleRestart} className="btn-primary">
              Try Again
            </button>
            <Link href="/tests" className="btn-secondary">
              Other Tests
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/tests" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors mb-4">
          <ArrowLeft className="w-5 h-5" />
          Back to Tests
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
          <span>Article {currentArticle + 1} of {sampleArticles.length}</span>
          <span>{Math.round(((currentArticle + 1) / sampleArticles.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
            style={{ width: `${((currentArticle + 1) / sampleArticles.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Article Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-purple-600">Fill in the blanks</span>
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-6">{article.title}</h2>

        <div className="text-lg text-slate-700 leading-relaxed space-y-2">
          {renderArticle()}
        </div>

        {isSubmitted && (
          <div className={`mt-6 p-4 rounded-xl ${score === article.blanks.length ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            <p className="font-medium text-slate-800 mb-1">
              {score === article.blanks.length ? '✓ Perfect!' : `Score: ${score}/${article.blanks.length}`}
            </p>
            <p className="text-slate-600">
              {score === article.blanks.length 
                ? 'Excellent work! All blanks filled correctly.' 
                : 'Check the correct answers shown above in green.'}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-4">
        {!isSubmitted ? (
          <button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length < article.blanks.length}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Answers
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="btn-primary inline-flex items-center gap-2"
          >
            {currentArticle < sampleArticles.length - 1 ? 'Next Article' : 'Finish Test'}
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
