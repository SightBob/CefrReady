/**
 * Server-side PostHog capture.
 *
 * Only used for events the browser cannot know about — today that is
 * `signup_completed`, which fires when the OAuth adapter creates a brand-new
 * user row. Client-side `user_signed_in` cannot tell a first-time user from a
 * returning one on a new device, so a signup funnel built on it would be wrong.
 *
 * Fire-and-forget on purpose: analytics must never delay or break sign-in.
 * Any network/HTTP failure is swallowed here.
 */
const CAPTURE_TIMEOUT_MS = 3000;

export function captureServerEvent(
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {},
): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || !distinctId) return;

  // Server-to-server, so the direct host is used (no ad blockers here).
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com').replace(
    /\/+$/,
    '',
  );

  void fetch(`${host}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      event,
      properties: { distinct_id: distinctId, ...properties },
      timestamp: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(CAPTURE_TIMEOUT_MS),
  }).catch(() => undefined);
}
