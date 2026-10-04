'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import SelectableText from './SelectableText';

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
  hideFeedback?: boolean;
  showTranscriptOnAnswer?: boolean;
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
  hideFeedback = false,
  showTranscriptOnAnswer = true,
}: ListeningAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedCallbackRef = useRef(false);
  const explanationRef = useRef<HTMLDivElement | null>(null);
  const prevSelectedRef = useRef<string | null>(null);

  useEffect(() => {
    const wasUnanswered = prevSelectedRef.current === null;
    prevSelectedRef.current = selectedAnswer;
    // Only scroll on the unanswered -> answered transition, not on mount
    // (review pages render with selectedAnswer pre-filled)
    if (!wasUnanswered || selectedAnswer === null || hideFeedback) return;
    const id = window.setTimeout(() => {
      explanationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    return () => window.clearTimeout(id);
  }, [selectedAnswer, hideFeedback]);

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

    // ผูก listener ทั้งหมดด้วย AbortController: cleanup ต้องถอด listener ออกก่อนเสมอ
    // ไม่เช่นนั้น StrictMode ที่ mount effect สองรอบใน dev จะทำให้ Audio ตัวแรก
    // (ที่ถูกทิ้งแล้ว) ยิง error ตอน src ถูกเคลียร์ แล้วไปตั้ง state ทั้งที่ไฟล์เสียงโหลดได้
    const ac = new AbortController();
    const signal = ac.signal;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    }, { signal });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    }, { signal });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setHasPlayed(true);
      setProgress(0);
      setCurrentTime(0);
      if (!playedCallbackRef.current) {
        playedCallbackRef.current = true;
        onAudioPlayed?.();
      }
    }, { signal });

    audio.addEventListener('error', () => {
      setError('Audio failed to load. Please try again.');
      setIsPlaying(false);
    }, { signal });

    return () => {
      ac.abort();
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
  const showExplanation = selectedAnswer !== null && !hideFeedback;

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
            <span className="text-slate-800 leading-relaxed">
              <SelectableText text={content} contextSentence={content} />
            </span>
          </div>
        );
      }

      return (
        <p key={idx} className="mb-2 text-slate-800 leading-relaxed last:mb-0">
          <SelectableText text={trimmed} contextSentence={trimmed} />
        </p>
      );
    });
  };

  const showOptionFeedback = selectedAnswer !== null && !hideFeedback;

  return (
    // Figma 60:4443 — การ์ด 840×572 r20, padding 26 ข้าง / 24 บน / 23 ล่าง, gap 17px ก่อนบล็อกคำอธิบาย
    <div className="w-full max-w-[840px] bg-white rounded-[20px] px-[26px] pt-6 pb-[23px] flex flex-col gap-[17px]">
      <div className="w-full flex flex-col gap-[1.4375rem]">
        {/* 60:4445 — ช่องฟังเสียง กว้างเต็มการ์ด, ชิ้นกลาง, ห่างกัน 15px */}
        <div className="w-full flex flex-col items-center gap-[15px]">
          <div className="flex flex-col items-center">
            {/* 60:4447 — รูปหมีฟังเสียง 87×87 (ซ้อนทับแถบเวลา 4px) */}
            <div className="mb-[-4px] relative shrink-0 size-[87px]">
              <Image
                src="/logo-otter/otter-audio-player.png"
                alt=""
                width={87}
                height={87}
                className="absolute inset-0 size-full object-cover"
              />
            </div>

            {/* 60:4448 — แถบเวลา 320×42 (ราง 6px + ตัวเลข 12px #8293a9) */}
            <div className="flex flex-col h-[42px] items-start max-w-[320px] pt-4 w-[320px]">
              <div className="bg-[#f1f5f9] flex flex-col h-1.5 items-start overflow-clip rounded-full shrink-0 w-full">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-500 h-1.5 shrink-0 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex h-5 items-start justify-between pt-1 w-[320px]">
                <span className="shrink-0 text-[0.75rem] leading-4 text-[#8293a9]">
                  {formatTime(currentTime)}
                </span>
                <span className="shrink-0 text-[0.75rem] leading-4 text-[#8293a9]">
                  {formatTime(duration)}
                </span>
              </div>
            </div>
          </div>

          {/* 60:4456 — ปุ่มฟังเสียง 138×37 r32 พื้น #6097c5 (error ยังไม่มีสเปกในดีไซน์) */}
          {error ? (
            <p className="shrink-0 text-sm text-red-500">{error}</p>
          ) : (
            <button
              type="button"
              onClick={isPlaying ? handlePause : handlePlay}
              className="bg-[#6097c5] flex h-[37px] items-center px-[18px] py-1.5 rounded-[32px] shrink-0 transition-opacity hover:opacity-90"
            >
              <span className="flex gap-2 items-center">
                <Image src="/icon_svg/speaker.svg" alt="" width={20} height={20} className="size-5 shrink-0" />
                <span className="shrink-0 text-sm font-semibold leading-6 text-white text-center whitespace-nowrap">
                  คลิกฟังเสียง
                </span>
              </span>
            </button>
          )}
        </div>

        {/* บล็อก transcript — ยังไม่มีสเปกในดีไซน์ 60:4442 คงรูปแบบเดิมไว้ */}
        {showExplanation && showTranscriptOnAnswer && (
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <p className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">Audio Transcript</p>
            <div className="text-base">
              {renderTranscript(transcript || questionText)}
            </div>
          </div>
        )}

        {/* 60:4464 — บรรทัดโจทย์ (ไอคอน 15px + ข้อความ 16px SemiBold) แล้วห่าง 23px ถึงตัวเลือก */}
        <div className="w-full flex flex-col gap-[1.4375rem]">
          <div className="flex gap-2.5 items-center">
            <span className="shrink-0 block text-[#334155]">
              <Image
                src="/icon_svg/question.svg"
                alt=""
                width={15}
                height={15}
                className="block h-[15px] w-[15px]"
                aria-hidden="true"
              />
            </span>
            <div className="text-base font-semibold capitalize leading-[1.125rem] text-[#334155] tracking-[0.0219em]">
              <SelectableText text={questionText || 'What did you hear?'} contextSentence={questionText} inline />
            </div>
          </div>

          {/* 60:4469 — ตัวเลือก 380×78, 2 คอลัมน์, gap-x 28 / gap-y 16 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-4">
            {options.map((opt) => {
              const isSelected = selectedAnswer === opt.key;
              const isCorrectOption = opt.key === correctAnswer;

              let buttonClass = 'px-4 min-h-[4.875rem] rounded-2xl ring-[1.6px] ring-inset text-left transition-all duration-200 flex items-center gap-3 ';
              let badgeClass = 'shrink-0 w-7 h-7 rounded-lg grid place-items-center text-sm font-bold leading-5 ';

              if (showOptionFeedback && isCorrectOption) {
                buttonClass += 'bg-[#ecfdf5] ring-[#cdefdf]';
                badgeClass += 'bg-[#10b981] text-white';
              } else if (showOptionFeedback && isSelected) {
                buttonClass += 'bg-[#fef2f2] ring-[#ffd7d7]';
                badgeClass += 'bg-[#f87171] text-white';
              } else if (showOptionFeedback) {
                buttonClass += 'bg-white ring-[#e2e8f0] opacity-60';
                badgeClass += 'bg-[#f1f5f9] text-[#64748b]';
              } else {
                buttonClass += `bg-white ring-[#e2e8f0] ${isSelected ? '' : 'hover:bg-slate-50'}`;
                badgeClass += 'bg-[#f1f5f9] text-[#64748b]';
              }

              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={(e) => {
                    if (!showExplanation && !disabled) {
                      onAnswerSelect(opt.key);
                    }
                  }}
                  className={buttonClass}
                >
                  <span className={badgeClass}>{opt.key}</span>
                  <span className="text-base font-medium leading-[1.625rem] text-[#1E293B]">
                    <SelectableText text={opt.value} contextSentence={opt.value} inline />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 60:4496 — ป้าย + กล่องคำอธิบาย */}
      {showExplanation && explanation && (
        <div ref={explanationRef} className="w-full flex flex-col">
          {/* 60:4497 — ป้าย 252×35: รูปหมี 52×35 ทับซ้าย, แถบ #f7f5ed 242×24, หัวใจ 12px */}
          <div className="relative shrink-0 w-[252px] h-[35px] mb-[-2px]">
            <div className="absolute left-0 top-0 z-20 w-[52px] h-[35px] overflow-hidden">
              <Image
                src="/logo-otter/otter-flag.png"
                alt=""
                width={52}
                height={35}
                className="absolute max-w-none h-[154.24%] w-[101.11%] left-[-0.56%] top-[-30.51%]"
              />
            </div>
            <div className="absolute left-[10px] top-2 z-10 h-6 w-[242px] rounded-[16px] bg-[#f7f5ed]" />
            <div className="absolute left-[57px] top-[10px] z-30 flex gap-1.5 items-center">
              <span className="text-[0.8125rem] font-semibold leading-5 text-[#6d5b16] whitespace-nowrap">
                {isCorrect ? 'ตอบได้เป๊ะเลย! มาดูกันว่าทำไม' : 'แวะอ่านสักนิด ครั้งหน้าทำได้แน่'}
              </span>
              <Image src="/icon_svg/heart.svg" alt="" width={12} height={12} className="size-3 shrink-0" />
            </div>
          </div>

          {/* 60:4504 — กล่อง #fffefa / เส้นขอบ #e9cd62 r15, ไอคอนดูแล 23×23 พื้น #c8e6ff */}
          <div className="w-full bg-[#fffefa] border border-[#e9cd62] rounded-[15px] min-h-[62px] px-5 py-4 flex items-center">
            <div className="flex gap-2.5 items-start">
              <span className="bg-[#c8e6ff] rounded-[6px] shrink-0 size-[23px] grid place-items-center">
                <Image src="/icon_svg/spark.svg" alt="" width={16} height={16} className="size-[15.8px]" />
              </span>
              {/* 60:4510 — ข้อความสองระดับในบรรทัดเดียว: Medium ตามด้วย Bold ในเครื่องหมายคำพูด */}
              <div className="text-sm font-medium text-[#76641c]">
                <span className="leading-[1.3125rem]">
                  {isCorrect ? 'คุณตอบได้ดีเลย!' : 'คุณตอบได้ดีเลย ขอแนะนำอีกนิดเพื่อความแม่นยำคือ '}
                </span>
                <span className="font-bold leading-[1.3125rem]">“ {explanation} ”</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
