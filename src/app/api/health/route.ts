import { NextRequest, NextResponse } from 'next/server';
import { checkIpThrottle } from '@/lib/api-security';

export async function GET(request: NextRequest) {
  // SECURITY: throttle health checks (report M3). Generous budget so uptime
  // monitors are not blocked.
  const ipThrottleError = await checkIpThrottle(request, {
    keySuffix: 'health',
    maxRequests: 120,
  });
  if (ipThrottleError) return ipThrottleError;

  return NextResponse.json({ status: 'ok', message: 'Backend is running!' });
}
