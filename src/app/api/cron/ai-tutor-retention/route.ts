import { timingSafeEqual } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import { warnWithSummary } from '@/lib/ai-tutor/errors';
import {
  applyRetention,
  countRetentionTargets,
  parseRetentionArgs,
  retentionCutoff,
} from '@/lib/ai-tutor/retention';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/** นับ/ลบเป็นชุดเดียว — ไม่ควรใช้เวลาเกิน 60 วิ */
export const maxDuration = 60;

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** อ่าน flag จาก env: 1 / true / yes = เปิด */
function envFlag(raw: string | undefined): boolean {
  const value = (raw ?? '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

/** เทียบ token แบบ timing-safe (ความยาวไม่เท่า = ไม่ผ่านทันที) */
function bearerMatches(header: string | null, secret: string): boolean {
  const prefix = 'Bearer ';
  if (!header || !header.startsWith(prefix)) return false;
  const token = Buffer.from(header.slice(prefix.length));
  const expected = Buffer.from(secret);
  if (token.length !== expected.length) return false;
  return timingSafeEqual(token, expected);
}

/**
 * GET /api/cron/ai-tutor-retention — ล้างข้อมูล AI Tutor เก่าตามนโยบาย retention
 *
 * เรียกโดย Vercel Cron (vercel.json) — Vercel แนบ `Authorization: Bearer $CRON_SECRET` ให้เอง
 *
 * ความปลอดภัย (หลักการเดียวกับ scripts/ai-tutor-retention.ts):
 * - ไม่มี CRON_SECRET → 503 ปฏิเสธ (ไม่ยอมรันแบบไม่มีสิทธิ์)
 * - token ไม่ตรง → 401 (ไม่แตะ DB)
 * - **ค่าเริ่มต้น = dry-run**: นับแถวที่เก่ากว่า cutoff แล้วรายงาน ไม่ลบอะไร
 *   ลบจริงต้องตั้ง `AI_TUTOR_RETENTION_APPLY=true` ใน environment ของ deployment
 *   (และ `AI_TUTOR_RETENTION_BLANK=true` ถ้าอยากเว้นว่าง content แทนการลบแถว)
 * - จำนวนวันอ่านจาก `AI_TUTOR_RETENTION_DAYS` (ค่าเริ่มต้น 180 · ขั้นต่ำ 30)
 *   ค่าผิด → 500 และไม่รัน (ไม่ fallback เงียบ ๆ)
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      {
        success: false,
        error: 'ยังไม่ได้ตั้ง CRON_SECRET — endpoint นี้จะไม่รันจนกว่าจะตั้ง secret ของ cron',
      },
      { status: 503, headers: NO_STORE },
    );
  }

  if (!bearerMatches(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  }

  const parsed = parseRetentionArgs([], process.env);
  if (!parsed.ok) {
    return NextResponse.json(
      { success: false, error: `${parsed.error} — ยังไม่ได้ลบอะไร` },
      { status: 500, headers: NO_STORE },
    );
  }

  const { days } = parsed;
  const apply = envFlag(process.env.AI_TUTOR_RETENTION_APPLY);
  const blank = apply && envFlag(process.env.AI_TUTOR_RETENTION_BLANK);
  const cutoff = retentionCutoff(days);

  try {
    const result = apply ? await applyRetention(cutoff, blank) : await countRetentionTargets(cutoff);

    return NextResponse.json(
      {
        success: true,
        data: {
          days,
          cutoff: cutoff.toISOString(),
          mode: apply ? (blank ? 'blank' : 'delete') : 'dry-run',
          messages: result.messages,
          feedback: result.feedback,
          ranAt: new Date().toISOString(),
        },
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    // DB ล่ม/ตารางยังไม่มี → ไม่เผยรายละเอียดภายใน, แจ้งว่ายังไม่ได้ทำอะไร
    warnWithSummary('ai-tutor cron retention', error);
    return NextResponse.json(
      {
        success: false,
        error: 'ล้างข้อมูล AI Tutor ไม่สำเร็จ (ฐานข้อมูลไม่พร้อม) — ยังไม่ได้ลบอะไร',
      },
      { status: 503, headers: NO_STORE },
    );
  }
}
