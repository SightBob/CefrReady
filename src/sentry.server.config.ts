import * as Sentry from '@sentry/nextjs';

// SECURITY: keys whose values must never leave the server in a Sentry event.
// Applies to request bodies, form data, JSON payloads, and any breadcrumb or
// exception value that happens to embed them. We match case-insensitively so
// `Email`, `EMAIL`, `user_email` all get redacted.
const PII_KEYS = [
  'email',
  'password',
  'passwd',
  'secret',
  'token',
  'authorization',
  'apikey',
  'api_key',
  'refresh_token',
  'access_token',
  'session',
  'cookie',
  'name',
  'message',
  'explanation',
  'selectedanswer',
  'useranswer',
];

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function scrubString(s: string): string {
  // Redact email addresses embedded anywhere (stack traces, breadcrumbs,
  // exception messages). Replacing with [REDACTED] keeps the surrounding text
  // readable for debugging without leaking the address itself.
  return s.replace(EMAIL_RE, '[REDACTED]');
}

function scrubValue(v: unknown): unknown {
  if (typeof v === 'string') return scrubString(v);
  if (v && typeof v === 'object') return scrubObject(v as Record<string, unknown>);
  return v;
}

function scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const lower = k.toLowerCase();
    if (PII_KEYS.some((p) => lower === p || lower.includes(p))) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = scrubValue(v);
    }
  }
  return out;
}

function scrubUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return rawUrl;
  try {
    const u = new URL(rawUrl);
    // SECURITY: query strings often carry tokens/emails (e.g. ?token=...,
    // ?email=...). Strip them entirely rather than filtering — false positives
    // are cheap (debugging loses a param) but leaks are expensive.
    u.search = '';
    return u.toString();
  } catch {
    return scrubString(rawUrl);
  }
}

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
    release: process.env.VERCEL_GIT_COMMIT_SHA,

    // SECURITY: never let Sentry SDK auto-attach IP, cookies, or user info.
    sendDefaultPii: false,

    // SECURITY: scrub PII before any event leaves the process. This catches
    // values captured from request bodies (Zod validation failures carry the
    // submitted JSON), DB error messages (which can embed query params), and
    // breadcrumbs (which log URL query strings).
    beforeSend(event) {
      if (event.request) {
        if (event.request.data && typeof event.request.data === 'object') {
          event.request.data = scrubObject(event.request.data as Record<string, unknown>);
        } else if (typeof event.request.data === 'string') {
          event.request.data = scrubString(event.request.data);
        }
        event.request.url = scrubUrl(event.request.url);
        if (event.request.headers) {
          event.request.headers = scrubObject(
            event.request.headers as Record<string, unknown>
          ) as Record<string, string>;
        }
        if (event.request.cookies) {
          // SECURITY: clear every cookie value. Sentry types cookies as
          // Record<string, string>, so we replace each value rather than
          // assigning a sentinel string.
          event.request.cookies = Object.fromEntries(
            Object.keys(event.request.cookies).map((k) => [k, '[REDACTED]'])
          );
        }
        if (event.request.query_string) {
          // SECURITY: query strings often carry tokens/emails. The Sentry
          // type allows string | Record<string, string>; either way, drop it.
          event.request.query_string =
            typeof event.request.query_string === 'string'
              ? '[REDACTED]'
              : Object.fromEntries(
                  Object.keys(event.request.query_string).map((k) => [k, '[REDACTED]'])
                );
        }
      }

      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => {
          if (b.data) {
            b.data = scrubObject(b.data as Record<string, unknown>);
          }
          if (b.category === 'fetch' || b.category === 'http') {
            const url = (b.data as { url?: string } | undefined)?.url;
            if (url) (b.data as { url: string }).url = scrubUrl(url) ?? url;
          }
          if (b.message) b.message = scrubString(b.message);
          return b;
        });
      }

      if (event.exception?.values) {
        for (const ex of event.exception.values) {
          if (ex.value) ex.value = scrubString(ex.value);
        }
      }

      return event;
    },
  });
}
