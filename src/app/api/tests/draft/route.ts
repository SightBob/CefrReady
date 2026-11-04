/**
 * /api/tests/draft — ความคืบหน้าของชุดข้อสอบที่ยังไม่ส่ง (เก็บในฐานข้อมูล)
 *
 * GET    ?sectionId=&setId=   → draft ที่ค้างอยู่ (หรือ null)
 * PUT    body { sectionId, setId, index, answers, checked, choiceSeed }
 * DELETE ?sectionId=&setId=   → ปิดรอบที่ค้าง (ผู้เรียนเริ่มใหม่/ยกเลิก)
 *
 * ทุก endpoint ต้องล็อกอิน · ตรวจ Origin · จำกัดอัตราเรียกต่อผู้ใช้
 * (client ยิงทุก ~2 วินาทีขณะทำข้อสอบ จึงตั้งเพดานสูงพอแต่ยังกันการยิงรัว)
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth-utils';
import { checkIpThrottle, checkUserRateLimit, validateOrigin } from '@/lib/api-security';
import { clearDraft, readDraft, sanitizeDraft, writeDraft } from '@/lib/test-draft';

export const dynamic = 'force-dynamic';

const sectionSchema = z.string().regex(/^[a-z0-9-]{1,50}$/);
const setIdSchema = z.union([
  z.string().regex(/^[1-9]\d*$/).transform(Number),
  z.number().int().positive(),
]);

const putBodySchema = z.object({
  sectionId: sectionSchema,
  setId: setIdSchema,
  index: z.number().int().min(0).max(10_000),
  answers: z.array(z.string().max(20_000).nullable()).max(1000).default([]),
  checked: z.record(z.string(), z.unknown()).default({}),
  choiceSeed: z.string().max(200).nullable().default(null),
});

function parseScope(searchParams: URLSearchParams) {
  const sectionId = sectionSchema.safeParse(searchParams.get('sectionId') ?? '');
  const setId = setIdSchema.safeParse(searchParams.get('setId') ?? '');
  if (!sectionId.success || !setId.success) return null;
  return { sectionId: sectionId.data, setId: setId.data };
}

export async function GET(request: NextRequest) {
  const ipThrottleError = await checkIpThrottle(request, { keySuffix: 'tests-draft-get' });
  if (ipThrottleError) return ipThrottleError;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const scope = parseScope(request.nextUrl.searchParams);
  if (!scope) return NextResponse.json({ success: false, error: 'Invalid scope' }, { status: 400 });

  const draft = await readDraft({ userId: user.id, sectionId: scope.sectionId, setId: scope.setId });
  return NextResponse.json(
    { success: true, data: draft },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export async function PUT(request: NextRequest) {
  const originError = validateOrigin(request);
  if (originError) return originError;

  const ipThrottleError = await checkIpThrottle(request, { keySuffix: 'tests-draft-put' });
  if (ipThrottleError) return ipThrottleError;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  // ระหว่างสอบ client sync เป็นจังหวะ — 120 ครั้ง/นาทีต่อผู้ใช้ (≈ ทุก 0.5 วิ)
  const rateLimitError = await checkUserRateLimit(user.id, {
    windowMs: 60_000,
    maxRequests: 120,
    keySuffix: 'draft',
  });
  if (rateLimitError) return rateLimitError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = putBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const draft = sanitizeDraft(parsed.data);
  if (!draft) return NextResponse.json({ success: false, error: 'Invalid draft' }, { status: 400 });

  const saved = await writeDraft(
    { userId: user.id, sectionId: parsed.data.sectionId, setId: parsed.data.setId },
    draft,
  );
  if (!saved) return NextResponse.json({ success: false, error: 'Failed to save draft' }, { status: 500 });

  return NextResponse.json({ success: true, data: { index: draft.index } });
}

export async function DELETE(request: NextRequest) {
  const originError = validateOrigin(request);
  if (originError) return originError;

  const ipThrottleError = await checkIpThrottle(request, { keySuffix: 'tests-draft-delete' });
  if (ipThrottleError) return ipThrottleError;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const scope = parseScope(request.nextUrl.searchParams);
  if (!scope) return NextResponse.json({ success: false, error: 'Invalid scope' }, { status: 400 });

  await clearDraft({ userId: user.id, sectionId: scope.sectionId, setId: scope.setId });
  return NextResponse.json({ success: true });
}
