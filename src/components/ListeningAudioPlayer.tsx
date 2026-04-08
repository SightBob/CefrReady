'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Play, Pause, Volume2 } from 'lucide-react';

interface Option {
  key: string;
  value: string;
}

interface ListeningAudioPlayerProps {
  questionText: string;
  options: Option[];
  selectedAnswer: string | null;
  correctAnswer: string | null;
  explanation: string | null;
  isPlaying: boolean;
  hasPlayed: boolean;
  onPlayAudio: () => void;
  onAnswerSelect: (answer: string) => void;
  disabled?: boolean;
}

export default function ListeningAudioPlayer({
  questionText,
  options,
  selectedAnswer,
  correctAnswer,
  explanation,
  isPlaying,
  hasPlayed,
  onPlayAudio,
  onAnswerSelect,
  disabled = false,
}: ListeningAudioPlayerProps) {
  const isCorrect = selectedAnswer === correctAnswer;
  const showExplanation = selectedAnswer !== null && explanation !== null;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8 mb-6">
      {/* Audio Player */}
      <div className="flex items-center justify-center mb-6">
        <button
          onClick={onPlayAudio}
          disabled={isPlaying}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
            isPlaying
              ? 'bg-orange-100 cursor-not-allowed'
              : 'bg-gradient-to-br from-orange-500 to-amber-500 hover:scale-105 shadow-lg'
          }`}
        >
          {isPlaying ? (
            <Pause className="w-8 h-8 text-orange-600" />
          ) : (
            <Play className="w-8 h-8 text-white ml-1" />
          )}
        </button>
      </div>

      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 text-slate-500">
          <Volume2 className="w-5 h-5" />
          <span>{isPlaying ? 'Playing audio...' : hasPlayed ? 'Click to play again' : 'Click to play audio'}</span>
        </div>
      </div>

      {/* Show transcript after answering */}
      {showExplanation && (
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-slate-600 mb-2">Audio Transcript:</p>
          <p className="text-slate-800 italic">"{questionText}"</p>
        </div>
      )}

      <div className="border-t border-slate-100 pt-6">
        <p className="text-lg font-medium text-slate-800 mb-4">What did you hear?</p>

        <div className="grid grid-cols-1 gap-3">
          {options.map((opt) => {
            let buttonClass = 'p-4 rounded-xl border-2 text-left transition-all duration-200 ';

            if (selectedAnswer === null) {
              buttonClass += 'border-slate-200 hover:border-orange-300 hover:bg-orange-50';
            } else if (opt.key === correctAnswer && showExplanation) {
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
                disabled={selectedAnswer !== null || !hasPlayed || disabled}
                className={buttonClass}
              >
                <span className="font-medium text-slate-800">{opt.value}</span>
              </button>
            );
          })}
        </div>
      </div>

      {showExplanation && explanation && (
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