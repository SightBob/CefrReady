'use client';

import { useState } from 'react';

interface FormMeaningQuizProps {
  article: {
    title: string;
    text: string;
    blanks: Array<{ id: number; correctAnswer: string; hint?: string }>;
  };
  onChange: (answers: Record<number, string>) => void;
}

export default function FormMeaningQuiz({ article, onChange }: FormMeaningQuizProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const handleChange = (blankId: number, value: string) => {
    const next = { ...answers, [blankId]: value.toLowerCase().trim() };
    setAnswers(next);
    onChange(next);
  };

  const renderArticle = () => {
    let remaining = article.text;
    const parts: React.ReactNode[] = [];

    article.blanks.forEach((blank) => {
      const placeholder = `{{${blank.id}}}`;
      const idx = remaining.indexOf(placeholder);
      if (idx === -1) return;

      if (idx > 0) {
        parts.push(<span key={`text-${blank.id}`}>{remaining.slice(0, idx)}</span>);
      }

      parts.push(
        <input
          key={`blank-${blank.id}`}
          type="text"
          className="w-28 px-2 py-1 mx-1 rounded border-2 border-purple-300 focus:border-purple-500 focus:outline-none text-center"
          placeholder={blank.hint?.split(' - ')[0] || 'Answer'}
          value={answers[blank.id] || ''}
          onChange={(e) => handleChange(blank.id, e.target.value)}
        />
      );

      remaining = remaining.slice(idx + placeholder.length);
    });

    parts.push(<span key="text-end">{remaining}</span>);
    return parts;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8 mb-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4">{article.title}</h2>
      <div className="text-lg text-slate-700 leading-relaxed">{renderArticle()}</div>
    </div>
  );
}
