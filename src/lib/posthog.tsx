'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';

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

  useEffect(() => {
    if (!posthog) return;
    if (pathname !== previousPathRef.current) {
      posthog.capture('$pageview', { $current_url: pathname });
      previousPathRef.current = pathname;
    }
  }, [pathname, posthog]);

  return null;
}
