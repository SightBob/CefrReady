'use client';

import React, { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  decimals?: number;
}

const AnimatedCounter = React.memo(function AnimatedCounter({
  value,
  suffix = '',
  decimals = 0,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    const duration = 800;

    const step = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * value);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return (
    <span className="tabular-nums">
      {decimals > 0 ? display.toFixed(decimals) : Math.round(display)}{suffix}
    </span>
  );
});

export default AnimatedCounter;
