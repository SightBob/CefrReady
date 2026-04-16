'use client';

import { useState, useMemo, useRef } from 'react';
import { CheckCircle, XCircle, MessageCircle } from 'lucide-react';

interface ConversationLine {
  speaker: string;
  text: string;
}

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
  conversation?: ConversationLine[] | null;
  onAnswerSelect: (answer: string) => void;
  disabled?: boolean;
}

export default function FocusFormQuestionCard({
  questionText,
  options,
  selectedAnswer,
  correctAnswer,
  explanation,
  conversation,
  onAnswerSelect,
  disabled = false,
}: FocusFormQuestionCardProps) {
  const isCorrect = selectedAnswer === correctAnswer;
  const showExplanation = selectedAnswer !== null && explanation !== null;

  // Shuffle options once on mount
  const shuffledRef = useRef<Option[] | null>(null);
  const shuffledOptions = useMemo(() => {
    if (shuffledRef.current) return shuffledRef.current;
    const shuffled = [...options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    shuffledRef.current = shuffled;
    return shuffled;
  }, [options]);

  // Parse "Speaker: textSpeaker: text" into [{speaker, text}] lines (fallback when no structured conversation)
  const dialogueLines = questionText.split(/(?<=[.?!])\s*(?=[A-Z][a-zA-Z]*:)/);
  const hasDialogue = dialogueLines.length > 1 || dialogueLines[0]?.includes(':');

  const renderConversation = (lines: ConversationLine[]) => (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-primary-600" />
        <span className="text-sm font-medium text-primary-600">Conversation</span>
      </div>
      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-3 items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${i % 2 === 0
              ? 'bg-primary-100 text-primary-700'
              : 'bg-accent-100 text-accent-700'
              }`}>
              {line.speaker.charAt(0)}
            </div>
            <div className="flex-1 pt-1">
              <span className="text-sm font-semibold text-slate-500">{line.speaker}</span>
              <p className="text-slate-700 leading-relaxed">{line.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderQuestion = () => {
    if (conversation && conversation.length > 0) {
      return renderConversation(conversation);
    }
    if (!hasDialogue) {
      return <p className="text-lg md:text-xl text-slate-800 leading-relaxed">{questionText}</p>;
    }
    const parsed: ConversationLine[] = dialogueLines.map((line) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) return { speaker: '', text: line };
      return {
        speaker: line.slice(0, colonIdx).trim(),
        text: line.slice(colonIdx + 1).trim(),
      };
    });
    return renderConversation(parsed);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8">
      {renderQuestion()}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
        {shuffledOptions.map((opt) => {
          const isSelected = selectedAnswer === opt.key;
          const isCorrectOption = opt.key === correctAnswer;
          const showFeedback = selectedAnswer !== null;

          let buttonClass = 'p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-start gap-3 ';

          if (!showFeedback) {
            buttonClass += 'border-slate-200 hover:border-primary-400 hover:bg-primary-50/50 hover:shadow-sm';
          } else if (isCorrectOption) {
            buttonClass += 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/20';
          } else if (isSelected) {
            buttonClass += 'border-red-400 bg-red-50 ring-1 ring-red-400/20';
          } else {
            buttonClass += 'border-slate-200 opacity-40';
          }

          return (
            <button
              key={opt.key}
              onClick={() => onAnswerSelect(opt.key)}
              disabled={selectedAnswer !== null || disabled}
              className={buttonClass}
            >
              <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${!showFeedback
                ? 'bg-slate-100 text-slate-500'
                : isCorrectOption
                  ? 'bg-emerald-500 text-white'
                  : isSelected
                    ? 'bg-red-400 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                {opt.key}
              </span>
              <span className="font-medium text-slate-800 pt-0.5">{opt.value}</span>
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 ${isCorrect
          ? 'bg-emerald-50 border border-emerald-200'
          : 'bg-amber-50 border border-amber-200'
          }`}>
          {isCorrect
            ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            : <XCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          }
          <div>
            <p className="font-medium text-slate-800 mb-1">
              {isCorrect ? 'ถูกต้อง!' : 'ผิดแล้ว — เฉลย:'}
            </p>
            {explanation && <p className="text-slate-600 text-sm">{explanation}</p>}
          </div>
        </div>
      )}
    </div>
  );
}