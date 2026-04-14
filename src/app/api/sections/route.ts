import { NextResponse } from 'next/server';
import { fetchSectionsFromDb } from '@/lib/sections';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sections
 * Public endpoint: returns all active sections with their active test sets.
 * Used by the Student /tests page to show Section cards + set counts.
 */
export async function GET() {
  try {
    const result = await fetchSectionsFromDb();
    return NextResponse.json({ success: true, sections: result });
  } catch (err) {
    console.error('[api/sections] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch sections' }, { status: 500 });
  }
}
