'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, MessageCircle } from 'lucide-react';
import SelectableText from './SelectableText';

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
  hideFeedback?: boolean;
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
  hideFeedback = false,
}: FocusMeaningConversationCardProps) {
  const isCorrect = correctAnswer !== null && selectedAnswer === correctAnswer;
  const showExplanation = selectedAnswer !== null && !hideFeedback;

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
              <div className="text-slate-700 leading-relaxed">
                <SelectableText text={line.text} contextSentence={line.text} />
              </div>
            </div>
          </div>
          );
        })}
      </div>

      <div className="text-lg font-medium text-slate-800 mb-6">
        <SelectableText text={question} contextSentence={question} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
        {options.map((option, index) => {
          let buttonClass = 'p-4 rounded-xl border-2 text-left transition-all duration-200 ';

          if (hideFeedback) {
            if (selectedAnswer === index) {
              buttonClass += 'border-primary-500 bg-primary-50';
            } else {
              buttonClass += 'border-slate-200 hover:border-primary-300 hover:bg-primary-50';
            }
          } else if (selectedAnswer === null) {
            buttonClass += 'border-slate-200 hover:border-primary-300 hover:bg-primary-50';
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
              type="button"
              onClick={(e) => {
                if (!showExplanation && !disabled) {
                  onAnswerSelect(index);
                }
              }}
              className={buttonClass}
            >
              <span className="font-medium text-slate-800">
                <SelectableText text={option} contextSentence={option} inline={true} />
              </span>
            </button>
          );
        })}
      </div>

      {showExplanation && explanation && (
        <div className={`mt-6 p-5 rounded-xl border-2 border-l-4 shadow-md ${isCorrect
            ? 'bg-emerald-50 border-emerald-200 border-l-emerald-500'
            : 'bg-amber-50 border-amber-200 border-l-amber-500'
          }`}>
          <p className={`font-bold mb-1 ${isCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
            {isCorrect ? '✓ ถูกต้อง!' : '✗ ยังไม่ถูกต้อง — เฉลย:'} คำอธิบาย
          </p>
          <p className="text-slate-700 font-medium">{explanation}</p>
        </div>
      )}
    </div>
  );
}