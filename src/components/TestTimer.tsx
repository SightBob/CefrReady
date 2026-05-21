'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TestTimerProps {
  initialSeconds: number;
  isSubmitted: boolean;
}

export default function TestTimer({ initialSeconds, isSubmitted }: TestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const isWarning = timeLeft <= 120;

  useEffect(() => {
    if (isSubmitted) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isSubmitted]);

  if (isSubmitted) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-mono font-bold transition-colors ${isWarning ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
      <Clock className="w-4 h-4" />
      {minutes}:{seconds}
    </div>
  );
}