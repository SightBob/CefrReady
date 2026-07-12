'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MessageSquareText, X } from 'lucide-react';
import {
  FEEDBACK_DISCOVERY_SEEN_KEY,
  HOME_TOUR_COMPLETED_KEY,
  HOME_TOUR_FINISHED_EVENT,
  shouldShowFeedbackDiscovery,
} from '@/lib/feedback-discovery';

const OPEN_DELAY_MS = 500;
const HOME_TOUR_STARTED_EVENT = 'cefrready-start-tour';

export default function FeedbackDiscoveryModal() {
  const router = useRouter();
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const shownThisMount = useRef(false);

  const markSeenAndClose = useCallback(() => {
    shownThisMount.current = true;
    try {
      localStorage.setItem(FEEDBACK_DISCOVERY_SEEN_KEY, 'true');
    } catch {
      // Keep the mounted-session guard when storage is unavailable.
    }
    setOpen(false);
  }, []);

  const handleGoToFeedback = () => {
    markSeenAndClose();
    router.push('/contact');
  };

  useEffect(() => {
    if (status !== 'authenticated' || shownThisMount.current) return;

    let openTimer: ReturnType<typeof setTimeout> | undefined;
    let storageAvailable = true;

    const scheduleOpen = () => {
      if (shownThisMount.current) return;
      window.clearTimeout(openTimer);
      openTimer = setTimeout(() => {
        if (!shownThisMount.current) setOpen(true);
      }, OPEN_DELAY_MS);
    };

    const readState = () => {
      try {
        return {
          seen: localStorage.getItem(FEEDBACK_DISCOVERY_SEEN_KEY) === 'true',
          tourCompleted: localStorage.getItem(HOME_TOUR_COMPLETED_KEY) === 'true',
        };
      } catch {
        storageAvailable = false;
        shownThisMount.current = true;
        return { seen: true, tourCompleted: false };
      }
    };

    const initialState = readState();
    if (shouldShowFeedbackDiscovery({
      authenticated: true,
      seen: initialState.seen,
      tourCompleted: initialState.tourCompleted,
    })) {
      scheduleOpen();
    }

    const handleTourStarted = () => {
      window.clearTimeout(openTimer);
      setOpen(false);
    };

    const handleTourFinished = () => {
      if (!storageAvailable || shownThisMount.current) return;
      const { seen } = readState();
      if (!seen) scheduleOpen();
    };

    window.addEventListener(HOME_TOUR_STARTED_EVENT, handleTourStarted);
    window.addEventListener(HOME_TOUR_FINISHED_EVENT, handleTourFinished);

    return () => {
      window.clearTimeout(openTimer);
      window.removeEventListener(HOME_TOUR_STARTED_EVENT, handleTourStarted);
      window.removeEventListener(HOME_TOUR_FINISHED_EVENT, handleTourFinished);
    };
  }, [status]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    primaryActionRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        markSeenAndClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [markSeenAndClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        aria-label="ปิดหน้าต่างความคิดเห็น"
        onClick={markSeenAndClose}
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-discovery-title"
        aria-describedby="feedback-discovery-description"
        className="relative w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 sm:p-8"
      >
        <button
          type="button"
          onClick={markSeenAndClose}
          aria-label="ปิด"
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
          <MessageSquareText className="h-6 w-6" />
        </div>
        <h2 id="feedback-discovery-title" className="pr-8 text-2xl font-bold tracking-tight text-slate-900">
          มีความคิดเห็นอยากบอกเราไหม?
        </h2>
        <p id="feedback-discovery-description" className="mt-3 text-sm leading-6 text-slate-600">
          หากพบปัญหาในการใช้งาน หรือมีข้อเสนอแนะ คุณสามารถส่งความคิดเห็นให้เราได้ทุกเมื่อ
        </p>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={markSeenAndClose}
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          >
            ไว้ภายหลัง
          </button>
          <button
            ref={primaryActionRef}
            type="button"
            onClick={handleGoToFeedback}
            className="rounded-full bg-[#111] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2a2a2a] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            ส่งความคิดเห็น
          </button>
        </div>
      </section>
    </div>
  );
}
