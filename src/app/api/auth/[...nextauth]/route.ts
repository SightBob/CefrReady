// NextAuth API route - re-exports from auth configuration
export { GET, POST } from '@/lib/auth';

// Force Node.js runtime (required for NextAuth crypto)
export const runtime = "nodejs";