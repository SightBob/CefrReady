'use client';

import { FileText } from 'lucide-react';

interface Blank {
  id: number;
  correctAnswer: string;
  hint?: string;
}

interface FormMeaningFillBlankProps {
  questionId: number;
  questionNumber: number;
  questionText: string;
  difficulty?: string;
  value: string;
  isSubmitted: boolean;
  correctAnswer?: string;
  explanation?: string | null;
  onInputChange: (questionId: number, value: string) => void;
  disabled?: boolean;
}

export default function FormMeaningFillBlank({
  questionId,
  questionNumber,
  questionText,
  difficulty,
  value,
  isSubmitted,
  correctAnswer,
  explanation,
  onInputChange,
  disabled = false,
}: FormMeaningFillBlankProps) {
  const isCorrect = isSubmitted && value === correctAnswer?.toLowerCase();
  const isWrong = isSubmitted && value !== correctAnswer?.toLowerCase() && value;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-purple-600" />
        <span className="text-sm font-medium text-purple-600">Question {questionNumber}</span>
      </div>

      <h2 className="text-lg font-medium text-slate-800 mb-4">{questionText}</h2>

      <div className="flex gap-2 items-center">
        <input
          type="text"
          className={`w-48 px-3 py-2 rounded border-2 text-center ${
            isSubmitted
              ? isCorrect
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : isWrong
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-slate-300 bg-slate-50'
              : 'border-purple-300 focus:border-purple-500 focus:outline-none'
          }`}
          placeholder={difficulty ? `(${difficulty})` : 'Answer'}
          value={value}
          onChange={(e) => onInputChange(questionId, e.target.value)}
          disabled={isSubmitted || disabled}
        />
        {isSubmitted && isWrong && correctAnswer && (
          <span className="text-sm text-emerald-600 font-medium">
            Correct: {correctAnswer}
          </span>
        )}
      </div>

      {isSubmitted && explanation && (
        <div className={`mt-4 p-4 rounded-xl ${
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