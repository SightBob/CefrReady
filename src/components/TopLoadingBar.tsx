'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const START_PROGRESS = 12;
const MAX_PROGRESS = 88;
const FINISH_DELAY_MS = 220;

export default function TopLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [progress, setProgress] = useState<number | null>(null);
  const hasMounted = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTimers();
    setProgress(START_PROGRESS);

    intervalRef.current = setInterval(() => {
      setProgress((current) => {
        if (current === null) return START_PROGRESS;
        const next = current + Math.max(1, (MAX_PROGRESS - current) * 0.08);
        return Math.min(next, MAX_PROGRESS);
      });
    }, 240);
  }, [clearTimers]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setProgress((current) => (current === null ? null : 100));
    finishTimeoutRef.current = setTimeout(() => {
      setProgress(null);
      finishTimeoutRef.current = null;
    }, FINISH_DELAY_MS);
  }, [routeKey]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest<HTMLAnchorElement>('a[href]');
      if (
        !anchor ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download') ||
        anchor.dataset.topLoader === 'ignore'
      ) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        !['http:', 'https:'].includes(destination.protocol)
      ) {
        return;
      }

      const currentRoute = `${window.location.pathname}${window.location.search}`;
      const destinationRoute = `${destination.pathname}${destination.search}`;
      if (currentRoute === destinationRoute) return;

      start();
    };

    document.addEventListener('click', handleDocumentClick, true);
    window.addEventListener('popstate', start);

    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
      window.removeEventListener('popstate', start);
      clearTimers();
    };
  }, [clearTimers, start]);

  if (progress === null) return null;

  return (
    <div className="top-loading-track" aria-hidden="true">
      <div
        className="top-loading-bar"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  );
}
