'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';
import { estimateCefrLevel } from '@/lib/cefr-estimator';

// ─── Context ──────────────────────────────────────────────────────────────────

interface PostHogContextValue {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  posthog: any;
}

const PostHogContext = createContext<PostHogContextValue>({ posthog: null });

// ─── Provider ──────────────────────────────────────────────────────────────────

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [posthogInstance, setPosthogInstance] = useState<any>(null);
  const previousSessionRef = useRef<boolean | null>(null);

  // Initialize PostHog (CSR only)
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    if (!key) {
      setPosthogInstance(null);
      return;
    }

    posthog.init(key, {
      api_host: host || 'https://us.i.posthog.com',
      defaults: '2026-01-30',
      person_profiles: 'identified_only',
      capture_pageview: false, // We capture manually via PHCapture
      loaded: (ph) => {
        setPosthogInstance(ph);
      },
    });
  }, []);

  // Auth tracking: identify users and track sign-in/out events
  const { data: session } = useSession();

  useEffect(() => {
    if (!posthogInstance) return;

    const isCurrentlyLoggedIn = !!session?.user;

    if (isCurrentlyLoggedIn) {
      // User signed in or session active
      if (previousSessionRef.current !== true) {
        posthogInstance.identify(session!.user.id!, {
          email: session!.user.email,
          isAdmin: session!.user.isAdmin,
        });
        // Fetch progress to set cefr_level person property
        fetch('/api/progress')
          .then(r => r.json())
          .then(progress => {
            if (progress.success && progress.data?.overall?.averageScore != null) {
              posthogInstance.people.set({ cefr_level: estimateCefrLevel(progress.data.overall.averageScore) });
            }
          })
          .catch(() => { /* non-critical */ });
        posthogInstance.capture('user_signed_in', { provider: 'google' });
      }
    } else if (previousSessionRef.current === true && session === null) {
      // User signed out
      posthogInstance.reset();
      posthogInstance.capture('user_signed_out');
    }

    previousSessionRef.current = isCurrentlyLoggedIn;
  }, [session, posthogInstance]);

  return (
    <PostHogContext.Provider value={{ posthog: posthogInstance }}>
      {children}
    </PostHogContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePostHog() {
  const context = useContext(PostHogContext);
  return context.posthog;
}

// ─── Pageview Capture ─────────────────────────────────────────────────────────

export function PHCapture() {
  const pathname = usePathname();
  const posthog = usePostHog();
  const previousPathRef = useRef<string | null>(null);
  const pageEnterTimeRef = useRef<number>(Date.now());

  // Helper: fire $pageleave for a given URL with time spent
  const firePageLeave = (url: string) => {
    if (!posthog) return;
    const duration = Math.round((Date.now() - pageEnterTimeRef.current) / 1000);
    posthog.capture('$pageleave', {
      $current_url: url,
      $time_spent: duration,
    });
  };

  // Capture $pageleave on tab hide / close / navigate away
  useEffect(() => {
    if (!posthog) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        firePageLeave(pathname);
      }
    };

    const handleBeforeUnload = () => {
      firePageLeave(pathname);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [posthog, pathname]);

  // Capture $pageview on route change, $pageleave for the previous route
  useEffect(() => {
    if (!posthog) return;
    if (pathname !== previousPathRef.current) {
      if (previousPathRef.current) {
        firePageLeave(previousPathRef.current);
      }
      posthog.capture('$pageview', { $current_url: pathname });
      previousPathRef.current = pathname;
      pageEnterTimeRef.current = Date.now();
    }
  }, [pathname, posthog]);

  return null;
}
