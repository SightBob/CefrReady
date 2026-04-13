'use client';

import { FileText, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

interface Blank {
  id: number;
  correctAnswer: string;
  hint?: string;
}

interface Article {
  title: string;
  text: string;
  blanks: Blank[];
}

interface FormMeaningArticleCardProps {
  article: Article;
  answers: Record<number, string>;
  isSubmitted: boolean;
  onInputChange: (blankId: number, value: string) => void;
  disabled?: boolean;
}

export default function FormMeaningArticleCard({
  article,
  answers,
  isSubmitted,
  onInputChange,
  disabled = false,
}: FormMeaningArticleCardProps) {
  const totalBlanks = article.blanks.length;
  const correctCount = isSubmitted
    ? article.blanks.filter((b) => answers[b.id]?.toLowerCase() === b.correctAnswer.toLowerCase()).length
    : 0;

  const renderArticle = () => {
    let text = article.text;
    const parts: React.ReactNode[] = [];
    let keyIndex = 0;

    article.blanks.forEach((blank) => {
      const placeholder = `{{${blank.id}}}`;
      const splitIndex = text.indexOf(placeholder);

      if (splitIndex !== -1) {
        parts.push(<span key={keyIndex++}>{text.substring(0, splitIndex)}</span>);

        const isCorrect = isSubmitted && answers[blank.id]?.toLowerCase() === blank.correctAnswer.toLowerCase();
        const isWrong = isSubmitted && !isCorrect && answers[blank.id];
        const isEmpty = isSubmitted && !answers[blank.id];

        parts.push(
          <span key={keyIndex++} className="inline-flex flex-col items-start mx-1">
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
              placeholder=""
              value={answers[blank.id] || ''}
              onChange={(e) => onInputChange(blank.id, e.target.value)}
              disabled={isSubmitted || disabled}
            />
            {isSubmitted && isWrong && (
              <span className="flex items-center gap-1 mt-1">
                <ArrowRight className="w-3 h-3 text-emerald-500" />
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

        text = text.substring(splitIndex + placeholder.length);
      }
    });

    parts.push(<span key={keyIndex}>{text}</span>);
    return parts;
  };

  return (
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
        <div className={`mt-6 p-4 rounded-xl ${
          correctCount === totalBlanks
            ? 'bg-emerald-50 border border-emerald-200'
            : correctCount >= totalBlanks * 0.7
            ? 'bg-amber-50 border border-amber-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {correctCount === totalBlanks ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <XCircle className="w-5 h-5 text-amber-600" />
            )}
            <p className="font-medium text-slate-800">
              {correctCount === totalBlanks
                ? 'Perfect! All correct!'
                : `Score: ${correctCount} out of ${totalBlanks}`}
            </p>
          </div>
          {correctCount < totalBlanks && (
            <p className="text-sm text-slate-600 ml-7">
              {correctCount === 0
                ? 'Check the correct answers shown in green below each blank.'
                : correctCount >= totalBlanks * 0.7
                ? 'Almost there! Review the blanks marked in red.'
                : 'Keep practicing! The correct answers are shown in green below each blank.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
