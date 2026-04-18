'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { HelpCircle } from 'lucide-react';
import { resetProductTour } from './ProductTour';

const ProductTour = dynamic(() => import('./ProductTour'), { ssr: false });

const STORAGE_KEY = 'cefrready-tour-completed';

export default function HomeTour() {
  const [showTour, setShowTour] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);

  useEffect(() => {
    try {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (!completed) {
        setShowTour(true);
      }
    } catch {
      // ignore
    }

    // Listen for replay event from Header button
    const handleReplay = () => {
      resetProductTour();
      setForceOpen(true);
      setShowTour(true);
    };
    window.addEventListener('cefrready-start-tour', handleReplay);
    return () => window.removeEventListener('cefrready-start-tour', handleReplay);
  }, []);

  const handleReplay = () => {
    resetProductTour();
    setForceOpen(true);
    setShowTour(true);
  };

  const handleComplete = () => {
    setShowTour(false);
    setForceOpen(false);
  };

  return (
    <>
      {showTour && (
        <ProductTour onComplete={handleComplete} forceOpen={forceOpen} />
      )}
    </>
  );
}

// Separate replay button for Header
export function TourReplayButton({ tourType = 'home' }: { tourType?: 'home' | 'test' | 'flashcards' }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const handleReplay = () => {
    // Determine the correct event name based on the tour type
    const eventName = 
      tourType === 'test' ? 'cefrready-start-test-tour' : 
      tourType === 'flashcards' ? 'cefrready-start-flashcards-tour' : 
      'cefrready-start-tour';
      
    // Dispatch the custom event
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
