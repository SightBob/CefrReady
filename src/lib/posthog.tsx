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

// จำว่า "ผู้ใช้คนนี้เข้าเว็บรอบนี้แล้ว" ต่อ PostHog session — เดิม user_signed_in
// ยิงทุกครั้งที่โหลดหน้าเต็ม (วัดจริง 1,334 events / 632 sessions = ~2.1 ครั้ง/เซสชัน)
//
// ทำไมไม่ใช้ sessionStorage ต่อแท็บเหมือนเดิม: sessionStorage แยกกันทุกแท็บ →
// เปิด 3 แท็บพร้อมกันก็นับ 3 ครั้ง ทั้งที่ผู้ใช้ล็อกอินรอบเดียว. session id ของ
// PostHog ใช้ร่วมกันทุกแท็บ (เก็บใน cookie/localStorage) และเปลี่ยนเองเมื่อ idle
// 30 นาที จึงเป็นตัวแบ่ง "รอบการใช้งาน" ที่ตรงกับความหมายของ sign-in มากกว่า
// โดยไม่ต้องคำนวณเวลาเอง
const SIGNED_IN_MARKER_KEY = 'cefr:posthog:signed-in';
const signedInMarker = (userId: string, sessionId: string) => `${userId}:${sessionId}`;

// ─── Provider ──────────────────────────────────────────────────────────────────

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [posthogInstance, setPosthogInstance] = useState<PostHog | null>(null);
  const previousSessionRef = useRef<boolean | null>(null);

  // Initialize PostHog after page load + idle, so it never competes with
  // critical rendering or early user interaction (INP).
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    // Browser traffic goes through our own origin (next.config.mjs rewrites
    // /ingest → PostHog) so ad blockers and Brave Shields stop dropping it.
    // The direct host is only used as PostHog's `ui_host` for links.
    const uiHost = (host ?? '').includes('eu.')
      ? 'https://eu.posthog.com'
      : 'https://us.posthog.com';

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
        api_host: '/ingest',
        ui_host: uiHost,
        defaults: '2026-01-30',
        person_profiles: 'identified_only',
        capture_pageview: false,
        disable_surveys: true,
        autocapture: false,
        // Only web vitals (LCP/INP/CLS + FCP/TTFB) — network timing is left off
        // because it only matters to session replay. Init is deferred to
        // load+idle to protect INP; the web-vitals observer reads buffered
        // entries, so earlier paint/interaction timings are still recovered.
        capture_performance: { web_vitals: true },
        // Replay: เปิด recorder ไว้ตั้งแต่ init แล้วให้ PHCapture สั่งหยุดทันที
        // บนหน้าที่ไม่ใช่ replay path (ดูด้านล่าง) — เดิมตั้ง disable_session_recording:
        // true แล้วเรียก startSessionRecording() ภายหลัง แต่ recorder ไม่ถูกโหลด
        // ผลคือ 30 วันมี recording แค่ 1 session ทั้งที่ /tests ควรมีทุกครั้ง
        disable_session_recording: false,
        session_recording: {
          // ผู้เรียนพิมพ์คำตอบลงช่องว่าง — mask ไว้ไม่ให้เนื้อหาคำตอบหลุดเข้า replay
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
        // ต่อรอบการใช้งาน → marker ใน localStorage ผูกกับ session id ของ PostHog
        // (ใช้ร่วมทุกแท็บ, เปลี่ยนเองเมื่อ idle 30 นาที)
        let tracked = false;
        let marker = '';
        try {
          const sessionId = posthogInstance.get_session_id() || '';
          marker = sessionId ? signedInMarker(userId, sessionId) : '';
          // ยังไม่มี session id (เพิ่ง init) → ไม่ mark ไว้ ยอมนับซ้ำดีกว่าปล่อย event หาย
          tracked = marker !== '' && window.localStorage.getItem(SIGNED_IN_MARKER_KEY) === marker;
        } catch {
          // localStorage ใช้ไม่ได้ (private mode) — ยอมนับซ้ำดีกว่าหายทั้ง event
        }
        if (!tracked) {
          posthogInstance.capture('user_signed_in', { provider: 'google' });
          if (marker) {
            try {
              window.localStorage.setItem(SIGNED_IN_MARKER_KEY, marker);
            } catch {
              // เก็บไม่ได้ก็ไม่เป็นไร
            }
          }
        }
      }
    } else if (previousSessionRef.current === true && session === null) {
      posthogInstance.reset();
      posthogInstance.capture('user_signed_out');
      // ล้าง marker ของ session นี้ เพื่อให้ล็อกอินรอบถัดไปนับใหม่
      try {
        window.localStorage.removeItem(SIGNED_IN_MARKER_KEY);
      } catch {
        // ไม่มีอะไรต้องทำ
      }
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
      } else {
        // เรียกทุกครั้ง (ไม่ใช่เฉพาะเมื่อ started) — บนหน้าแรก recorder อาจยังไม่
        // เริ่มตอน effect รัน ถ้าเช็ก started ก่อนจะหลุดและบันทึกทั้งเว็บ
        posthog.stopSessionRecording();
      }
    }
  }, [pathname, posthog, firePageLeave]);

  return null;
}