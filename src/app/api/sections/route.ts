import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { fetchSectionsFromDb } from '@/lib/sections';
import { checkIpThrottle } from '@/lib/api-security';

// IP throttling reads request headers, so this route is always dynamic;
// response caching happens inside unstable_cache below.
export const dynamic = 'force-dynamic';

const getCachedSections = unstable_cache(
  async () => fetchSectionsFromDb(),
  ['sections-with-sets'],
  { revalidate: 300, tags: ['sections'] }
);

/**
 * GET /api/sections
 * Public endpoint: returns all active sections with their active test sets.
 * Used by the Student /tests page to show Section cards + set counts.
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: throttle public endpoint (report M3).
    const ipThrottleError = await checkIpThrottle(request, { keySuffix: 'sections' });
    if (ipThrottleError) return ipThrottleError;

    const result = await getCachedSections();
    return NextResponse.json({ success: true, sections: result });
  } catch (err) {
    console.error('[api/sections] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch sections' }, { status: 500 });
  }
}
