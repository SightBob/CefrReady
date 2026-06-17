'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
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
