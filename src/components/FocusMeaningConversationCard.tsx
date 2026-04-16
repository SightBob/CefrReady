'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, MessageCircle } from 'lucide-react';

interface ConversationLine {
  speaker: string;
  name?: string;
  text: string;
}

interface FocusMeaningConversationCardProps {
  conversation: ConversationLine[];
  question: string;
  options: string[];
  selectedAnswer: number | null;
  correctAnswer: number | null;
  explanation: string;
  onAnswerSelect: (answerIndex: number) => void;
  disabled?: boolean;
}

export default function FocusMeaningConversationCard({
  conversation,
  question,
  options,
  selectedAnswer,
  correctAnswer,
  explanation,
  onAnswerSelect,
  disabled = false,
}: FocusMeaningConversationCardProps) {
  const isCorrect = correctAnswer !== null && selectedAnswer === correctAnswer;
  const showExplanation = selectedAnswer !== null;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-emerald-600" />
        <span className="text-sm font-medium text-emerald-600">Conversation</span>
      </div>

      {/* Conversation Display */}
      <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-4">
        {conversation.map((line, index) => {
          const displayInitial = line.name ? line.name.charAt(0).toUpperCase() : line.speaker;
          
          return (
            <div key={index} className="flex gap-3">
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mt-1 ${line.speaker === 'A'
                  ? 'bg-primary-100 text-primary-700'
                  : line.speaker === 'B'
                    ? 'bg-accent-100 text-accent-700'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                {displayInitial}
              </div>
              <div className="flex-1">
                {line.name && line.name !== line.speaker && (
                  <div className="text-xs font-semibold text-slate-500 mb-0.5">{line.name}</div>
                )}
              <p className="text-slate-700 leading-relaxed">{line.text}</p>
            </div>
          </div>
          );
        })}
      </div>

      <p className="text-lg font-medium text-slate-800 mb-6">{question}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
        {options.map((option, index) => {
          let buttonClass = 'p-4 rounded-xl border-2 text-left transition-all duration-200 ';

          if (selectedAnswer === null) {
            buttonClass += 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50';
          } else if (correctAnswer !== null && index === correctAnswer) {
            buttonClass += 'border-emerald-500 bg-emerald-50';
          } else if (selectedAnswer === index) {
            buttonClass += 'border-red-500 bg-red-50';
          } else {
            buttonClass += 'border-slate-200 opacity-50';
          }

          return (
            <button
              key={index}
              onClick={() => onAnswerSelect(index)}
              disabled={selectedAnswer !== null || disabled}
              className={buttonClass}
            >
              <span className="font-medium text-slate-800">{option}</span>
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className={`mt-6 p-4 rounded-xl ${isCorrect
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