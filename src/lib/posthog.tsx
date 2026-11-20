'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
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

// จำว่า "ผู้ใช้คนนี้เข้าเว็บครั้งนี้แล้ว" ต่อแท็บ — เดิม user_signed_in ยิงทุกครั้ง
// ที่โหลดหน้าเต็ม (วัดจริง 1,334 events / 632 sessions = ~2.1 ครั้ง/เซสชัน)
const SIGNED_IN_MARKER_PREFIX = 'cefr:posthog:signed-in:';
const signedInMarker = (userId: string) => `${SIGNED_IN_MARKER_PREFIX}${userId}`;

// ─── Provider ──────────────────────────────────────────────────────────────────

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [posthogInstance, setPosthogInstance] = useState<PostHog | null>(null);
  const previousSessionRef = useRef<boolean | null>(null);
  const signedInUserIdRef = useRef<string | null>(null);

  // Initialize PostHog after page load + idle, so it never competes with
  // critical rendering or early user interaction (INP).
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    if (!key) {
      setPosthogInstance(null);
      return;
    }

    let disposed = false;
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const init = async () => {
      const { default: posthog } = await import('posthog-js');
      if (disposed) return;
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
          if (!disposed) setPosthogInstance(ph as PostHog);
        },
      });
    };

    const schedule = () => {
      if ('requestIdleCallback' in window) {
        idleId = requestIdleCallback(init, { timeout: 3000 });
      } else {
        timeoutId = setTimeout(init, 0);
      }
    };
    if (document.readyState === 'complete') {
      schedule();
    } else {
      window.addEventListener('load', schedule, { once: true });
    }
    return () => {
      disposed = true;
      window.removeEventListener('load', schedule);
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, []);

  // Auth tracking: identify users and track sign-in/out events
  const { data: session } = useSession();

  useEffect(() => {
    if (!posthogInstance) return;

    const isCurrentlyLoggedIn = !!session?.user;

    if (isCurrentlyLoggedIn) {
      if (previousSessionRef.current !== true) {
        const userId = session!.user.id!;
        posthogInstance.identify(userId, {
          email: session!.user.email,
          isAdmin: session!.user.isAdmin,
        });
        // identify ทุกครั้งที่โหลดหน้าเต็มเป็นเรื่องปกติ แต่ "sign in" ควรนับครั้งเดียว
        // → ใช้ marker ใน sessionStorage ต่อแท็บ (ล้างตอน sign out)
        let tracked = false;
        try {
          tracked = window.sessionStorage.getItem(signedInMarker(userId)) === '1';
        } catch {
          // sessionStorage ใช้ไม่ได้ (private mode) — ยอมนับซ้ำดีกว่าหายทั้ง event
        }
        if (!tracked) {
          posthogInstance.capture('user_signed_in', { provider: 'google' });
          try {
            window.sessionStorage.setItem(signedInMarker(userId), '1');
          } catch {
            // เก็บไม่ได้ก็ไม่เป็นไร
          }
        }
        signedInUserIdRef.current = userId;
      }
    } else if (previousSessionRef.current === true && session === null) {
      const previousUserId = signedInUserIdRef.current;
      posthogInstance.reset();
      posthogInstance.capture('user_signed_out');
      if (previousUserId) {
        try {
          window.sessionStorage.removeItem(signedInMarker(previousUserId));
        } catch {
          // ไม่มีอะไรต้องทำ
        }
      }
      signedInUserIdRef.current = null;
    }

    previousSessionRef.current = isCurrentlyLoggedIn;
  }, [session, posthogInstance]);

  const contextValue = useMemo(() => ({ posthog: posthogInstance }), [posthogInstance]);

  return (
    <PostHogContext.Provider value={contextValue}>
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
  // หน้าที่ส่ง $pageleave ไปแล้ว — กันยิงซ้ำเมื่อ visibilitychange + beforeunload
  // + route change เกิดพร้อมกัน (วัดจริงซ้ำ ~18% ของ pageleave ทั้งหมด)
  const pageLeaveSentForRef = useRef<string | null>(null);

  const firePageLeave = useCallback((url: string) => {
    if (!posthog) return;
    if (pageLeaveSentForRef.current === url) return;
    pageLeaveSentForRef.current = url;
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
      // หน้าใหม่ = เริ่มนับ pageleave ของหน้านี้ได้อีกครั้ง
      pageLeaveSentForRef.current = null;
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