import { NextResponse } from 'next/server';

import { isAdminRequest } from '@/lib/admin-auth';
import {
  AI_TUTOR_MAX_FIRST_TOKEN_TIMEOUT_MS,
  AI_TUTOR_MAX_TIMEOUT_MS,
  AI_TUTOR_MAX_TIMEOUT_S,
  AI_TUTOR_ROUTE_MAX_DURATION_S,
  AI_TUTOR_ROUTE_SLACK_S,
  AI_TUTOR_TIMEOUT_LIMIT_NOTE,
} from '@/lib/ai-tutor/limits';
import { aiTutorMaxTokens, aiTutorModel, aiTutorReasoningEffort } from '@/lib/ai-tutor/provider';
import { aiTutorFallbackModel } from '@/lib/ai-tutor/provider';
import { questionQuotaLimit, systemDailyLimit, userDailyLimit } from '@/lib/ai-tutor/quota';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/ai-tutor/config — ค่าตั้งของ AI Tutor ที่ใช้อยู่จริง
 * (ผู้ดูแลเท่านั้น) พร้อมเพดานเวลาและคำอธิบายว่าจะเพิ่มเพดานได้อย่างไร
 */
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    model: {
      primary: aiTutorModel(),
      fallback: aiTutorFallbackModel(),
      reasoningEffortPrimary: aiTutorReasoningEffort('primary'),
      reasoningEffortFallback: aiTutorReasoningEffort('fallback'),
      maxTokens: aiTutorMaxTokens(),
    },
    quota: {
      perQuestionPerDay: questionQuotaLimit(),
      perUserPerDay: userDailyLimit(),
      systemPerDay: systemDailyLimit(),
    },
    timeouts: {
      /** เพดานจริงของ route (อ่านตอน build) */
      routeMaxDurationSeconds: AI_TUTOR_ROUTE_MAX_DURATION_S,
      /** เวลาเผื่อสำหรับงานหลังโมเดล */
      slackSeconds: AI_TUTOR_ROUTE_SLACK_S,
      /** เพดาน timeout ต่อ 1 ครั้งเรียก (หลักหรือสำรอง) = floor((maxDuration - slack) / 2) */
      maxTimeoutSeconds: AI_TUTOR_MAX_TIMEOUT_S,
      maxTimeoutMs: AI_TUTOR_MAX_TIMEOUT_MS,
      maxFirstTokenTimeoutMs: AI_TUTOR_MAX_FIRST_TOKEN_TIMEOUT_MS,
      note: AI_TUTOR_TIMEOUT_LIMIT_NOTE,
    },
  });
}
