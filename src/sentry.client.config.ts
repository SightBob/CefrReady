import * as Sentry from '@sentry/nextjs';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({

  sendDefaultPii: false,

  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
  ],
  beforeSend(event, hint) {
    // Filter out "TypeError: Load failed" caused by OAuth redirect abort on Safari.
    // NextAuth signIn('google') triggers a redirect that aborts the underlying fetch.
    // Safari reports this as a TypeError; Chrome silently drops it.
    const err = hint?.originalException;
    if (
      err instanceof Error &&
      err.message.includes('Load failed') &&
      event.request?.url?.includes('/auth/')
    ) {
      return null;
    }
    return event;
  },
});
}
