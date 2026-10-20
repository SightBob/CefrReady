import { NextRequest, NextResponse } from 'next/server';

import { withAdmin } from '@/lib/admin-route';
import {
  AI_TUTOR_MAX_FIRST_TOKEN_TIMEOUT_MS,
  AI_TUTOR_MAX_TIMEOUT_MS,
  AI_TUTOR_MAX_TIMEOUT_S,
  AI_TUTOR_ROUTE_MAX_DURATION_S,
  AI_TUTOR_ROUTE_SLACK_S,
  AI_TUTOR_TIMEOUT_LIMIT_NOTE,
} from '@/lib/ai-tutor/limits';
import {
  getAiTutorConfigWithSources,
  getAiTutorEnvStatus,
  saveAiTutorSettings,
} from '@/lib/ai-tutor/config';
import {
  maxModelPriceInPerMtok,
  maxModelPriceOutPerMtok,
} from '@/lib/ai-tutor/limits';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/ai-tutor/config — ค่าที่ใช้งานจริง + ที่มาของแต่ละค่า (db/env)
 * PUT /api/admin/ai-tutor/config — บันทึกค่า (validate + เขียน audit + ล้างแคช)
 */
export async function GET() {
  const { error } = await withAdmin({ keySuffix: 'admin:ai-tutor', maxRequests: 60 });
  if (error) return error;

  const { config, sources, envDefaults, warnings } = await getAiTutorConfigWithSources();
  return NextResponse.json({
    success: true,
    data: {
      config,
      sources,
      envDefaults,
      warnings,
      /** สถานะ secret ใน env — บูลีนเท่านั้น ไม่มีค่าจริงหลุดออกไป */
      envStatus: getAiTutorEnvStatus(),
      limits: {
        routeMaxDurationSeconds: AI_TUTOR_ROUTE_MAX_DURATION_S,
        slackSeconds: AI_TUTOR_ROUTE_SLACK_S,
        maxTimeoutSeconds: AI_TUTOR_MAX_TIMEOUT_S,
        maxTimeoutMs: AI_TUTOR_MAX_TIMEOUT_MS,
        maxFirstTokenTimeoutMs: AI_TUTOR_MAX_FIRST_TOKEN_TIMEOUT_MS,
        note: AI_TUTOR_TIMEOUT_LIMIT_NOTE,
        maxModelPriceInPerMtok: maxModelPriceInPerMtok(),
        maxModelPriceOutPerMtok: maxModelPriceOutPerMtok(),
      },
    },
  });
}

export async function PUT(request: NextRequest) {
  const { error, session } = await withAdmin({ keySuffix: 'admin:ai-tutor', maxRequests: 30 });
  if (error) return error;

  const body = await request.json().catch(() => null);
  const result = await saveAiTutorSettings(body, session?.user?.id ?? 'unknown');
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  const { config, sources, warnings } = await getAiTutorConfigWithSources();
  return NextResponse.json({
    success: true,
    saved: result.saved,
    warnings: [...warnings, ...result.warnings],
    data: { config, sources },
  });
}
