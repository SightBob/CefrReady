'use client';

import { useState, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

export default function TourReplayButton({ tourType = 'home' }: { tourType?: 'home' | 'test' }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const handleReplay = () => {
    const eventName = 
      tourType === 'test' ? 'cefrready-start-test-tour' : 
      'cefrready-start-tour';
    window.dispatchEvent(new CustomEvent(eventName));
  };

  return (
    <button
      onClick={handleReplay}
      className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
      title="ดูแนะนำการใช้งาน"
      aria-label="ดูแนะนำการใช้งาน"
    >
      <HelpCircle className="w-5 h-5" />
    </button>
  );
}
