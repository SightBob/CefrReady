'use client';

import { useState } from 'react';
import Image from 'next/image';
import { HelpCircle } from 'lucide-react';
import { Sparkle } from '@phosphor-icons/react';
import SelectableText from './SelectableText';
import ExplanationText from './ExplanationText';

const OTTER_AVATAR = '/logo-otter/otter.png';
const OTTER_CHEER = '/logo-otter/otter-chear1.png';

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

  // Figma-style chat bubble: 34px avatar, speaker #64748B SemiBold 14,
  // words #334155 Medium 15/lh26 gap 5px, ? icon 15px #334155
  const renderConversation = (lines: ConversationLine[]) => (
    <div className="space-y-[0.9375rem]">
      {lines.map((line, i) => (
        <div key={i} className="flex items-center gap-[1.3125rem] bg-[#F6F6F6] rounded-[10px] ps-4 pe-6 py-2 min-h-[5.125rem]">
          <div
            className="w-[2.125rem] h-[2.125rem] rounded-full shrink-0 bg-cover bg-center"
            style={{
              // Figma: woman = #DDBABA, man = #A7C4DB — even line = first speaker
              backgroundColor: i % 2 === 0 ? '#DDBABA' : '#A7C4DB',
              backgroundImage: `url(${OTTER_AVATAR})`,
            }}
            role="img"
            aria-label={line.speaker}
          />
          <div className="min-w-0 flex-1">
            <p className="h-6 text-sm font-semibold text-[#64748B] leading-5">{line.speaker}</p>
            <p className="flex flex-wrap items-center gap-x-[5px] text-[0.9375rem] font-medium leading-[1.625rem] text-[#334155]">
              {line.text.split(/(\s+)/).filter(Boolean).map((word, wi) =>
                /^\s+$/.test(word)
                  ? null
                  : <span key={wi}><SelectableText text={word} contextSentence={line.text} inline /></span>,
              )}
            </p>
          </div>
        </div>
      ))}
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
        <div className="bg-[#F6F6F6] rounded-[10px] px-6 py-10">
          <div className="text-[1.25rem] md:text-xl text-[#334155] leading-relaxed">
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
    <div className="bg-white rounded-[20px] p-4 sm:p-6">
      {HeaderIcon && headerLabel && (
        <div className="flex items-center gap-2 mb-4">
          <HeaderIcon className={`w-5 h-5 ${theme.headerText}`} />
          <span className={`text-sm font-medium ${theme.headerText}`}>{headerLabel}</span>
        </div>
      )}
      {renderQuestion()}

      {conversation && conversation.length > 0 && (
        <div className="flex items-center gap-2.5 mt-[1.4375rem]">
          <span className="shrink-0 text-[#334155]">
            <HelpCircle className="w-[0.9375rem] h-[0.9375rem]" />
          </span>
          <div className="text-base font-semibold text-[#334155] tracking-[0.0219em]">
            <SelectableText text={questionText} contextSentence={questionText} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-4 mt-6 sm:mt-[1.75rem]">
        {options.map((opt) => {
          const isSelected = selectedAnswer === opt.key;
          const isCorrectOption = opt.key === correctAnswer;
          const showFeedback = selectedAnswer !== null && correctAnswer !== null;

          // Figma option card: 380x78, border #E2E8F0 1.6px, radius 16px,
          // badge 28px #F1F5F9 radius 8px, answer text 16px Medium #1E293B
          let buttonClass = 'px-4 min-h-[4.875rem] rounded-2xl border-[0.1rem] text-left transition-all duration-200 flex items-center gap-3 ';

          if (!showFeedback) {
            if (isSelected) {
              buttonClass += theme.selected;
            } else {
              buttonClass += `border-[#E2E8F0] bg-white ${theme.hover}`;
            }
          } else if (isCorrectOption) {
            buttonClass += 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/20';
          } else if (isSelected) {
            buttonClass += 'border-red-400 bg-red-50 ring-1 ring-red-400/20';
          } else {
            buttonClass += 'border-[#E2E8F0] bg-white opacity-40';
          }

          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onAnswerSelect(opt.key)}
              disabled={showFeedback || disabled}
              className={buttonClass}
            >
              <span className={`shrink-0 w-7 h-7 rounded-lg grid place-items-center text-sm font-bold ${
                    !showFeedback
                      ? isSelected
                        ? theme.badge
                        : 'bg-[#F1F5F9] text-[#64748B]'
                      : isCorrectOption
                        ? 'bg-emerald-500 text-white'
                        : isSelected
                          ? 'bg-red-400 text-white'
                          : 'bg-[#F1F5F9] text-slate-300'
                  }`}>
                {opt.key}
              </span>
              <span className="text-base font-medium text-[#1E293B]">
                <SelectableText text={opt.value} contextSentence={opt.value} inline />
              </span>
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className="mt-6">
          {/* แถว header — otter + แคปชันเฉลย + หัวใจ */}
          <div className="relative inline-flex items-end gap-2 pl-[2.6rem]">
            <Image
              src={OTTER_CHEER}
              alt=""
              width={52}
              height={52}
              className="absolute left-0 bottom-0 w-[3.25rem] h-[3.25rem] object-contain object-bottom"
            />
            <span className="rounded-full rounded-bl-none bg-[#F5F0E8] px-3.5 py-2 text-sm font-semibold text-[#5C5142]">
              เฉลยว่าทำไมถึงโดน&nbsp;
              <span aria-hidden="true">💛</span>
            </span>
          </div>
          {/* กล่องคำอธิบาย — ขอบเหลือง 2 ชั้น พื้นขาว */}
          <div
            className="mt-2 rounded-2xl px-4 py-4 sm:px-5"
            style={{ border: '1.6px solid #F5D963', background: '#FFFFFF' }}
          >
            <div className="flex items-start gap-3">
              <span
                className="grid size-7 shrink-0 place-items-center rounded-[0.5rem] text-[#1DA1F2]"
                style={{ background: '#DDF4FF' }}
              >
                <Sparkle className="size-4" weight="fill" />
              </span>
              <div className="min-w-0">
                <p className="text-base font-extrabold text-[#5C4A1A]">
                  คุณตอบ{isCorrect ? "ถูก" : "ผิด"}เลย งานนี้ใช้เหตุผลนี้อธิบาย
                </p>
                {explanation && (
                  <ExplanationText
                    text={`“ ${explanation} ”`}
                    className="mt-1 text-sm font-semibold text-[#8A7A4E]"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}