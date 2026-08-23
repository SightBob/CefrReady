import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { isMaintenanceMode, setMaintenanceMode } from '@/lib/maintenance';

/**
 * Admin-only maintenance mode toggle.
 *
 * GET  → { enabled: boolean }
 * POST → body { enabled: boolean }, flips the Redis flag instantly
 *        (no redeploy needed). Propagates to all proxy instances within
 *        MAINTENANCE_CACHE_TTL (15s).
 */

const bodySchema = z.object({ enabled: z.boolean() });

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    return NextResponse.json({ enabled: await isMaintenanceMode() });
  } catch (error) {
    console.error('[api/admin/maintenance] GET failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to read maintenance state' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'enabled must be a boolean' },
        { status: 400 }
      );
    }

    await setMaintenanceMode(parsed.data.enabled);
    return NextResponse.json({ success: true, enabled: parsed.data.enabled });
  } catch (error) {
    console.error('[api/admin/maintenance] POST failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to update maintenance mode' }, { status: 500 });
  }
}
