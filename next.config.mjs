import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Dev tunnel origin (e.g. ngrok) comes from env so the domain is never
  // hardcoded in the repo — ngrok free domains are recycled and a stale
  // committed domain could end up trusted by someone else's tunnel (L8).
  // Set NGROK_ORIGIN in .env.local / .env — bare host, no protocol
  // (allowedDevOrigins matches hosts; a https:// prefix silently breaks it).
  ...(process.env.NGROK_ORIGIN
    ? { allowedDevOrigins: [process.env.NGROK_ORIGIN.replace(/^https?:\/\//, '')] }
    : {}),
  experimental: {
    optimizePackageImports: ['lucide-react', '@phosphor-icons/react'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
  async headers() {
    return [
      {
        // Non-CSP security headers for everything. The page CSP is issued
        // per-request with a nonce by src/proxy.ts (report M1) — setting it
        // here too would produce two CSP headers and break nonce handling.
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
      {
        // API routes are not covered by the proxy matcher — give them a
        // restrictive static CSP (they never render HTML).
        source: '/api/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'none'; frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};

const sentryOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  tunnelRoute: '/sentry-tunnel',
  webpack: {
    autoInstrumentServerFunctions: false,
    autoInstrumentMiddleware: false,
  },
};

// Bundle analyzer (ANALYZE=true to generate report at .next/analyze)
const withBundleAnalyzer = (await import('@next/bundle-analyzer')).default({
  enabled: process.env.ANALYZE === 'true',
  analyzerMode: 'static',
  reportFilename: '.next/analyze/[name].html',
  openAnalyzer: false,
});

// Only wrap with Sentry config when DSN is provided
const finalConfig = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryOptions)
  : nextConfig;

export default withBundleAnalyzer(finalConfig);
