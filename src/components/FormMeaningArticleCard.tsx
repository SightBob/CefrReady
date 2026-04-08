'use client';

import { useState } from 'react';
import { FileText, CheckCircle } from 'lucide-react';

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
  const renderArticle = () => {
    let text = article.text;
    const parts: React.ReactNode[] = [];
    let keyIndex = 0;

    article.blanks.forEach((blank) => {
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
              onChange={(e) => onInputChange(blank.id, e.target.value)}
              disabled={isSubmitted || disabled}
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
    </div>
  );
}