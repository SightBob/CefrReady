import { NextResponse } from 'next/server';

import { withAdmin } from '@/lib/admin-route';
import { fetchOpenRouterModels, sortModelsForAdmin } from '@/lib/ai-tutor/models';
import { maxModelPriceInPerMtok, maxModelPriceOutPerMtok } from '@/lib/ai-tutor/limits';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/ai-tutor/models — รายชื่อโมเดลจาก OpenRouter (แคช 15 นาที)
 * พร้อมราคาและข้อมูล reasoning (บังคับไหม / effort ที่รองรับ) + ป้ายโมเดลที่เกินเพดานราคา
 */
export async function GET() {
  const { error } = await withAdmin({ keySuffix: 'admin:ai-tutor-models', maxRequests: 30 });
  if (error) return error;

  const models = await fetchOpenRouterModels();
  if (models.length === 0) {
    return NextResponse.json(
      { success: false, error: 'ดึงรายชื่อโมเดลจาก OpenRouter ไม่สำเร็จ (ตรวจ OPENROUTER_API_KEY)' },
      { status: 503 },
    );
  }

  return NextResponse.json({
    success: true,
    limits: {
      maxModelPriceInPerMtok: maxModelPriceInPerMtok(),
      maxModelPriceOutPerMtok: maxModelPriceOutPerMtok(),
    },
    data: sortModelsForAdmin(models).map((model) => ({
      id: model.id,
      name: model.name,
      pricing: model.pricing,
      reasoningMandatory: model.reasoningMandatory,
      supportedEfforts: model.supportedEfforts,
      contextLength: model.contextLength,
      overPriceLimit: model.overPriceLimit,
    })),
  });
}
