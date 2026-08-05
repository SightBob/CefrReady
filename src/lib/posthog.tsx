'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import type { PostHog } from 'posthog-js';

// ─── Context ──────────────────────────────────────────────────────────────────

interface PostHogContextValue {
  posthog: PostHog | null;
}

const PostHogContext = createContext<PostHogContextValue>({ posthog: null });

// Paths where session replay is recorded (100% sample — replay is the heaviest
// PostHog feature, so it stays off everywhere else).
const REPLAY_PATHS = ['/tests', '/demo'];
const isReplayPath = (path: string) => REPLAY_PATHS.some((p) => path.startsWith(p));

// ─── Provider ──────────────────────────────────────────────────────────────────

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [posthogInstance, setPosthogInstance] = useState<PostHog | null>(null);
  const previousSessionRef = useRef<boolean | null>(null);

  // Initialize PostHog after page load + idle, so it never competes with
  // critical rendering or early user interaction (INP).
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    if (!key) {
      setPosthogInstance(null);
      return;
    }

    const init = async () => {
      const { default: posthog } = await import('posthog-js');
      posthog.init(key, {
        api_host: host || 'https://us.i.posthog.com',
        defaults: '2026-01-30',
        person_profiles: 'identified_only',
        capture_pageview: false,
        disable_surveys: true,
        autocapture: false,
        capture_performance: false,
        // Replay starts via startSessionRecording() on replay paths only.
        disable_session_recording: true,
        session_recording: {
          maskAllInputs: true,
        },
        before_send: (event) => {
          if (!event) return null;
          const values = event.properties?.exception?.values;
          if (Array.isArray(values)) {
            const isLoadFailed = values.some(
              (v) =>
                v?.type === 'TypeError' &&
                typeof v?.value === 'string' &&
                v.value.includes('Load failed')
            );
            if (isLoadFailed) {
              event.properties = {
                ...event.properties,
                investigation_load_failed: true,
              };
              return event;
            }
          }
          return event;
        },
        loaded: (ph) => {
          setPosthogInstance(ph as PostHog);
        },
      });
    };

    const schedule = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(init, { timeout: 3000 });
      } else {
        setTimeout(init, 0);
      }
    };
    if (document.readyState === 'complete') {
      schedule();
    } else {
      window.addEventListener('load', schedule, { once: true });
    }
  }, []);

  // Auth tracking: identify users and track sign-in/out events
  const { data: session } = useSession();

  useEffect(() => {
    if (!posthogInstance) return;

    const isCurrentlyLoggedIn = !!session?.user;

    if (isCurrentlyLoggedIn) {
      if (previousSessionRef.current !== true) {
        posthogInstance.identify(session!.user.id!, {
          email: session!.user.email,
          isAdmin: session!.user.isAdmin,
        });
        posthogInstance.capture('user_signed_in', { provider: 'google' });
      }
    } else if (previousSessionRef.current === true && session === null) {
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

  const firePageLeave = useCallback((url: string) => {
    if (!posthog) return;
    const duration = Math.round((Date.now() - pageEnterTimeRef.current) / 1000);
    posthog.capture('$pageleave', {
      $current_url: url,
      $time_spent: duration,
    });
  }, [posthog]);

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
  }, [posthog, pathname, firePageLeave]);

  useEffect(() => {
    if (!posthog) return;
    if (pathname !== previousPathRef.current) {
      if (previousPathRef.current) {
        firePageLeave(previousPathRef.current);
      }
      posthog.capture('$pageview', { $current_url: pathname });
      previousPathRef.current = pathname;
      pageEnterTimeRef.current = Date.now();

      if (isReplayPath(pathname)) {
        posthog.startSessionRecording();
      } else if (posthog.sessionRecordingStarted()) {
        posthog.stopSessionRecording();
      }
    }
  }, [pathname, posthog, firePageLeave]);

  return null;
}