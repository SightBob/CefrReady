'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle, XCircle, Play, Pause, RotateCcw, Volume2 } from 'lucide-react';

interface Option {
  key: string;
  value: string;
}

interface ListeningAudioPlayerProps {
  audioUrl?: string;
  transcript: string;
  questionText: string;
  options: Option[];
  selectedAnswer: string | null;
  correctAnswer: string | null;
  explanation: string | null;
  onAudioPlayed?: () => void;
  onAnswerSelect: (answer: string) => void;
  disabled?: boolean;
}

export default function ListeningAudioPlayer({
  audioUrl,
  transcript,
  questionText,
  options,
  selectedAnswer,
  correctAnswer,
  explanation,
  onAudioPlayed,
  onAnswerSelect,
  disabled = false,
}: ListeningAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedCallbackRef = useRef(false);

  useEffect(() => {
    // Reset state for new audio
    setIsPlaying(false);
    setHasPlayed(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    playedCallbackRef.current = false;

    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setHasPlayed(true);
      setProgress(0);
      setCurrentTime(0);
      if (!playedCallbackRef.current) {
        playedCallbackRef.current = true;
        onAudioPlayed?.();
      }
    });

    audio.addEventListener('error', () => {
      setError('Audio failed to load. Please try again.');
      setIsPlaying(false);
    });

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [audioUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlay = useCallback(() => {
    if (!audioRef.current) {
      setError('No audio available.');
      return;
    }

    setError(null);
    playedCallbackRef.current = false;

    if (hasPlayed) {
      audioRef.current.currentTime = 0;
    }

    audioRef.current.play().catch(() => {
      setError('Playback failed. Check your browser settings.');
      setIsPlaying(false);
    });
    setIsPlaying(true);
  }, [hasPlayed]);

  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  }, []);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isCorrect = selectedAnswer === correctAnswer;
  const showExplanation = selectedAnswer !== null && explanation !== null;

  const renderTranscript = (text: string) => {
    if (!text) return null;
    // Splitting by literal "\n" or actual newline
    const lines = text.split(/\\n|\\r\\n|\r\n|\n/);
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      
      const match = trimmed.match(/^(M|F|Male|Female|Man|Woman):\s*(.*)/i);
      if (match) {
        const speaker = match[1].toUpperCase();
        const content = match[2];
        const isMale = speaker.startsWith('M');
        const speakerColor = isMale 
          ? 'text-blue-700 bg-blue-100' 
          : 'text-pink-700 bg-pink-100';
        
        return (
          <div key={idx} className="mb-3 flex gap-3 items-start">
            <span className={`px-2 py-1 rounded text-xs font-bold mt-0.5 shrink-0 w-8 text-center ${speakerColor}`}>
              {speaker.charAt(0)}
            </span>
            <span className="text-slate-800 leading-relaxed">{content}</span>
          </div>
        );
      }
      
      return (
        <p key={idx} className="mb-2 text-slate-800 leading-relaxed last:mb-0">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 md:p-8 mb-6">
      {/* Audio Player */}
      <div className="flex flex-col items-center mb-6">
        <button
          onClick={isPlaying ? handlePause : handlePlay}
          disabled={false}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
            isPlaying
              ? 'bg-orange-100 cursor-pointer'
              : hasPlayed
              ? 'bg-gradient-to-br from-slate-400 to-slate-500 hover:scale-105 shadow-lg'
              : 'bg-gradient-to-br from-orange-500 to-amber-500 hover:scale-105 shadow-lg'
          }`}
        >
          {isPlaying ? (
            <Pause className="w-8 h-8 text-orange-600" />
          ) : hasPlayed ? (
            <RotateCcw className="w-8 h-8 text-white" />
          ) : (
            <Play className="w-8 h-8 text-white ml-1" />
          )}
        </button>

        {/* Audio progress bar */}
        {duration > 0 && (
          <div className="w-full max-w-xs mt-4">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 text-slate-500">
          <Volume2 className="w-5 h-5" />
          <span>
            {error
              ? error
              : isPlaying
              ? 'Playing audio...'
              : hasPlayed
              ? 'Click to replay'
              : 'Click to play audio'}
          </span>
        </div>
      </div>

      {/* Show transcript after answering */}
      {showExplanation && (
        <div className="bg-slate-50 rounded-xl p-5 mb-6 border border-slate-200">
          <p className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">Audio Transcript</p>
          <div className="text-base">
            {renderTranscript(transcript || questionText)}
          </div>
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
                disabled={selectedAnswer !== null || disabled}
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
