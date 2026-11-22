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
  // PostHog API paths end with a slash (e.g. `/e/`), so without this setting
  // Next would reply with a 308 before the rewrite below ever forwards the
  // request. Required by the reverse-proxy setup.
  skipTrailingSlashRedirect: true,
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
  async rewrites() {
    // Reverse proxy for PostHog (ingest). Requests travel to our own origin,
    // so ad blockers and Brave Shields no longer drop analytics traffic
    // (`us.i.posthog.com` was blocked as a third-party tracker). src/proxy.ts
    // excludes /ingest from the auth/maintenance gate; src/lib/posthog.tsx
    // points the SDK at this path. Static + array rules must precede the
    // catch-all; assets live on the *-assets host.
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/array/:path*',
        destination: 'https://us-assets.i.posthog.com/array/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
  },
  async redirects() {
    return [
      // /guide ถูกลบออกจากเว็บ (ไม่มีคู่มือให้แสดง) — ลิงก์เก่า/บุ๊กมาร์กไปที่หน้าแรก
      { source: '/guide', destination: '/', permanent: true },
      { source: '/guide/:slug', destination: '/', permanent: true },
      // demo รายพาร์ทถูกลบ — เหลือชุดตัวอย่างแบบผสมทุกทักษะที่ /demo/intro
      { source: '/demo/focus-form', destination: '/demo/intro', permanent: true },
      { source: '/demo/focus-meaning', destination: '/demo/intro', permanent: true },
      { source: '/demo/form-meaning', destination: '/demo/intro', permanent: true },
      { source: '/demo/listening', destination: '/demo/intro', permanent: true },
    ];
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

// Bundle analyzer (ANALYZE=true to generate report at .next/analyze)
const withBundleAnalyzer = (await import('@next/bundle-analyzer')).default({
  enabled: process.env.ANALYZE === 'true',
  analyzerMode: 'static',
  reportFilename: '.next/analyze/[name].html',
  openAnalyzer: false,
});

export default withBundleAnalyzer(nextConfig);
