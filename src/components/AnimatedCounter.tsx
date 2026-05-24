'use client';

import React, { useEffect, useRef } from 'react';
import { useMotionValue, animate, useTransform } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
}

const AnimatedCounter = React.memo(function AnimatedCounter({
  value,
  suffix = '',
}: AnimatedCounterProps) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => Math.round(v).toString());
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ctrl = animate(mv, value, {
      type: 'spring',
      stiffness: 50,
      damping: 20,
    });
    return () => ctrl.stop();
  }, [value, mv]);

  useEffect(() => {
    const unsub = display.on('change', (v) => {
      if (nodeRef.current) {
        nodeRef.current.textContent = `${v}${suffix}`;
      }
    });
    return unsub;
  }, [display, suffix]);

  return (
    <span ref={nodeRef} className="tabular-nums">
      0{suffix}
    </span>
  );
});

export default AnimatedCounter;
