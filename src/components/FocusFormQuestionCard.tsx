'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, MessageCircle } from 'lucide-react';
import SelectableText from './SelectableText';

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
  accent?: 'primary' | 'emerald';
  headerIcon?: React.ElementType;
  headerLabel?: string;
}

const ACCENT: Record<string, {
  selected: string;
  badge: string;
  hover: string;
  speakerA: string;
  speakerB: string;
  headerText: string;
}> = {
  primary: {
    selected: 'border-primary-500 bg-primary-50 ring-1 ring-primary-500/20',
    badge: 'bg-primary-500 text-white',
    hover: 'hover:border-primary-400 hover:bg-primary-50/50 hover:shadow-sm',
    speakerA: 'bg-[#FAE8FF] text-[#A21CAF]',
    speakerB: 'bg-[#FAE8FF] text-[#A21CAF]',
    headerText: 'text-primary-600',
  },
  emerald: {
    selected: 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/20',
    badge: 'bg-emerald-500 text-white',
    hover: 'hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm',
    speakerA: 'bg-[#FAE8FF] text-[#A21CAF]',
    speakerB: 'bg-[#FAE8FF] text-[#A21CAF]',
    headerText: 'text-emerald-600',
  },
};

export default function FocusFormQuestionCard({
  questionText,
  options,
  selectedAnswer,
  correctAnswer,
  explanation,
  conversation,
  onAnswerSelect,
  disabled = false,
  accent = 'primary',
  headerIcon: HeaderIcon,
  headerLabel,
}: FocusFormQuestionCardProps) {
  const theme = ACCENT[accent] ?? ACCENT.primary;
  const isCorrect = selectedAnswer === correctAnswer;
  const showExplanation = selectedAnswer !== null && explanation !== null && correctAnswer !== null;


  // Parse "Speaker: textSpeaker: text" into [{speaker, text}] lines (fallback when no structured conversation)
  const dialogueLines = questionText.split(/(?<=[.?!])\s*(?=[A-Z][a-zA-Z]*:)/);
  const hasDialogue = dialogueLines.length > 1 || dialogueLines[0]?.includes(':');

  const renderConversation = (lines: ConversationLine[]) => (
    <div>
      <div className="bg-slate-50 rounded-xl p-[1.6875rem] space-y-6">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-3 items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${i % 2 === 0
              ? theme.speakerA
              : theme.speakerB
              }`}>
              {line.speaker.charAt(0)}
            </div>
            <div className="flex-1 pt-1">
              <div className="text-[1rem] text-[#334155] leading-relaxed">
                <SelectableText text={line.text} contextSentence={line.text} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderQuestion = () => {
    if (conversation && conversation.length > 0) {
      return (
        <>
          {renderConversation(conversation)}
          <div className="text-[1.25rem] md:text-xl font-medium text-slate-800 leading-relaxed mt-6">
            <SelectableText text={questionText} contextSentence={questionText} />
          </div>
        </>
      );
    }
    if (!hasDialogue) {
      return (
        <div className="bg-slate-50 rounded-xl p-[1.6875rem] py-[2.8125rem]">
          <div className="text-[1.25rem] md:text-xl text-slate-800 leading-relaxed">
            <SelectableText text={questionText} contextSentence={questionText} />
          </div>
        </div>
      );
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
    <div className="">
      {HeaderIcon && headerLabel && (
        <div className="flex items-center gap-2 mb-4">
          <HeaderIcon className={`w-5 h-5 ${theme.headerText}`} />
          <span className={`text-sm font-medium ${theme.headerText}`}>{headerLabel}</span>
        </div>
      )}
      {renderQuestion()}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
        {options.map((opt) => {
          const isSelected = selectedAnswer === opt.key;
          const isCorrectOption = opt.key === correctAnswer;
          const showFeedback = selectedAnswer !== null && correctAnswer !== null;

          let buttonClass = 'p-4 py-6 rounded-xl border-2 text-left transition-all duration-200 flex items-start gap-3 ';

          if (!showFeedback) {
            if (isSelected) {
              buttonClass += theme.selected;
            } else {
              buttonClass += `border-slate-200 ${theme.hover}`;
            }
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
              type="button"
              onClick={() => onAnswerSelect(opt.key)}
              disabled={showFeedback || disabled}
              className={buttonClass}
            >
              <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${
                    !showFeedback
                      ? isSelected
                        ? theme.badge
                        : 'bg-slate-100 text-slate-500'
                      : isCorrectOption
                        ? 'bg-emerald-500 text-white'
                        : isSelected
                          ? 'bg-red-400 text-white'
                          : 'bg-slate-100 text-slate-400'
                  }`}>
                {opt.key}
              </span>
              <span className="font-medium text-[#1E293B] pt-0.5">
                <SelectableText text={opt.value} contextSentence={opt.value} />
              </span>
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className={`mt-6 p-5 rounded-xl border-2 border-l-4 shadow-md flex items-start gap-3 ${isCorrect
          ? 'bg-emerald-50 border-emerald-200 border-l-emerald-500'
          : 'bg-amber-50 border-amber-200 border-l-amber-500'
          }`}>
          {isCorrect
            ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            : <XCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          }
          <div>
            <p className={`font-bold mb-1 ${isCorrect ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isCorrect ? 'ถูกต้อง!' : 'ผิดแล้ว — เฉลย:'} คำอธิบาย
            </p>
            {explanation && <p className="text-slate-700 text-sm font-medium">{explanation}</p>}
          </div>
        </div>
      )}
    </div>
  );
}