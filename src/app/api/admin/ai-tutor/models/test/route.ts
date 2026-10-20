import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withAdmin } from '@/lib/admin-route';
import { streamAiTutorReply } from '@/lib/ai-tutor/provider';
import { findModel } from '@/lib/ai-tutor/models';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const bodySchema = z.object({
  model: z.string().trim().min(3).max(200),
  effort: z.string().trim().max(20).optional(),
  message: z.string().trim().min(1).max(500).optional(),
}).strict();

/**
 * POST /api/admin/ai-tutor/models/test — ยิงโมเดล 1 ครั้งเพื่อทดสอบ
 *
 * - จำกัดอัตรา 10 ครั้ง/นาที/แอดมิน (ไม่หักโควตาผู้เรียน)
 * - ไม่เขียนลงฐานข้อมูล
 * - คืนสถานะ latency TTFT reasoning tokens และตัวอย่างคำตอบ
 */
export async function POST(request: NextRequest) {
  const { error } = await withAdmin({
    keySuffix: 'admin:ai-tutor-model-test',
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (error) return error;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'คำขอไม่ถูกต้อง' },
      { status: 400 },
    );
  }
  const { model, effort } = parsed.data;
  const message = parsed.data.message ?? 'ตอบว่า "ทดสอบสำเร็จ" สั้นๆ เป็นภาษาไทย';

  // เช็คว่ามีโมเดลจริง + effort ที่รองรับ (ถ้าดึงรายชื่อโมเดลไม่ได้ = ข้ามการตรวจ)
  const known = await findModel(model);
  if (known === undefined) {
    return NextResponse.json({ success: false, error: `ไม่พบโมเดล "${model}" ใน OpenRouter` }, { status: 400 });
  }
  const effortToUse = effort ?? 'low';
  if (known && !known.supportsEffort(effortToUse)) {
    return NextResponse.json(
      {
        success: false,
        error: `โมเดล "${model}" ไม่รองรับ reasoning effort "${effortToUse}" (รองรับ: ${known.supportedEfforts.join(', ') || 'ไม่ระบุ'})`,
      },
      { status: 400 },
    );
  }

  const started = Date.now();
  let text = '';
  try {
    const result = await streamAiTutorReply({
      messages: [
        { role: 'system', content: 'คุณเป็นผู้ช่วยทดสอบระบบ ตอบสั้นๆ เป็นภาษาไทย' },
        { role: 'user', content: message },
      ],
      onDelta: (delta) => { text += delta; },
    });
    return NextResponse.json({
      success: true,
      data: {
        model: result.usage.model,
        latencyMs: result.usage.latencyMs,
        ttftMs: result.ttftMs,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        reasoningTokens: result.usage.reasoningTokens,
        finishReason: result.finishReason,
        sample: result.text.slice(0, 500),
      },
    });
  } catch (providerError) {
    return NextResponse.json(
      {
        success: false,
        error: providerError instanceof Error ? providerError.message : 'เรียกโมเดลไม่สำเร็จ',
        latencyMs: Date.now() - started,
      },
      { status: 502 },
    );
  }
}
