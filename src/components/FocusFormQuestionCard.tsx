'use client';

import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface Option {
  key: string;
  value: string;
}

interface FocusFormQuestionCardProps {
  questionText: string;
  options: Option[];
  selectedAnswer: string | null;
  correctAnswer: string | null;
  explanation: string | null;
  onAnswerSelect: (answer: string) => void;
  disabled?: boolean;
}

export default function FocusFormQuestionCard({
  questionText,
  options,
  selectedAnswer,
  correctAnswer,
  explanation,
  onAnswerSelect,
  disabled = false,
}: FocusFormQuestionCardProps) {
  const isCorrect = selectedAnswer === correctAnswer;
  const showExplanation = selectedAnswer !== null && explanation !== null;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8">
      <p className="text-lg md:text-xl text-slate-800 mb-6 leading-relaxed">
        {questionText}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          let buttonClass = 'p-4 rounded-xl border-2 text-left transition-all duration-200 ';

          if (selectedAnswer === null) {
            buttonClass += 'border-slate-200 hover:border-primary-300 hover:bg-primary-50';
          } else if (opt.key === correctAnswer) {
            buttonClass += 'border-emerald-500 bg-emerald-50';
          } else if (selectedAnswer === opt.key) {
            buttonClass += 'border-red-500 bg-red-50';
          } else {
            buttonClass += 'border-slate-200 opacity-50';
          }

          return (
            <button
              key={opt.key}
              onClick={() => onAnswerSelect(opt.key)}
              disabled={selectedAnswer !== null || disabled}
              className={buttonClass}
            >
              <span className="font-medium text-slate-800">{opt.value}</span>
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className={`mt-6 p-4 rounded-xl ${
          isCorrect
            ? 'bg-emerald-50 border border-emerald-200'
            : 'bg-amber-50 border border-amber-200'
        }`}>
          <p className="font-medium text-slate-800 mb-1">
            {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
          </p>
          <p className="text-slate-600">{explanation}</p>
        </div>
      )}
    </div>
  );
}