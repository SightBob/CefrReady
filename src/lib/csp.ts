/**
 * SECURITY: nonce-based Content-Security-Policy (report M1).
 *
 * The nonce is generated per-request in src/proxy.ts and forwarded to server
 * components via the x-nonce request header. Modern browsers enforce the
 * nonce and IGNORE 'unsafe-inline' when a nonce is present; 'unsafe-inline'
 * remains only as a fallback for legacy browsers. In development we add
 * 'unsafe-eval' because React Fast Refresh / dev tooling requires it.
 *
 * Trade-off: server components that read the nonce (JsonLd, root layout)
 * become dynamically rendered. This is the standard cost of nonce-based CSP.
 */
export function buildCsp(nonce: string, isDev: boolean): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'unsafe-inline'",
    'https://va.vercel-scripts.com',
    'https://*.posthog.com',
    ...(isDev ? ["'unsafe-eval'"] : []),
  ].join(' ');

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://pub-e915c92ac05f48ccabfe327469bf4599.r2.dev",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://accounts.google.com https://*.googleapis.com https://va.vercel-scripts.com https://*.posthog.com",
    'worker-src blob: https://*.posthog.com',
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "media-src 'self' blob: https://pub-e915c92ac05f48ccabfe327469bf4599.r2.dev",
  ].join('; ');
}
