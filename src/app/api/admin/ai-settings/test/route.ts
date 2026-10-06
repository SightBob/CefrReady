import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { checkUserRateLimit } from '@/lib/api-security';
import { tapAiSettingsSchema } from '@/lib/tap-ai';
import { evaluateTapReason, TapAiError } from '@/lib/openrouter';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const { error, session } = await requireAdmin();
  if (error) return error;
  const limited = await checkUserRateLimit(session!.user.id, { keySuffix: 'admin-tap-ai-test', maxRequests: 3 });
  if (limited) return limited;
  const parsed = tapAiSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !parsed.data.model) {
    return NextResponse.json({ success: false, error: 'กรุณาระบุโมเดลและการตั้งค่าที่ถูกต้อง' }, { status: 400 });
  }
  try {
    const ai = await evaluateTapReason(parsed.data, {
      title: 'Subject–verb agreement',
      item: { prompt: 'She ___ to school every day.', choiceA: 'go', choiceB: 'goes', correct: 1 },
      selectedAnswer: 'B',
      reason: 'She เป็นประธานเอกพจน์บุรุษที่สาม ใน present simple จึงใช้ goes',
      explanation: 'Third-person singular subjects take -s/-es in the present simple.',
    });
    return NextResponse.json({ success: true, data: ai });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof TapAiError ? error.message : 'ทดสอบ AI ไม่สำเร็จ' }, {
      status: error instanceof TapAiError ? error.status : 502,
    });
  }
}
